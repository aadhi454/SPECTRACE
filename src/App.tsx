import React, { useCallback, useEffect, useState } from 'react';
import { FileSearch, LogOut, RotateCcw, ShieldCheck } from 'lucide-react';
import {
  CitedPageRef,
  ProductRevision,
  SignOffAuditRecord,
  SpecFilterConstraints,
} from './types/spec';
import { SEED_AUDIT_RECORDS, SEED_DATASHEETS } from './data/seedDatasheets';
import {
  CUSTOMER_SCENARIO_PRESETS,
  evaluateCorpus,
} from './services/filterEngine';
import { CURATED_PROMPT_CHIPS, runGroundedQA } from './services/qaService';
import {
  AuthenticatedUser,
  authFetch,
  clearInMemoryAuthTokens,
  setInMemoryAuthTokens,
} from './services/authClient';
import { SpecTraceLogo } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { WorkbenchView } from './components/WorkbenchView';
import { IngestView } from './components/IngestView';
import { SignOffView } from './components/SignOffView';
import { EvaluationLabView } from './components/EvaluationLabView';
import { ArchitectureView } from './components/ArchitectureView';
import { AdminSecurityView } from './components/AdminSecurityView';
import {
  DatasheetAssistantDrawer,
  QAChatExchange,
} from './components/DatasheetViewer';

type ActiveTab =
  | 'workbench'
  | 'ingest'
  | 'signoff'
  | 'evaluation'
  | 'architecture'
  | 'security';

