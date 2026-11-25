import React from 'react';
import { ArrowRight, CheckCircle2, FileSearch, ShieldCheck } from 'lucide-react';

export const SpecTraceLogo: React.FC<{ className?: string }> = ({
  className = 'w-7 h-7',
}) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <rect width="32" height="32" rx="8" fill="#EFF6FF" />
    <path
      d="M16 6L26 11.5L16 17L6 11.5L16 6Z"
      fill="#2563EB"
      stroke="#2563EB"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M6 16.5L16 22L26 16.5"
      stroke="#2563EB"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6 21.5L16 27L26 21.5"
      stroke="#60A5FA"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface LandingPageProps {
  onNavigateToLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigateToLogin,
}) => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <SpecTraceLogo className="w-8 h-8" />
          <span className="text-lg font-bold tracking-tight text-slate-900">
            SpecTrace
          </span>
        </div>

        <button
          type="button"
          onClick={onNavigateToLogin}
          className="px-4 py-2 text-sm bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium rounded-lg transition-colors cursor-pointer"
        >
          Admin Sign In
        </button>
      </header>

      {/* Centered Hero Section */}
      <main className="flex-1">
        <section className="max-w-4xl mx-auto pt-20 pb-16 px-6 text-center">
          <div className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 mb-6">
            Industrial Specification Intelligence
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
            Turn Static Datasheets into Verified Engineering Selections.
          </h1>

          <p className="text-lg text-slate-600 max-w-2xl mx-auto mt-4 leading-relaxed">
            Filter industrial product specs with zero calculation errors, verify
            thermal derating caveats via page-cited AI, and enforce revision
            governance in one clean workspace.
          </p>

          <div className="mt-8">
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="px-6 py-3.5 text-base bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-xs inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span>Open Admin Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* 3 Minimal Value Cards */}
        <section className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 px-6 pb-20">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">
              Deterministic Spec Filtering
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Match voltage, wattage, ambient temperature, width, and
              certifications with exact pass/fail diagnostics.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <FileSearch className="w-5 h-5" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">
              Page-Cited Datasheet Q&amp;A
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Ask technical questions and jump straight to the exact source page
              with strict evidence-only refusal guardrails.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">
              Revision &amp; Audit Control
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Automatically retire superseded datasheets and export signed
              engineering selection briefs.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};
