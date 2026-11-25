export type RevisionStatus = 'APPROVED' | 'DRAFT' | 'SUPERSEDED';

export interface ExtractedTableRow {
  parameter: string;
  condition: string;
  value: string;
  unit: string;
}

export interface DatasheetPage {
  pageNumber: number;
  sectionTitle: string;
  content: string;
  extractedTableRows: ExtractedTableRow[];
}

export interface ProductSpecs {
  outputVoltageV: number;
  outputCurrentA: number;
  outputPowerW: number;
  inputVoltageMinV: number;
  inputVoltageMaxV: number;
  efficiencyPct: number;
  operatingTempMinC: number;
  operatingTempMaxC: number;
  fullLoadMaxTempC: number;
  widthMm: number;
  certifications: string[];
  deratingSummary: string;
  deratingPage: number;
}

export interface ProductRevision {
  id: string;
  modelCode: string;
  manufacturer: string;
  series: string;
  revision: string;
  effectiveDate: string;
  status: RevisionStatus;
  sourceFilename: string;
  parserPipeline: string;
  specs: ProductSpecs;
  pages: DatasheetPage[];
  approvedBy?: string;
  approvedAt?: string;
}

export interface SpecFilterConstraints {
  outputVoltageV: number | null;
  minOutputPowerW: number | null;
  requiredInputVoltageV: number | null;
  targetAmbientTempC: number | null;
  minEfficiencyPct: number | null;
  maxWidthMm: number | null;
  requiredCertifications: string[];
}

export interface ConstraintDiagnostic {
  field: string;
  label: string;
  expected: string;
  actual: string;
  passed: boolean;
  warningNote?: string;
}

export interface EligibilityEvaluation {
  revision: ProductRevision;
  isEligible: boolean;
  diagnostics: ConstraintDiagnostic[];
  failedReasons: string[];
  advisoryWarnings: string[];
}

export interface SignOffChecklist {
  deratingVerified: boolean;
  clearanceVerified: boolean;
  certificationsVerified: boolean;
  revisionVerified: boolean;
}

export interface CitedPageRef {
  modelCode: string;
  revision: string;
  page: number;
}

export interface SignOffAuditRecord {
  id: string;
  timestamp: string;
  engineerName: string;
  projectReference: string;
  selectedRevisionId: string;
  modelCode: string;
  revision: string;
  constraintsSnapshot: SpecFilterConstraints;
  checklistConfirmed: SignOffChecklist;
  engineeringNotes: string;
  citedPages: CitedPageRef[];
}

export interface ContextualChunk {
  chunkId: string;
  revisionId: string;
  modelCode: string;
  revision: string;
  sectionTitle: string;
  pageNumber: number;
  contextualHeader: string;
  rawText: string;
  fullContextualText: string;
  bm25Score: number;
  semanticScore: number;
  bm25Rank: number;
  semanticRank: number;
  rrfScore: number;
  matchedTerms: string[];
}

export interface GroundedQAResult {
  query: string;
  answer: string;
  isRefusal: boolean;
  engineMode: 'GEMINI_GROUNDED' | 'DETERMINISTIC_EXTRACTIVE';
  latencyMs: number;
  topChunks: ContextualChunk[];
  citations: CitedPageRef[];
}