export default function App() {
  // Strict Server-Side Authentication State (Zero tokens in localStorage)
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(true);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<ActiveTab>('workbench');

  // Protected Corpus & Audit State (Loaded from server ONLY after authentication)
  const [corpus, setCorpus] = useState<ProductRevision[]>(SEED_DATASHEETS);
  const [auditRecords, setAuditRecords] =
    useState<SignOffAuditRecord[]>(SEED_AUDIT_RECORDS);

  // Active Filter Constraints (Default to High Ambient 60°C Derating Check)
  const [constraints, setConstraints] = useState<SpecFilterConstraints>(
    CUSTOMER_SCENARIO_PRESETS[1].constraints
  );

  // Slide-Over Datasheet Assistant & Viewer Drawer State
  const approvedRevisions = corpus.filter((r) => r.status === 'APPROVED');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState<'qa' | 'viewer'>('qa');
  const [viewerRevisionId, setViewerRevisionId] = useState<string>(
    approvedRevisions[0]?.id || SEED_DATASHEETS[0].id
  );
  const [viewerPage, setViewerPage] = useState<number>(3);
  const [viewerHighlightTerms, setViewerHighlightTerms] = useState<string[]>([
    '50°C',
    '60°C',
    'derate',
  ]);
  const [citationFlashKey, setCitationFlashKey] = useState<number>(0);

  // Selected SKU for Sign-Off
  const [signOffRevisionId, setSignOffRevisionId] = useState<string>(
    approvedRevisions[0]?.id || SEED_DATASHEETS[0].id
  );

  // Grounded Q&A Chat History
  const [qaHistory, setQaHistory] = useState<QAChatExchange[]>([]);
  const [qaLoading, setQaLoading] = useState<boolean>(false);

  // Load protected corpus & audits from server once authenticated
  const loadProtectedData = useCallback(async () => {
    try {
      const [dsRes, auditsRes] = await Promise.all([
        authFetch('/api/datasheets'),
        authFetch('/api/audits'),
      ]);

      if (dsRes.status === 401 || auditsRes.status === 401) {
        clearInMemoryAuthTokens();
        setCurrentUser(null);
        return;
      }

      if (dsRes.ok) {
        const dsData = await dsRes.json();
        if (Array.isArray(dsData.datasheets) && dsData.datasheets.length > 0) {
          setCorpus(dsData.datasheets);
        }
      }

      if (auditsRes.ok) {
        const auditsData = await auditsRes.json();
        if (Array.isArray(auditsData.audits)) {
          setAuditRecords(auditsData.audits);
        }
      }
    } catch {
      // Keep fallback seed state if network hiccups
    }
  }, []);

  // Verify authentication & bootstrap status on application startup
  useEffect(() => {
    let mounted = true;

    const verifyStartupSession = async () => {
      setAuthChecking(true);
      try {
        // Remove any legacy localStorage session key so zero credentials/tokens exist in browser storage
        localStorage.removeItem('spectrace_admin_session');

        const statusRes = await fetch('/api/auth/status', {
          credentials: 'include',
        });
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (mounted) {
            setIsInitialized(Boolean(statusData.isInitialized));
          }
        }

        const meRes = await authFetch('/api/auth/me');
        if (meRes.ok) {
          const meData = await meRes.json();
          if (mounted && meData.user) {
            if (meData.csrfToken) {
              setInMemoryAuthTokens('', meData.csrfToken);
            }
            setCurrentUser(meData.user);
            await loadProtectedData();
          }
        } else if (mounted) {
          clearInMemoryAuthTokens();
          setCurrentUser(null);
        }
      } catch {
        if (mounted) {
          setCurrentUser(null);
        }
      } finally {
        if (mounted) {
          setAuthChecking(false);
        }
      }
    };

    verifyStartupSession();
    return () => {
      mounted = false;
    };
  }, [loadProtectedData]);

  // Execute Q&A query and append to chat history
  const handleRunQAQuery = useCallback(
    async (queryText: string) => {
      if (!currentUser) return;
      setQaLoading(true);
      try {
        const res = await runGroundedQA(corpus, queryText);
        setQaHistory((prev) => [
          ...prev,
          {
            id: `qa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            query: queryText,
            result: res,
          },
        ]);
      } finally {
        setQaLoading(false);
      }
    },
    [corpus, currentUser]
  );

  // Seed initial Q&A exchange once authenticated
  useEffect(() => {
    if (currentUser && qaHistory.length === 0) {
      handleRunQAQuery(CURATED_PROMPT_CHIPS[0].query);
    }
  }, [currentUser, handleRunQAQuery, qaHistory.length]);

  // Strict Server-Validated Login Callback
  const handleSuccessSignIn = async (user: AuthenticatedUser) => {
    setIsInitialized(true);
    setCurrentUser(user);
    await loadProtectedData();
  };

  // Server-Side Session Destruction Logout
  const handleSignOut = async () => {
    try {
      await authFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore network error on logout
    }
    clearInMemoryAuthTokens();
    setCurrentUser(null);
    setIsDrawerOpen(false);
    setQaHistory([]);
  };

  // Citation Jump Handler across any view -> opens Slide-Over Drawer straight to the cited model & page
  const handleJumpToCitation = (ref: CitedPageRef, highlightHint?: string) => {
    const matchedRev =
      corpus.find(
        (r) =>
          r.modelCode.toUpperCase() === ref.modelCode.toUpperCase() &&
          r.revision === ref.revision
      ) ||
      corpus.find(
        (r) =>
          r.modelCode.toUpperCase() === ref.modelCode.toUpperCase() &&
          r.status === 'APPROVED'
      );

    if (matchedRev) {
      setViewerRevisionId(matchedRev.id);
      setViewerPage(ref.page);
      const terms = ['50°C', '60°C', 'derate', '40mm', '20mm', 'SEMI F47'];
      if (highlightHint) {
        highlightHint
          .split(/\s+/)
          .filter((w) => w.length >= 4)
          .slice(0, 4)
          .forEach((w) => terms.push(w));
      }
      setViewerHighlightTerms(terms);
      setCitationFlashKey((prev) => prev + 1);
      setActiveDrawerTab('viewer');
      setIsDrawerOpen(true);
    }
  };

  // Open Drawer for a specific SKU from Product Finder cards
  const handleOpenAssistantForSku = (revisionId: string, page = 1) => {
    setViewerRevisionId(revisionId);
    setViewerPage(page);
    setActiveDrawerTab('viewer');
    setIsDrawerOpen(true);
  };

  // Ingest Handlers persisted to protected backend SQLite database
  const handleAddDraftRevision = async (draft: ProductRevision) => {
    setCorpus((prev) => [draft, ...prev]);
    try {
      const res = await authFetch('/api/datasheets/draft', {
        method: 'POST',
        body: JSON.stringify({ revision: draft }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.datasheets)) {
          setCorpus(data.datasheets);
        }
      }
    } catch {
      // local state already updated
    }
  };

  const handleApproveAndPublishRevision = (
    updatedRevision: ProductRevision,
    _approverName: string
  ): { supersededRev?: string } => {
    let supersededRev: string | undefined;

    setCorpus((prev) => {
      const exists = prev.some((r) => r.id === updatedRevision.id);
      const mapped = prev.map((r) => {
        if (r.id === updatedRevision.id) {
          return updatedRevision;
        }
        if (
          r.modelCode.toUpperCase() ===
            updatedRevision.modelCode.toUpperCase() &&
          r.status === 'APPROVED' &&
          r.id !== updatedRevision.id
        ) {
          supersededRev = r.revision;
          return {
            ...r,
            status: 'SUPERSEDED' as const,
          };
        }
        return r;
      });

      return exists ? mapped : [updatedRevision, ...mapped];
    });

    // Persist to protected SQLite database
    authFetch('/api/datasheets/approve', {
      method: 'POST',
      body: JSON.stringify({ revision: updatedRevision }),
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.datasheets)) {
            setCorpus(data.datasheets);
          }
        }
      })
      .catch(() => {
        // ignore network error
      });

    setViewerRevisionId(updatedRevision.id);
    setSignOffRevisionId(updatedRevision.id);
    return { supersededRev };
  };

  // Save Audit Record with Row-Level Security (RLS) user ownership
  const handleSaveAuditRecord = async (rec: SignOffAuditRecord) => {
    setAuditRecords((prev) => [rec, ...prev]);
    try {
      const res = await authFetch('/api/audits', {
        method: 'POST',
        body: JSON.stringify({ record: rec }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.audits)) {
          setAuditRecords(data.audits);
        }
      }
    } catch {
      // local state already updated
    }
  };

  // Reset Demo Corpus Handler
  const handleResetDemoCorpus = async () => {
    setCorpus(SEED_DATASHEETS);
    setConstraints(CUSTOMER_SCENARIO_PRESETS[1].constraints);
    setViewerRevisionId(SEED_DATASHEETS[0].id);
    setSignOffRevisionId(SEED_DATASHEETS[0].id);
    setViewerPage(3);
    try {
      const res = await authFetch('/api/datasheets/reset', {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.datasheets)) {
          setCorpus(data.datasheets);
        }
      }
    } catch {
      // ignore network error
    }
  };

  // Startup Session Verification Loader
  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-8 max-w-sm w-full text-center">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <SpecTraceLogo className="w-6 h-6" />
          </div>
          <div className="text-sm font-semibold text-slate-900">
            Verifying Private Access Session…
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Enforcing server-side allowlist &amp; session token validation
          </p>
        </div>
      </div>
    );
  }

  // Strict Access Gate: Unauthenticated visitors NEVER access the application
  if (!currentUser) {
    return (
      <LoginPage
        isInitialized={isInitialized}
        onSuccessSignIn={handleSuccessSignIn}
      />
    );
  }

  const evaluationSummary = evaluateCorpus(corpus, constraints);
  const selectedViewerRevision =
    approvedRevisions.find((r) => r.id === viewerRevisionId) ||
    approvedRevisions[0] ||
    corpus[0];

  const approvedCount = approvedRevisions.length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* Authenticated Top Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
        {/* Left: SpecTrace SVG Logo + Wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <SpecTraceLogo className="w-7 h-7" />
          <span className="text-lg font-bold tracking-tight text-slate-900">
            SpecTrace
          </span>
          <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            Private Workspace
          </span>
        </div>

        {/* Center Navigation Tabs */}
        <nav className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'workbench' as const, label: 'Product Finder' },
            { id: 'ingest' as const, label: 'Datasheet Manager' },
            { id: 'signoff' as const, label: 'Selection Sign-Off' },
            { id: 'evaluation' as const, label: 'Review Benchmarks' },
            { id: 'architecture' as const, label: 'System Architecture' },
            { id: 'security' as const, label: 'Access & Security' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="hidden lg:inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {approvedCount} Active Datasheets
          </span>

          <button
            type="button"
            onClick={() => {
              setActiveDrawerTab('qa');
              setIsDrawerOpen(true);
            }}
            className="px-3.5 py-1.5 text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileSearch className="w-4 h-4" />
            <span>Datasheet Assistant</span>
          </button>

          {currentUser.role === 'admin' && (
            <button
              type="button"
              onClick={handleResetDemoCorpus}
              title="Reset Demo Corpus to initial 6 Mean Well datasheets"
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-700 font-mono">
              {currentUser.email}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                currentUser.role === 'admin'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {currentUser.role}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'workbench' && (
          <WorkbenchView
            constraints={constraints}
            eligible={evaluationSummary.eligible}
            disqualified={evaluationSummary.disqualified}
            ignoredSupersededCount={evaluationSummary.ignoredSupersededCount}
            ignoredDraftCount={evaluationSummary.ignoredDraftCount}
            onUpdateConstraints={setConstraints}
            onOpenAssistantForSku={handleOpenAssistantForSku}
            onJumpToCitation={handleJumpToCitation}
            onProceedToSignOff={(revId) => {
              setSignOffRevisionId(revId);
              setActiveTab('signoff');
            }}
          />
        )}

        {activeTab === 'ingest' && (
          <IngestView
            corpus={corpus}
            onAddDraftRevision={handleAddDraftRevision}
            onApproveAndPublishRevision={handleApproveAndPublishRevision}
          />
        )}

        {activeTab === 'signoff' && (
          <SignOffView
            approvedRevisions={approvedRevisions}
            selectedRevisionId={signOffRevisionId}
            constraints={constraints}
            auditRecords={auditRecords}
            onSelectRevisionId={setSignOffRevisionId}
            onSaveAuditRecord={handleSaveAuditRecord}
            onJumpToCitation={handleJumpToCitation}
          />
        )}

        {activeTab === 'evaluation' && <EvaluationLabView corpus={corpus} />}

        {activeTab === 'architecture' && (
          <ArchitectureView corpus={corpus} constraints={constraints} />
        )}

        {activeTab === 'security' && (
          <AdminSecurityView currentUser={currentUser} />
        )}
      </main>

      {/* Slide-Over Datasheet Assistant & Page Viewer Drawer */}
      <DatasheetAssistantDrawer
        isOpen={isDrawerOpen}
        activeDrawerTab={activeDrawerTab}
        approvedRevisions={approvedRevisions}
        selectedRevision={selectedViewerRevision}
        activePage={viewerPage}
        highlightTerms={viewerHighlightTerms}
        citationFlashKey={citationFlashKey}
        qaHistory={qaHistory}
        qaLoading={qaLoading}
        onClose={() => setIsDrawerOpen(false)}
        onSelectDrawerTab={setActiveDrawerTab}
        onSelectRevision={setViewerRevisionId}
        onSelectPage={setViewerPage}
        onRunQAQuery={handleRunQAQuery}
        onCitationClick={handleJumpToCitation}
      />
    </div>
  );
}
