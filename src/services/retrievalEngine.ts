import { ContextualChunk, ProductRevision } from '../types/spec';

const STOP_WORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'to', 'for', 'of', 'in',
  'with', 'by', 'from', 'are', 'any', 'these', 'what', 'between', 'how', 'does',
  'can', 'be', 'or', 'as', 'it', 'that', 'this',
]);

// Domain synonym expansion for dense-like semantic overlap scoring
const SEMANTIC_SYNONYM_CLUSTERS: Record<string, string[]> = {
  derating: ['derate', 'derated', 'thermal', 'ambient', 'temperature', 'load', '50°c', '60°c', '70°c', 'slope', 'linearly'],
  thermal: ['derating', 'derate', 'temperature', 'ambient', 'cooling', 'convection', '50°c', '60°c', '70°c'],
  clearance: ['clearances', 'ventilation', 'mounting', '40mm', '20mm', '5mm', 'top/bottom', 'left/right', 'adjacent'],
  ventilation: ['clearance', 'clearances', 'convection', '40mm', '20mm', 'cooling', 'mounting'],
  semi: ['f47', 'f47-0706', 'sag', 'immunity', 'semiconductor', 'voltage'],
  sag: ['semi', 'f47', 'f47-0706', 'immunity', '200ms', '500ms', '1000ms'],
  efficiency: ['efficient', 'pfc', '91%', '85%', '86%', '84%', 'loss', 'topology'],
  ripple: ['noise', 'mvp-p', 'bandwidth', '20mhz'],
  width: ['slim', '40mm', '55.5mm', '32mm', 'dimensions', 'chassis'],
};

export function tokenizeText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s°%.-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^[.-]+|[.-]+$/g, ''))
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}

export function buildContextualCorpusChunks(
  corpus: ProductRevision[]
): ContextualChunk[] {
  const approvedRevisions = corpus.filter((r) => r.status === 'APPROVED');
  const chunks: ContextualChunk[] = [];

  for (const rev of approvedRevisions) {
    for (const page of rev.pages) {
      const contextualHeader = `Model: ${rev.modelCode} | Rev: ${rev.revision} | Section: ${page.sectionTitle} | Page: ${page.pageNumber}`;
      const tableSummary = page.extractedTableRows
        .map((r) => `${r.parameter} (${r.condition}): ${r.value} ${r.unit}`.trim())
        .join(' ; ');
      const rawText = `${page.content}\nStructured Table Specs: ${tableSummary}`;
      const fullContextualText = `${contextualHeader}\n${rawText}`;

      chunks.push({
        chunkId: `${rev.id}-p${page.pageNumber}`,
        revisionId: rev.id,
        modelCode: rev.modelCode,
        revision: rev.revision,
        sectionTitle: page.sectionTitle,
        pageNumber: page.pageNumber,
        contextualHeader,
        rawText,
        fullContextualText,
        bm25Score: 0,
        semanticScore: 0,
        bm25Rank: 0,
        semanticRank: 0,
        rrfScore: 0,
        matchedTerms: [],
      });
    }
  }

  return chunks;
}

