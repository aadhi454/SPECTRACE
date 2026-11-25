import React, { useRef, useState } from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  FileCheck2,
  FileText,
  FileUp,
  Layers,
  ShieldCheck,
  Table,
} from 'lucide-react';
import { ProductRevision } from '../types/spec';
import {
  createSimulatedDigitalPdfUpgrade,
  createSimulatedScannedPdfRejection,
  parseUploadedDatasheetFile,
} from '../services/pdfIngestService';

const CERT_OPTIONS = ['UL508', 'TUV EN62368-1', 'SEMI F47', 'CE'];

interface IngestViewProps {
  corpus: ProductRevision[];
  onAddDraftRevision: (draft: ProductRevision) => void;
  onApproveAndPublishRevision: (
    updatedRevision: ProductRevision,
    approverName: string
  ) => { supersededRev?: string };
}

export const IngestView: React.FC<IngestViewProps> = ({
  corpus,
  onAddDraftRevision,
  onApproveAndPublishRevision,
}) => {
  const initialDraft =
    corpus.find((r) => r.status === 'DRAFT') || corpus[0];
  const [selectedRevId, setSelectedRevId] = useState<string>(initialDraft.id);
  const [activePageIdx, setActivePageIdx] = useState<number>(0);
  const [approverName, setApproverName] = useState<string>(
    'R. Sterling, Senior Compliance Eng.'
  );

  const selectedRev =
    corpus.find((r) => r.id === selectedRevId) || corpus[0];

  const [editModelCode, setEditModelCode] = useState<string>(
    selectedRev.modelCode
  );
  const [editRevision, setEditRevision] = useState<string>(selectedRev.revision);
  const [editVoltageV, setEditVoltageV] = useState<number>(
    selectedRev.specs.outputVoltageV
  );
  const [editPowerW, setEditPowerW] = useState<number>(
    selectedRev.specs.outputPowerW
  );
  const [editInputMinV, setEditInputMinV] = useState<number>(
    selectedRev.specs.inputVoltageMinV
  );
  const [editInputMaxV, setEditInputMaxV] = useState<number>(
    selectedRev.specs.inputVoltageMaxV
  );
  const [editEfficiencyPct, setEditEfficiencyPct] = useState<number>(
    selectedRev.specs.efficiencyPct
  );
  const [editTempMaxC, setEditTempMaxC] = useState<number>(
    selectedRev.specs.operatingTempMaxC
  );
  const [editFullLoadMaxC, setEditFullLoadMaxC] = useState<number>(
    selectedRev.specs.fullLoadMaxTempC
  );
  const [editWidthMm, setEditWidthMm] = useState<number>(
    selectedRev.specs.widthMm
  );
  const [editCerts, setEditCerts] = useState<string[]>(
    selectedRev.specs.certifications
  );
  const [editDeratingSummary, setEditDeratingSummary] = useState<string>(
    selectedRev.specs.deratingSummary
  );

  const [scannedErrorBanner, setScannedErrorBanner] = useState<string | null>(
    null
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [approvalBanner, setApprovalBanner] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadRevisionIntoEditor = (rev: ProductRevision) => {
    setSelectedRevId(rev.id);
    setActivePageIdx(0);
    setEditModelCode(rev.modelCode);
    setEditRevision(rev.revision);
    setEditVoltageV(rev.specs.outputVoltageV);
    setEditPowerW(rev.specs.outputPowerW);
    setEditInputMinV(rev.specs.inputVoltageMinV);
    setEditInputMaxV(rev.specs.inputVoltageMaxV);
    setEditEfficiencyPct(rev.specs.efficiencyPct);
    setEditTempMaxC(rev.specs.operatingTempMaxC);
    setEditFullLoadMaxC(rev.specs.fullLoadMaxTempC);
    setEditWidthMm(rev.specs.widthMm);
    setEditCerts([...rev.specs.certifications]);
    setEditDeratingSummary(rev.specs.deratingSummary);
    setValidationError(null);
  };

  const handleSimulateDigitalUpload = () => {
    setScannedErrorBanner(null);
    setApprovalBanner(null);
    const result = createSimulatedDigitalPdfUpgrade();
    if (result.draftRevision) {
      onAddDraftRevision(result.draftRevision);
      loadRevisionIntoEditor(result.draftRevision);
    }
  };

  const handleSimulateScannedRejection = () => {
    setApprovalBanner(null);
    const result = createSimulatedScannedPdfRejection();
    setScannedErrorBanner(result.errorMessage || 'Upload rejected');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScannedErrorBanner(null);
    setApprovalBanner(null);
    const result = await parseUploadedDatasheetFile(file);
    if (!result.success || result.rejectedByScannedGuard) {
      setScannedErrorBanner(
        result.errorMessage ||
          'Upload rejected by Scanned PDF Guard (<50 chars/page).'
      );
    } else if (result.draftRevision) {
      onAddDraftRevision(result.draftRevision);
      loadRevisionIntoEditor(result.draftRevision);
    }
    e.target.value = '';
  };

  const toggleEditCert = (cert: string) => {
    setEditCerts((prev) =>
      prev.includes(cert) ? prev.filter((c) => c !== cert) : [...prev, cert]
    );
  };

  const handleApproveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setApprovalBanner(null);

    if (editInputMinV >= editInputMaxV) {
      setValidationError(
        `Validation Error: Minimum Input Voltage (${editInputMinV}V) must be less than Maximum Input Voltage (${editInputMaxV}V).`
      );
      return;
    }
    if (editFullLoadMaxC > editTempMaxC) {
      setValidationError(
        `Validation Error: Full-Load Temp Limit (${editFullLoadMaxC}°C) cannot exceed Maximum Operating Temp (${editTempMaxC}°C).`
      );
      return;
    }
    if (editPowerW <= 0 || editVoltageV <= 0) {
      setValidationError(
        'Validation Error: Output voltage and power must be positive numbers.'
      );
      return;
    }

    const updatedCurrentA = +(editPowerW / editVoltageV).toFixed(2);
    const updatedRecord: ProductRevision = {
      ...selectedRev,
      modelCode: editModelCode.trim().toUpperCase(),
      revision: editRevision.trim(),
      status: 'APPROVED',
      approvedBy: approverName.trim() || 'Lead Verification Engineer',
      approvedAt: new Date().toISOString(),
      specs: {
        ...selectedRev.specs,
        outputVoltageV: editVoltageV,
        outputCurrentA: updatedCurrentA,
        outputPowerW: editPowerW,
        inputVoltageMinV: editInputMinV,
        inputVoltageMaxV: editInputMaxV,
        efficiencyPct: editEfficiencyPct,
        operatingTempMaxC: editTempMaxC,
        fullLoadMaxTempC: editFullLoadMaxC,
        widthMm: editWidthMm,
        certifications: editCerts,
        deratingSummary: editDeratingSummary,
      },
    };

    const { supersededRev } = onApproveAndPublishRevision(
      updatedRecord,
      approverName
    );
    setApprovalBanner(
      supersededRev
        ? `Published ${updatedRecord.modelCode} Rev ${updatedRecord.revision} as Approved. Automatically retired prior revision Rev ${supersededRev} to Superseded.`
        : `Published ${updatedRecord.modelCode} Rev ${updatedRecord.revision} as Approved and added to active product catalog.`
    );
  };

  const currentPage =
    selectedRev.pages[activePageIdx] || selectedRev.pages[0];

  return (
    <div className="max-w-7xl mx-auto py-8 px-6 space-y-6">
      {/* Top Upload & Gatekeeper Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-blue-600" />
              <span>Datasheet Ingestion &amp; Revision Governance</span>
            </h1>
            <p className="text-sm text-slate-600">
              Upload digital product datasheets, verify extracted ratings, and
              automatically retire superseded revisions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-sm bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium rounded-lg inline-flex items-center gap-2 cursor-pointer"
            >
              <FileUp className="w-4 h-4 text-blue-600" />
              <span>Upload PDF / Spec File</span>
            </button>

            <button
              type="button"
              onClick={handleSimulateDigitalUpload}
              className="px-4 py-2 text-sm font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg cursor-pointer"
            >
              Simulate Upload: DR-75-24 Rev 2026-08 (Digital PDF)
            </button>

            <button
              type="button"
              onClick={handleSimulateScannedRejection}
              className="px-4 py-2 text-sm font-medium bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg cursor-pointer"
            >
              Simulate Upload: Scanned_Catalog_Scan.pdf (Image-Only)
            </button>
          </div>
        </div>

        {/* Scanned PDF Hard Guard Alert */}
        {scannedErrorBanner && (
          <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 text-sm text-rose-800">
              <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-rose-900">
                  Scanned Image PDF Rejected — Digital Text Required
                </div>
                <div className="mt-0.5 text-rose-700">{scannedErrorBanner}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setScannedErrorBanner(null)}
              className="text-xs font-medium text-rose-700 hover:text-rose-900 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Approval Banner */}
        {approvalBanner && (
          <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 text-sm text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-emerald-900">
                  Datasheet Approved &amp; Published
                </div>
                <div className="mt-0.5 text-emerald-700">{approvalBanner}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setApprovalBanner(null)}
              className="text-xs font-medium text-emerald-700 hover:text-emerald-900 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Split-Screen Verification Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Pane: Extracted Document Text & Specification Table */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3.5">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Extracted Document Preview: {selectedRev.modelCode} (Rev{' '}
                {selectedRev.revision})
              </h2>
              <div className="text-xs text-slate-500 mt-0.5">
                File: {selectedRev.sourceFilename}
              </div>
            </div>
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                selectedRev.status === 'APPROVED'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : selectedRev.status === 'DRAFT'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {selectedRev.status}
            </span>
          </div>

          {/* Page Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {selectedRev.pages.map((p, idx) => (
              <button
                key={p.pageNumber}
                type="button"
                onClick={() => setActivePageIdx(idx)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors ${
                  activePageIdx === idx
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Page {p.pageNumber}
              </button>
            ))}
          </div>

          {/* Extracted Document Text */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
                <FileText className="w-4 h-4 text-blue-600" />
                Extracted Document Text ({currentPage.sectionTitle})
              </span>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-lg text-sm leading-relaxed text-slate-700 whitespace-pre-line">
              {currentPage.content}
            </div>
          </div>

          {/* Extracted Specification Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
                <Table className="w-4 h-4 text-blue-600" />
                Extracted Specification Table
              </span>
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs">
                    <th className="py-2 px-3 font-semibold">Parameter</th>
                    <th className="py-2 px-3 font-semibold">Condition</th>
                    <th className="py-2 px-3 font-semibold text-right">
                      Value
                    </th>
                    <th className="py-2 px-3 font-semibold">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {currentPage.extractedTableRows.map((row, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 text-slate-900 font-medium text-xs">
                        {row.parameter}
                      </td>
                      <td className="py-2 px-3 text-slate-600 text-xs">
                        {row.condition}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-blue-700 font-semibold text-xs">
                        {row.value}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-500 text-xs">
                        {row.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Pane: Verify & Approve Specifications */}
        <form
          onSubmit={handleApproveSubmit}
          className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-3.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-semibold text-slate-900">
                Verify &amp; Approve Specifications
              </h2>
            </div>
            <span className="text-xs font-medium text-slate-500">
              Engineering Quality Gate
            </span>
          </div>

          {validationError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700 font-medium">
              {validationError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Model Code
              </label>
              <input
                type="text"
                value={editModelCode}
                onChange={(e) => setEditModelCode(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono tabular-nums text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Revision Code
              </label>
              <input
                type="text"
                value={editRevision}
                onChange={(e) => setEditRevision(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono tabular-nums text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Output Voltage (V DC)
              </label>
              <input
                type="number"
                step="0.1"
                value={editVoltageV}
                onChange={(e) => setEditVoltageV(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono tabular-nums text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Output Power (W)
              </label>
              <input
                type="number"
                step="0.1"
                value={editPowerW}
                onChange={(e) => setEditPowerW(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono tabular-nums text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Input AC Min (V)
              </label>
              <input
                type="number"
                value={editInputMinV}
                onChange={(e) =>
                  setEditInputMinV(parseFloat(e.target.value) || 0)
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono tabular-nums text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Input AC Max (V)
              </label>
              <input
                type="number"
                value={editInputMaxV}
                onChange={(e) =>
                  setEditInputMaxV(parseFloat(e.target.value) || 0)
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono tabular-nums text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Efficiency (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={editEfficiencyPct}
                onChange={(e) =>
                  setEditEfficiencyPct(parseFloat(e.target.value) || 0)
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono tabular-nums text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Operating Temp Max (°C)
              </label>
              <input
                type="number"
                value={editTempMaxC}
                onChange={(e) =>
                  setEditTempMaxC(parseFloat(e.target.value) || 0)
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono tabular-nums text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-amber-800 mb-1">
                100% Full-Load Limit (°C)
              </label>
              <input
                type="number"
                value={editFullLoadMaxC}
                onChange={(e) =>
                  setEditFullLoadMaxC(parseFloat(e.target.value) || 0)
                }
                className="w-full bg-amber-50/40 border border-amber-300 rounded-lg px-3 py-2 text-sm font-mono tabular-nums text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Enclosure Width (mm)
              </label>
              <input
                type="number"
                step="0.5"
                value={editWidthMm}
                onChange={(e) => setEditWidthMm(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono tabular-nums text-slate-900"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Approving Lead Engineer
              </label>
              <input
                type="text"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900"
              />
            </div>
          </div>

          {/* Certifications */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Verified Safety &amp; Industry Certifications
            </label>
            <div className="flex flex-wrap gap-2">
              {CERT_OPTIONS.map((cert) => {
                const active = editCerts.includes(cert);
                return (
                  <button
                    key={cert}
                    type="button"
                    onClick={() => toggleEditCert(cert)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer transition-colors ${
                      active
                        ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {cert}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Derating Summary */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Thermal Derating &amp; Clearance Summary (Page 3)
            </label>
            <textarea
              rows={3}
              value={editDeratingSummary}
              onChange={(e) => setEditDeratingSummary(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
            <span className="text-xs text-slate-600">
              Publishing automatically retires any older Approved revision of{' '}
              <strong className="font-mono text-slate-900">
                {editModelCode}
              </strong>
              .
            </span>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-xs cursor-pointer transition-colors"
            >
              Approve &amp; Publish Datasheet
            </button>
          </div>
        </form>
      </div>

      {/* Revision Registry Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">
              Datasheet Revision Catalog ({corpus.length} Total Revisions)
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Only Approved revisions are eligible in the Product Finder
          </span>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs">
                <th className="py-3 px-4 font-semibold">Model Code</th>
                <th className="py-3 px-4 font-semibold">Revision</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Electrical Rating</th>
                <th className="py-3 px-4 font-semibold">
                  Thermal Envelope (Full-Load Limit)
                </th>
                <th className="py-3 px-4 font-semibold">Source File</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {corpus.map((rev) => {
                const isSelected = rev.id === selectedRev.id;
                return (
                  <tr
                    key={rev.id}
                    className={
                      isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                    }
                  >
                    <td className="py-3 px-4 font-mono tabular-nums font-bold text-slate-900">
                      {rev.modelCode}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                      Rev {rev.revision}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                          rev.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : rev.status === 'DRAFT'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {rev.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                      {rev.specs.outputVoltageV}V / {rev.specs.outputPowerW}W /{' '}
                      {rev.specs.efficiencyPct}%
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                      {rev.specs.operatingTempMinC}°C to +
                      {rev.specs.operatingTempMaxC}°C (≤
                      {rev.specs.fullLoadMaxTempC}°C)
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">
                      {rev.sourceFilename}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => loadRevisionIntoEditor(rev)}
                        className="px-3 py-1.5 text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg cursor-pointer"
                      >
                        Review / Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
