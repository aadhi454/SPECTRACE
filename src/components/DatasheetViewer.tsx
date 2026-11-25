import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  FileSearch,
  FileText,
  Send,
  Table,
  X,
} from 'lucide-react';
import {
  CitedPageRef,
  GroundedQAResult,
  ProductRevision,
} from '../types/spec';
import { CURATED_PROMPT_CHIPS } from '../services/qaService';

interface CitationTextRendererProps {
  text: string;
  onCitationClick: (ref: CitedPageRef, highlightHint?: string) => void;
}

export const CitationTextRenderer: React.FC<CitationTextRendererProps> = ({
  text,
  onCitationClick,
}) => {
  const tokenRegex =
    /(\[\s*[A-Z0-9-]+\s*\|\s*Rev\s*[0-9-]+\s*\|\s*Page\s*\d+\s*\])/gi;
  const parts = text.split(tokenRegex);

  return (
    <span>
      {parts.map((part, idx) => {
        const match = part.match(
          /^\[\s*([A-Z0-9-]+)\s*\|\s*Rev\s*([0-9-]+)\s*\|\s*Page\s*(\d+)\s*\]$/i
        );
        if (match) {
          const modelCode = match[1].toUpperCase();
          const revision = match[2];
          const page = parseInt(match[3], 10);
          return (
            <button
              key={idx}
              type="button"
              onClick={() =>
                onCitationClick({ modelCode, revision, page }, text.slice(0, 80))
              }
              title={`Open ${modelCode} Rev ${revision}, Page ${page}`}
              className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 text-xs font-mono tabular-nums font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
            >
              <span>{`[${modelCode} | Rev ${revision} | Page ${page}]`}</span>
            </button>
          );
        }
        return <React.Fragment key={idx}>{part}</React.Fragment>;
      })}
    </span>
  );
};

interface DatasheetViewerProps {
  approvedRevisions: ProductRevision[];
  selectedRevision: ProductRevision;
  activePage: number;
  highlightTerms: string[];
  citationFlashKey: number;
  onSelectRevision: (revisionId: string) => void;
  onSelectPage: (pageNumber: number) => void;
}