export function retrieveTopChunksRRF(
  corpus: ProductRevision[],
  query: string,
  topK = 4
): ContextualChunk[] {
  const baseChunks = buildContextualCorpusChunks(corpus);
  if (baseChunks.length === 0 || !query.trim()) {
    return [];
  }

  const queryTokens = tokenizeText(query);
  if (queryTokens.length === 0) {
    return baseChunks.slice(0, topK);
  }

  // Expand query tokens with domain semantic synonyms for the dense vector lane simulation
  const expandedSemanticTokens = new Set<string>(queryTokens);
  for (const qt of queryTokens) {
    for (const [key, cluster] of Object.entries(SEMANTIC_SYNONYM_CLUSTERS)) {
      if (qt.includes(key) || key.includes(qt)) {
        cluster.forEach((syn) => expandedSemanticTokens.add(syn));
      }
    }
  }

  // Tokenize all documents for BM25 calculation
  const docTokenLists = baseChunks.map((c) => tokenizeText(c.fullContextualText));
  const avgDocLen =
    docTokenLists.reduce((acc, list) => acc + list.length, 0) /
    Math.max(1, docTokenLists.length);
  const N = baseChunks.length;
  const k1 = 1.5;
  const b = 0.75;

  // Document frequency per token
  const docFreq: Record<string, number> = {};
  for (const qt of expandedSemanticTokens) {
    docFreq[qt] = docTokenLists.filter((tokens) =>
      tokens.some((t) => t === qt || (qt.length >= 4 && t.includes(qt)))
    ).length;
  }

  // Compute BM25 lexical score and Semantic overlap score per chunk
  const scoredChunks = baseChunks.map((chunk, idx) => {
    const docTokens = docTokenLists[idx];
    const docLen = docTokens.length;
    const matchedTermsSet = new Set<string>();

    let bm25 = 0;
    for (const qt of queryTokens) {
      const tf = docTokens.filter(
        (t) => t === qt || (qt.length >= 4 && t.includes(qt))
      ).length;
      if (tf > 0) {
        matchedTermsSet.add(qt);
        const df = docFreq[qt] || 1;
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
        const numerator = tf * (k1 + 1);
        const denominator = tf + k1 * (1 - b + b * (docLen / avgDocLen));
        bm25 += idf * (numerator / denominator);
      }
    }

    // Boost exact model code mention or voltage mention in contextual header
    const lowerHeader = chunk.contextualHeader.toLowerCase();
    for (const qt of queryTokens) {
      if (lowerHeader.includes(qt) && qt.length >= 3) {
        bm25 += 1.25;
      }
    }

    // Semantic score: cosine-like weighted overlap across expanded domain concepts
    let semanticHits = 0;
    for (const st of expandedSemanticTokens) {
      if (
        docTokens.some((t) => t === st || (st.length >= 4 && t.includes(st)))
      ) {
        semanticHits += queryTokens.includes(st) ? 1.5 : 0.75;
      }
    }
    const semanticScore =
      semanticHits /
      Math.sqrt(Math.max(1, expandedSemanticTokens.size) * Math.max(1, docLen / 40));

    return {
      ...chunk,
      bm25Score: +bm25.toFixed(4),
      semanticScore: +semanticScore.toFixed(4),
      matchedTerms: Array.from(matchedTermsSet),
    };
  });

  // Sort for BM25 rank
  const byBm25 = [...scoredChunks].sort((a, b) => b.bm25Score - a.bm25Score);
  const bm25RankMap = new Map<string, number>();
  byBm25.forEach((c, i) => bm25RankMap.set(c.chunkId, i + 1));

  // Sort for Semantic rank
  const bySemantic = [...scoredChunks].sort(
    (a, b) => b.semanticScore - a.semanticScore
  );
  const semanticRankMap = new Map<string, number>();
  bySemantic.forEach((c, i) => semanticRankMap.set(c.chunkId, i + 1));

  // Fuse via Reciprocal Rank Fusion: RRF = 1 / (60 + rank_bm25) + 1 / (60 + rank_semantic)
  const fused = scoredChunks.map((c) => {
    const bm25Rank = bm25RankMap.get(c.chunkId) ?? N;
    const semanticRank = semanticRankMap.get(c.chunkId) ?? N;
    const rrfScore = 1 / (60 + bm25Rank) + 1 / (60 + semanticRank);
    return {
      ...c,
      bm25Rank,
      semanticRank,
      rrfScore: +rrfScore.toFixed(5),
    };
  });

  fused.sort((a, b) => {
    if (b.bm25Score === 0 && a.bm25Score > 0) return -1;
    if (a.bm25Score === 0 && b.bm25Score > 0) return 1;
    if (Math.abs(b.rrfScore - a.rrfScore) > 0.00001) {
      return b.rrfScore - a.rrfScore;
    }
    return b.bm25Score - a.bm25Score;
  });

  return fused.slice(0, topK);
}
