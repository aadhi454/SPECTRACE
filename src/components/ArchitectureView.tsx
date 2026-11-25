import React from 'react';
import {
  Cpu,
  Database,
  FileSearch,
  GitBranch,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { ProductRevision, SpecFilterConstraints } from '../types/spec';
import { buildDeterministicSqlPreview } from '../services/filterEngine';
import { buildContextualCorpusChunks } from '../services/retrievalEngine';

interface ArchitectureViewProps {
  corpus: ProductRevision[];
  constraints: SpecFilterConstraints;
}

export const ArchitectureView: React.FC<ArchitectureViewProps> = ({
  corpus,
  constraints,
}) => {
  const contextualChunks = buildContextualCorpusChunks(corpus);
  const sqlString = buildDeterministicSqlPreview(constraints);

  return (
    <div className="max-w-7xl mx-auto py-8 px-6 space-y-6">
      {/* Architecture Overview Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-2">
        <div className="flex items-center gap-2.5">
          <Cpu className="w-5 h-5 text-blue-600" />
          <h1 className="text-lg font-semibold text-slate-900">
            SpecTrace Two-Lane System Architecture: Parse-Once,
            Filter-Deterministically, Verify-by-Citation
          </h1>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          Industrial component selection cannot rely on probabilistic LLM
          filtering over raw PDFs due to silent numeric drift on thermal
          derating slopes and voltage bounds. SpecTrace enforces a strict
          architectural separation between deterministic relational eligibility
          evaluation (Lane 1) and contextual hybrid BM25 + semantic Reciprocal
          Rank Fusion retrieval for page-cited prose verification (Lane 2).
        </p>
      </div>

      {/* 4-Stage Pipeline Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {[
          {
            icon: GitBranch,
            step: '01. Ingestion & Density Gatekeeper',
            title: 'Dual-Extractor PDF Pipeline',
            details: [
              'Rejects scanned image-only PDFs (< 50 chars/page) to eliminate OCR numeric corruption.',
              'Extracts document prose and specification table cells into structured fields.',
              'Stages new uploads in DRAFT until human engineer verification promotes to APPROVED and supersedes prior revisions.',
            ],
          },
          {
            icon: Database,
            step: '02. Lane 1: Deterministic Engine',
            title: 'Hard Parametric Bound Evaluator',
            details: [
              'Queries only status = APPROVED records in the product catalog.',
              'Evaluates exact electrical bounds (V, W, AC input range, width, certifications).',
              'Computes boundary thermal derating advisories when targetAmbientTempC > fullLoadMaxTempC.',
            ],
          },
          {
            icon: FileSearch,
            step: '03. Lane 2: Contextual Hybrid RRF',
            title: 'Header-Injected Chunk Retrieval',
            details: [
              'Prepends "Model | Rev | Section | Page" header to every approved chunk prior to indexing.',
              'Fuses lexical BM25 rank and semantic token-overlap rank via RRF = 1 / (60 + rank).',
              'Enforces strict INSUFFICIENT_EVIDENCE refusal when queries ask for unsupported certs or pricing.',
            ],
          },
          {
            icon: ShieldCheck,
            step: '04. Human Suitability Sign-Off',
            title: '4-Point Engineering Audit Dossier',
            details: [
              'Locks sign-off until derating, clearances, safety approvals, and revision lineage are confirmed.',
              'Binds exact [MODEL | Rev | Page X] citations into an immutable audit record.',
              'Exports machine-readable JSON and print-ready HTML/PDF engineering briefs.',
            ],
          },
        ].map((card, idx) => {
          const IconComponent = card.icon;
          return (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-blue-600">
                  {card.step}
                </span>
                <IconComponent className="w-4 h-4 text-blue-600" />
              </div>
              <h2 className="text-sm font-semibold text-slate-900">
                {card.title}
              </h2>
              <ul className="space-y-1.5 text-xs text-slate-600">
                {card.details.map((line, lIdx) => (
                  <li key={lIdx} className="leading-relaxed">
                    • {line}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Live SQL Schema & RRF Index Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SQL DDL & Live Parameterized Query */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <span className="text-sm font-semibold text-slate-900">
              Lane 1 Inspector: Relational Schema &amp; Active Predicate
            </span>
            <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Zero-Hallucination Numeric Bounds
            </span>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-600">
              Relational Table Schema (product_revisions)
            </div>
            <pre className="p-4 bg-slate-50 border border-slate-200/80 rounded-lg text-xs font-mono tabular-nums text-slate-800 overflow-x-auto leading-relaxed">
{`CREATE TABLE product_revisions (
  id TEXT PRIMARY KEY,
  model_code TEXT NOT NULL,
  revision TEXT NOT NULL,
  status TEXT CHECK (status IN ('APPROVED', 'DRAFT', 'SUPERSEDED')),
  output_voltage_v NUMERIC(6,2) NOT NULL,
  output_power_w NUMERIC(6,2) NOT NULL,
  input_voltage_min_v NUMERIC(6,2) NOT NULL,
  input_voltage_max_v NUMERIC(6,2) NOT NULL,
  efficiency_pct NUMERIC(5,2) NOT NULL,
  operating_temp_min_c NUMERIC(5,2) NOT NULL,
  operating_temp_max_c NUMERIC(5,2) NOT NULL,
  full_load_max_temp_c NUMERIC(5,2) NOT NULL,
  width_mm NUMERIC(5,2) NOT NULL,
  certifications TEXT[] NOT NULL,
  CONSTRAINT valid_input_bounds CHECK (input_voltage_min_v < input_voltage_max_v),
  CONSTRAINT valid_thermal_ceiling CHECK (full_load_max_temp_c <= operating_temp_max_c)
);`}
            </pre>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-600">
              Live Generated SQL Query for Current Filter State
            </div>
            <pre className="p-4 bg-blue-50/50 border border-blue-200 rounded-lg text-xs font-mono tabular-nums text-blue-900 overflow-x-auto leading-relaxed">
              {sqlString}
            </pre>
          </div>
        </div>

        {/* Contextual Chunk Index Inspector */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <span className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              Lane 2 Inspector: Contextual Chunk Index (
              {contextualChunks.length} Active Approved Chunks)
            </span>
            <span className="px-2.5 py-0.5 text-xs font-mono rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              RRF = 1/(60 + rank_bm25) + 1/(60 + rank_vec)
            </span>
          </div>

          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {contextualChunks.map((chunk) => (
              <div
                key={chunk.chunkId}
                className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-lg space-y-1.5"
              >
                <div className="text-xs font-mono tabular-nums text-blue-700 font-semibold">
                  {chunk.contextualHeader}
                </div>
                <div className="text-xs text-slate-600 leading-relaxed">
                  {chunk.rawText}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