export const DatasheetViewer: React.FC<DatasheetViewerProps> = ({
  approvedRevisions,
  selectedRevision,
  activePage,
  highlightTerms,
  citationFlashKey,
  onSelectRevision,
  onSelectPage,
}) => {
  const proseContainerRef = useRef<HTMLDivElement | null>(null);

  const currentPageObj =
    selectedRevision.pages.find((p) => p.pageNumber === activePage) ||
    selectedRevision.pages[0];

  useEffect(() => {
    if (citationFlashKey > 0 && proseContainerRef.current) {
      proseContainerRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [citationFlashKey, activePage, selectedRevision.id]);

  const renderHighlightedProse = (prose: string) => {
    const paragraphs = prose.split('\n\n');
    const cleanTerms = highlightTerms
      .map((t) => t.toLowerCase().trim())
      .filter((t) => t.length >= 3);

    return paragraphs.map((para, pIdx) => {
      const sentences = para.split(/(?<=[.!?])\s+/);
      return (
        <p
          key={pIdx}
          className="text-sm leading-relaxed text-slate-700 mb-3 last:mb-0"
        >
          {sentences.map((sentence, sIdx) => {
            const sLower = sentence.toLowerCase();
            const isHighlighted =
              cleanTerms.length > 0 &&
              cleanTerms.some((term) => sLower.includes(term));
            return (
              <span
                key={sIdx}
                className={
                  isHighlighted
                    ? 'bg-amber-100 text-slate-900 font-medium px-1 py-0.5 rounded border border-amber-300 transition-colors'
                    : ''
                }
              >
                {sentence}{' '}
              </span>
            );
          })}
        </p>
      );
    });
  };

  return (
    <div
      ref={proseContainerRef}
      className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden"
    >
      {/* Top Viewer Toolbar */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="text-sm font-semibold text-slate-900">
            Official Datasheet Document
          </span>
          <span className="text-slate-400" aria-hidden="true">
            •
          </span>
          <span className="text-xs font-mono tabular-nums text-slate-500">
            {selectedRevision.sourceFilename}
          </span>
        </div>

        {/* Model Selector Dropdown */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="datasheet-sku-select"
            className="text-xs font-medium text-slate-600"
          >
            Product Model:
          </label>
          <select
            id="datasheet-sku-select"
            value={selectedRevision.id}
            onChange={(e) => onSelectRevision(e.target.value)}
            className="bg-white text-slate-900 font-mono tabular-nums text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600"
          >
            {approvedRevisions.map((rev) => (
              <option key={rev.id} value={rev.id}>
                {rev.modelCode} (Rev {rev.revision})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Page Navigation Bar */}
      <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {selectedRevision.pages.map((page) => {
            const isActive = page.pageNumber === currentPageObj.pageNumber;
            return (
              <button
                key={page.pageNumber}
                type="button"
                onClick={() => onSelectPage(page.pageNumber)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                }`}
              >
                Page {page.pageNumber}
              </button>
            );
          })}
        </div>

        <div className="text-xs font-mono tabular-nums font-medium px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
          [{selectedRevision.modelCode} | Rev {selectedRevision.revision} | Page{' '}
          {currentPageObj.pageNumber}]
        </div>
      </div>

      {/* Page Content Area */}
      <div className="p-5 space-y-5">
        {/* Document Section Banner */}
        <div className="px-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="text-slate-600">
            Model:{' '}
            <strong className="font-mono text-slate-900">
              {selectedRevision.modelCode}
            </strong>{' '}
            • Revision:{' '}
            <strong className="font-mono text-slate-900">
              {selectedRevision.revision}
            </strong>{' '}
            • Section:{' '}
            <strong className="text-blue-700">
              {currentPageObj.sectionTitle}
            </strong>
          </div>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            Approved Revision
          </span>
        </div>

        {/* Specification Table */}
        {currentPageObj.extractedTableRows.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
              <Table className="w-4 h-4 text-blue-600" />
              <span>Specification Table (Page {currentPageObj.pageNumber})</span>
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs">
                    <th className="py-2.5 px-3 font-semibold">Parameter</th>
                    <th className="py-2.5 px-3 font-semibold">Test Condition</th>
                    <th className="py-2.5 px-3 font-semibold text-right">
                      Value
                    </th>
                    <th className="py-2.5 px-3 font-semibold">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {currentPageObj.extractedTableRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 text-slate-900 font-medium text-xs">
                        {row.parameter}
                      </td>
                      <td className="py-2 px-3 text-slate-600 text-xs">
                        {row.condition}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-blue-700 font-semibold text-xs">
                        {row.value}
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums text-slate-500 text-xs">
                        {row.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Full Page Text */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>
              Page {currentPageObj.pageNumber} Text —{' '}
              {currentPageObj.sectionTitle}
            </span>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-lg">
            {renderHighlightedProse(currentPageObj.content)}
          </div>
        </div>
      </div>
    </div>
  );
};

export interface QAChatExchange {
  id: string;
  query: string;
  result: GroundedQAResult;
}

interface DatasheetAssistantDrawerProps {
  isOpen: boolean;
  activeDrawerTab: 'qa' | 'viewer';
  approvedRevisions: ProductRevision[];
  selectedRevision: ProductRevision;
  activePage: number;
  highlightTerms: string[];
  citationFlashKey: number;
  qaHistory: QAChatExchange[];
  qaLoading: boolean;
  onClose: () => void;
  onSelectDrawerTab: (tab: 'qa' | 'viewer') => void;
  onSelectRevision: (revisionId: string) => void;
  onSelectPage: (pageNumber: number) => void;
  onRunQAQuery: (query: string) => void;
  onCitationClick: (ref: CitedPageRef, highlightHint?: string) => void;
}

export const DatasheetAssistantDrawer: React.FC<
  DatasheetAssistantDrawerProps
> = ({
  isOpen,
  activeDrawerTab,
  approvedRevisions,
  selectedRevision,
  activePage,
  highlightTerms,
  citationFlashKey,
  qaHistory,
  qaLoading,
  onClose,
  onSelectDrawerTab,
  onSelectRevision,
  onSelectPage,
  onRunQAQuery,
  onCitationClick,
}) => {
  const [queryInput, setQueryInput] = useState<string>('');

  if (!isOpen) return null;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryInput.trim()) return;
    onRunQAQuery(queryInput.trim());
    setQueryInput('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Subtle Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/25 backdrop-blur-[1px] transition-opacity"
        aria-hidden="true"
      />

      {/* Slide-Over Panel */}
      <aside className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col">
        {/* Drawer Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileSearch className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">
              Datasheet Assistant &amp; Page Viewer
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Two Clean Drawer Tabs */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSelectDrawerTab('qa')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              activeDrawerTab === 'qa'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
            }`}
          >
            Page-Cited Spec Q&amp;A
          </button>
          <button
            type="button"
            onClick={() => onSelectDrawerTab('viewer')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              activeDrawerTab === 'viewer'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
            }`}
          >
            Datasheet Page Viewer ({selectedRevision.modelCode} • Page{' '}
            {activePage})
          </button>
        </div>

        {/* Tab 1: Page-Cited Spec Q&A */}
        {activeDrawerTab === 'qa' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#F8FAFC]">
              {/* Quick-Question Chips */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2.5">
                <div className="text-xs font-semibold text-slate-700">
                  Quick Engineering Questions (Click to Verify):
                </div>
                <div className="flex flex-wrap gap-2">
                  {CURATED_PROMPT_CHIPS.slice(0, 4).map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => onRunQAQuery(chip.query)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer text-left ${
                        chip.isTrap
                          ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat History */}
              <div className="space-y-4">
                {qaHistory.map((item) => (
                  <div key={item.id} className="space-y-2.5">
                    {/* User Question Bubble */}
                    <div className="flex justify-end">
                      <div className="max-w-lg bg-blue-600 text-white rounded-xl rounded-br-xs px-4 py-2.5 text-sm shadow-xs">
                        {item.query}
                      </div>
                    </div>

                    {/* Grounded AI Answer Bubble */}
                    <div className="flex justify-start">
                      <div
                        className={`w-full rounded-xl p-4 border shadow-xs space-y-2.5 ${
                          item.result.isRefusal
                            ? 'bg-rose-50 border-rose-200 text-rose-900'
                            : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                          <span
                            className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                              item.result.isRefusal
                                ? 'bg-rose-100 text-rose-800 border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {item.result.isRefusal
                              ? 'Evidence Refusal Guardrail'
                              : 'Verified Datasheet Answer'}
                          </span>
                          <span className="text-xs text-slate-500">
                            Click any citation badge to inspect the source page
                          </span>
                        </div>

                        <div className="text-sm leading-relaxed">
                          <CitationTextRenderer
                            text={item.result.answer}
                            onCitationClick={(ref, hint) => {
                              onCitationClick(ref, hint);
                              onSelectDrawerTab('viewer');
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {qaLoading && (
                  <div className="p-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-600">
                    Searching approved datasheets and verifying page
                    citations...
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Question Input Bar */}
            <form
              onSubmit={handleFormSubmit}
              className="p-4 bg-white border-t border-slate-200 flex items-center gap-2.5"
            >
              <input
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="Ask about thermal derating, clearances, or certifications..."
                className="flex-1 bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
              />
              <button
                type="submit"
                disabled={qaLoading}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Ask AI</span>
              </button>
            </form>
          </div>
        ) : (
          /* Tab 2: Datasheet Page Viewer */
          <div className="flex-1 overflow-y-auto p-6 bg-[#F8FAFC]">
            <DatasheetViewer
              approvedRevisions={approvedRevisions}
              selectedRevision={selectedRevision}
              activePage={activePage}
              highlightTerms={highlightTerms}
              citationFlashKey={citationFlashKey}
              onSelectRevision={onSelectRevision}
              onSelectPage={onSelectPage}
            />
          </div>
        )}
      </aside>
    </div>
  );
};
