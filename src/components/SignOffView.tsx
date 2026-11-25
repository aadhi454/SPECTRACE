import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileCode2,
  Printer,
  ShieldCheck,
} from 'lucide-react';
import {
  CitedPageRef,
  ProductRevision,
  SignOffAuditRecord,
  SignOffChecklist,
  SpecFilterConstraints,
} from '../types/spec';
import { evaluateRevisionEligibility } from '../services/filterEngine';
import {
  downloadJsonDossier,
  downloadPrintableHtmlBrief,
} from '../services/exportService';

interface SignOffViewProps {
  approvedRevisions: ProductRevision[];
  selectedRevisionId: string;
  constraints: SpecFilterConstraints;
  auditRecords: SignOffAuditRecord[];
  onSelectRevisionId: (id: string) => void;
  onSaveAuditRecord: (record: SignOffAuditRecord) => void;
  onJumpToCitation: (ref: CitedPageRef) => void;
}

export const SignOffView: React.FC<SignOffViewProps> = ({
  approvedRevisions,
  selectedRevisionId,
  constraints,
  auditRecords,
  onSelectRevisionId,
  onSaveAuditRecord,
  onJumpToCitation,
}) => {
  const activeRevision =
    approvedRevisions.find((r) => r.id === selectedRevisionId) ||
    approvedRevisions[0];

  const evaluation = evaluateRevisionEligibility(activeRevision, constraints);

  const [engineerName, setEngineerName] = useState<string>(
    'Marcus Vance, PE (Lead Panel Architect)'
  );
  const [projectReference, setProjectReference] = useState<string>(
    'PNL-2026-CELL04-24VDC'
  );
  const [engineeringNotes, setEngineeringNotes] = useState<string>(
    'Verified thermal derating envelope at cabinet operating temperature and confirmed minimum 40mm vertical / 20mm horizontal DIN-rail convection clearances.'
  );
  const [checklist, setChecklist] = useState<SignOffChecklist>({
    deratingVerified: false,
    clearanceVerified: false,
    certificationsVerified: false,
    revisionVerified: false,
  });
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  const allFourChecked =
    checklist.deratingVerified &&
    checklist.clearanceVerified &&
    checklist.certificationsVerified &&
    checklist.revisionVerified &&
    engineerName.trim().length > 0 &&
    projectReference.trim().length > 0;

  const buildCurrentRecord = (): SignOffAuditRecord => ({
    id: `AUDIT-${Date.now().toString().slice(-6)}`,
    timestamp: new Date().toISOString(),
    engineerName: engineerName.trim(),
    projectReference: projectReference.trim(),
    selectedRevisionId: activeRevision.id,
    modelCode: activeRevision.modelCode,
    revision: activeRevision.revision,
    constraintsSnapshot: { ...constraints },
    checklistConfirmed: { ...checklist },
    engineeringNotes: engineeringNotes.trim(),
    citedPages: [
      {
        modelCode: activeRevision.modelCode,
        revision: activeRevision.revision,
        page: 2,
      },
      {
        modelCode: activeRevision.modelCode,
        revision: activeRevision.revision,
        page: activeRevision.specs.deratingPage,
      },
      {
        modelCode: activeRevision.modelCode,
        revision: activeRevision.revision,
        page: 4,
      },
    ],
  });

  const handleRecordSignOff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allFourChecked) return;
    const record = buildCurrentRecord();
    onSaveAuditRecord(record);
    setSavedBanner(
      `Audit Dossier ${record.id} recorded for ${record.modelCode} (Rev ${record.revision}) on project ${record.projectReference}.`
    );
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Selected SKU Suitability & Automated Risk/Caveat Surface */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <h1 className="text-base font-semibold text-slate-900">
                Selected Component &amp; Requirement Verification
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="signoff-sku-select"
                className="text-sm font-medium text-slate-600"
              >
                Product:
              </label>
              <select
                id="signoff-sku-select"
                value={activeRevision.id}
                onChange={(e) => {
                  onSelectRevisionId(e.target.value);
                  setSavedBanner(null);
                }}
                className="bg-white text-slate-900 font-mono tabular-nums text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600"
              >
                {approvedRevisions.map((rev) => (
                  <option key={rev.id} value={rev.id}>
                    {rev.modelCode} (Rev {rev.revision})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Automated Risk & Caveat Surface */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                Thermal Derating &amp; Clearance Requirements
              </span>
              <button
                type="button"
                onClick={() =>
                  onJumpToCitation({
                    modelCode: activeRevision.modelCode,
                    revision: activeRevision.revision,
                    page: activeRevision.specs.deratingPage,
                  })
                }
                className="px-2.5 py-1 text-xs font-mono tabular-nums font-medium bg-white text-amber-900 border border-amber-300 rounded-md hover:bg-amber-100/70 cursor-pointer"
              >
                [{activeRevision.modelCode} | Rev {activeRevision.revision} |
                Page {activeRevision.specs.deratingPage}]
              </button>
            </div>
            <p className="text-sm leading-relaxed text-amber-900">
              {activeRevision.specs.deratingSummary}
            </p>
            {evaluation.advisoryWarnings.map((warn, idx) => (
              <div
                key={idx}
                className="p-3 bg-white border border-amber-300 rounded-lg text-xs font-medium text-amber-900"
              >
                Active Derating Advisory: {warn}
              </div>
            ))}
          </div>

          {/* Constraint Pass/Fail Table */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-800">
              Requirement Verification Breakdown
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs">
                    <th className="py-2.5 px-3.5 font-semibold">
                      Requirement Parameter
                    </th>
                    <th className="py-2.5 px-3.5 font-semibold">
                      Customer Target
                    </th>
                    <th className="py-2.5 px-3.5 font-semibold">
                      Datasheet Rating
                    </th>
                    <th className="py-2.5 px-3.5 font-semibold text-right">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {evaluation.diagnostics.map((d, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3.5 text-slate-900 font-medium">
                        {d.label}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono tabular-nums text-slate-600 text-xs">
                        {d.expected}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono tabular-nums text-slate-900 text-xs">
                        {d.actual}
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        <span
                          className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                            d.passed
                              ? d.warningNote
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {d.passed
                            ? d.warningNote
                              ? 'Pass (Derate)'
                              : 'Pass'
                            : 'Fail'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Mandatory 4-Point Engineering Sign-Off Checklist & Export */}
        <form
          onSubmit={handleRecordSignOff}
          className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-semibold text-slate-900">
                Engineering Suitability Sign-Off &amp; Export
              </h2>
            </div>
            <span className="text-xs font-medium text-slate-500">
              All 4 Checks Required
            </span>
          </div>

          {savedBanner && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2.5 text-sm text-emerald-800 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{savedBanner}</span>
            </div>
          )}

          {/* Mandatory 4-Point Engineering Checklist */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-800">
                Mandatory 4-Point Verification Checklist
              </span>
              <button
                type="button"
                onClick={() =>
                  setChecklist({
                    deratingVerified: true,
                    clearanceVerified: true,
                    certificationsVerified: true,
                    revisionVerified: true,
                  })
                }
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                Confirm All 4 Items
              </button>
            </div>

            {[
              {
                key: 'deratingVerified' as const,
                label:
                  '1. Verified output power after ambient temperature derating curve',
                sub: `Checked against Page ${activeRevision.specs.deratingPage} derating slope (100% load limit ≤ ${activeRevision.specs.fullLoadMaxTempC}°C)`,
              },
              {
                key: 'clearanceVerified' as const,
                label:
                  '2. Confirmed input voltage range, peak inrush, and DIN-rail mounting clearances',
                sub: `Input ${activeRevision.specs.inputVoltageMinV}–${activeRevision.specs.inputVoltageMaxV}V AC, Width ${activeRevision.specs.widthMm}mm`,
              },
              {
                key: 'certificationsVerified' as const,
                label:
                  '3. Verified mandatory regional/industry safety certifications',
                sub: `Approved certs: ${activeRevision.specs.certifications.join(', ')}`,
              },
              {
                key: 'revisionVerified' as const,
                label:
                  '4. Confirmed datasheet revision is current APPROVED version (non-superseded)',
                sub: `${activeRevision.modelCode} Rev ${activeRevision.revision} (${activeRevision.status})`,
              },
            ].map((item) => {
              const checked = checklist[item.key];
              return (
                <label
                  key={item.key}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                    checked
                      ? 'bg-emerald-50/60 border-emerald-300'
                      : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      setChecklist((prev) => ({
                        ...prev,
                        [item.key]: e.target.checked,
                      }))
                    }
                    className="mt-1 accent-blue-600 w-4 h-4"
                  />
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      {item.label}
                    </div>
                    <div className="text-xs font-mono tabular-nums text-slate-600 mt-0.5">
                      {item.sub}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Engineer Name & Project ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Sign-Off Engineer Name
              </label>
              <input
                type="text"
                value={engineerName}
                onChange={(e) => setEngineerName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Project / Panel ID
              </label>
              <input
                type="text"
                value={projectReference}
                onChange={(e) => setProjectReference(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm font-mono text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Engineering Suitability Notes
            </label>
            <textarea
              rows={2}
              value={engineeringNotes}
              onChange={(e) => setEngineeringNotes(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm text-slate-900"
            />
          </div>

          {/* 3 Export Deliverables */}
          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center gap-2.5">
            <button
              type="submit"
              disabled={!allFourChecked}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg shadow-xs inline-flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Record Audit Sign-Off</span>
            </button>

            <button
              type="button"
              disabled={!allFourChecked}
              onClick={() => {
                const rec = buildCurrentRecord();
                onSaveAuditRecord(rec);
                downloadJsonDossier(rec, activeRevision, evaluation);
              }}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 border border-slate-300 text-sm font-medium rounded-lg inline-flex items-center gap-2 cursor-pointer"
            >
              <FileCode2 className="w-4 h-4 text-blue-600" />
              <span>Download .json Dossier</span>
            </button>

            <button
              type="button"
              disabled={!allFourChecked}
              onClick={() => {
                const rec = buildCurrentRecord();
                onSaveAuditRecord(rec);
                downloadPrintableHtmlBrief(rec, activeRevision, evaluation);
              }}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 border border-slate-300 text-sm font-medium rounded-lg inline-flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-blue-600" />
              <span>Download Printable Brief (.html)</span>
            </button>
          </div>
        </form>
      </div>

      {/* Persistent Audit Trail Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">
              Completed Engineering Sign-Off Records ({auditRecords.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Stored with Revision Lineage &amp; Page Citations
          </span>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs">
                <th className="py-3 px-4 font-semibold">Audit ID / Date</th>
                <th className="py-3 px-4 font-semibold">Project Reference</th>
                <th className="py-3 px-4 font-semibold">
                  Selected Product &amp; Revision
                </th>
                <th className="py-3 px-4 font-semibold">Sign-Off Engineer</th>
                <th className="py-3 px-4 font-semibold">Cited Pages</th>
                <th className="py-3 px-4 font-semibold">Engineering Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {auditRecords.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono tabular-nums text-xs">
                    <div className="text-blue-700 font-semibold">{rec.id}</div>
                    <div className="text-slate-500">
                      {rec.timestamp.slice(0, 19).replace('T', ' ')}Z
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-900 font-medium text-xs">
                    {rec.projectReference}
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-xs">
                    <span className="text-emerald-700 font-bold">
                      {rec.modelCode}
                    </span>{' '}
                    <span className="text-slate-600">Rev {rec.revision}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-800 text-xs">
                    {rec.engineerName}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1.5">
                      {rec.citedPages.map((cp, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => onJumpToCitation(cp)}
                          className="px-2 py-0.5 text-xs font-mono tabular-nums bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 cursor-pointer"
                        >
                          [{cp.modelCode} | P{cp.page}]
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-600 text-xs max-w-md leading-relaxed">
                    {rec.engineeringNotes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
