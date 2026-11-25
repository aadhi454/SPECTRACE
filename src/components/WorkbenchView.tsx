import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileSearch,
  RotateCcw,
  ShieldAlert,
  SlidersHorizontal,
  XCircle,
} from 'lucide-react';
import {
  CitedPageRef,
  EligibilityEvaluation,
  SpecFilterConstraints,
} from '../types/spec';
import { CUSTOMER_SCENARIO_PRESETS } from '../services/filterEngine';

const AVAILABLE_CERTIFICATIONS = ['UL508', 'TUV EN62368-1', 'SEMI F47', 'CE'];

interface WorkbenchViewProps {
  constraints: SpecFilterConstraints;
  eligible: EligibilityEvaluation[];
  disqualified: EligibilityEvaluation[];
  ignoredSupersededCount: number;
  ignoredDraftCount: number;
  onUpdateConstraints: (next: SpecFilterConstraints) => void;
  onOpenAssistantForSku: (revisionId: string, page?: number) => void;
  onJumpToCitation: (ref: CitedPageRef, highlightHint?: string) => void;
  onProceedToSignOff: (revisionId: string) => void;
}

export const WorkbenchView: React.FC<WorkbenchViewProps> = ({
  constraints,
  eligible,
  disqualified,
  ignoredSupersededCount,
  ignoredDraftCount,
  onUpdateConstraints,
  onOpenAssistantForSku,
  onJumpToCitation,
  onProceedToSignOff,
}) => {
  const [resultsTab, setResultsTab] = useState<'ELIGIBLE' | 'DISQUALIFIED'>(
    'ELIGIBLE'
  );
  const [activePresetId, setActivePresetId] = useState<string>(
    'scenario-2-thermal-boundary'
  );

  const toggleCertification = (cert: string) => {
    setActivePresetId('custom');
    const exists = constraints.requiredCertifications.includes(cert);
    const nextCerts = exists
      ? constraints.requiredCertifications.filter((c) => c !== cert)
      : [...constraints.requiredCertifications, cert];
    onUpdateConstraints({
      ...constraints,
      requiredCertifications: nextCerts,
    });
  };

  const handleApplyPreset = (
    presetId: string,
    presetConstraints: SpecFilterConstraints
  ) => {
    setActivePresetId(presetId);
    onUpdateConstraints(presetConstraints);
    if (presetId === 'scenario-4-impossible') {
      setResultsTab('DISQUALIFIED');
    } else {
      setResultsTab('ELIGIBLE');
    }
  };

  const handleClearFilters = () => {
    setActivePresetId('custom');
    onUpdateConstraints({
      outputVoltageV: null,
      minOutputPowerW: null,
      requiredInputVoltageV: null,
      targetAmbientTempC: null,
      minEfficiencyPct: null,
      maxWidthMm: null,
      requiredCertifications: [],
    });
    setResultsTab('ELIGIBLE');
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-6 space-y-6">
      {/* A. Top Full-Width Requirement Filter Card */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        {/* Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="w-5 h-5 text-blue-600" />
            <h1 className="text-lg font-semibold text-slate-900">
              Customer Requirement Filters
            </h1>
          </div>

          <button
            type="button"
            onClick={handleClearFilters}
            className="px-3.5 py-2 text-sm bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            <span>Reset All Filters</span>
          </button>
        </div>

        {/* Quick Test Scenarios Row */}
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2.5">
            Quick Test Scenarios
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {CUSTOMER_SCENARIO_PRESETS.map((preset) => {
              const isSelected = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() =>
                    handleApplyPreset(preset.id, preset.constraints)
                  }
                  className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-600 ring-1 ring-blue-600/20'
                      : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900 leading-snug">
                      {preset.title}
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${
                        preset.id === 'scenario-4-impossible'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : preset.id === 'scenario-2-thermal-boundary'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {preset.tag}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 leading-normal">
                    {preset.subtitle}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Clean Input Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 pt-2 border-t border-slate-100">
          {/* 1. Output Voltage */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Output Voltage
            </label>
            <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              {[
                { label: 'Any', value: null },
                { label: '12V', value: 12 },
                { label: '24V', value: 24 },
                { label: '48V', value: 48 },
              ].map((opt) => {
                const active = constraints.outputVoltageV === opt.value;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => {
                      setActivePresetId('custom');
                      onUpdateConstraints({
                        ...constraints,
                        outputVoltageV: opt.value,
                      });
                    }}
                    className={`py-1.5 px-1.5 text-xs font-mono tabular-nums rounded-md transition-colors cursor-pointer ${
                      active
                        ? 'bg-blue-600 text-white font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Min Output Power (W) */}
          <div>
            <label
              htmlFor="filter-min-power"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Min Output Power (W)
            </label>
            <input
              id="filter-min-power"
              type="number"
              step="5"
              placeholder="e.g. 75"
              value={constraints.minOutputPowerW ?? ''}
              onChange={(e) => {
                setActivePresetId('custom');
                const val =
                  e.target.value === '' ? null : parseFloat(e.target.value);
                onUpdateConstraints({ ...constraints, minOutputPowerW: val });
              }}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* 3. Input Supply (V AC) */}
          <div>
            <label
              htmlFor="filter-input-ac"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Input Supply (V AC)
            </label>
            <input
              id="filter-input-ac"
              type="number"
              step="10"
              placeholder="e.g. 230"
              value={constraints.requiredInputVoltageV ?? ''}
              onChange={(e) => {
                setActivePresetId('custom');
                const val =
                  e.target.value === '' ? null : parseFloat(e.target.value);
                onUpdateConstraints({
                  ...constraints,
                  requiredInputVoltageV: val,
                });
              }}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* 4. Ambient Temp (°C) */}
          <div>
            <label
              htmlFor="filter-ambient-temp"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Ambient Temp (°C)
            </label>
            <input
              id="filter-ambient-temp"
              type="number"
              step="5"
              placeholder="e.g. 50"
              value={constraints.targetAmbientTempC ?? ''}
              onChange={(e) => {
                setActivePresetId('custom');
                const val =
                  e.target.value === '' ? null : parseFloat(e.target.value);
                onUpdateConstraints({
                  ...constraints,
                  targetAmbientTempC: val,
                });
              }}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* 5. Max Width (mm) */}
          <div>
            <label
              htmlFor="filter-max-width"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Max Width (mm)
            </label>
            <input
              id="filter-max-width"
              type="number"
              step="5"
              placeholder="e.g. 60"
              value={constraints.maxWidthMm ?? ''}
              onChange={(e) => {
                setActivePresetId('custom');
                const val =
                  e.target.value === '' ? null : parseFloat(e.target.value);
                onUpdateConstraints({ ...constraints, maxWidthMm: val });
              }}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* 6. Required Certifications */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Required Certifications
            </label>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_CERTIFICATIONS.map((cert) => {
                const selected =
                  constraints.requiredCertifications.includes(cert);
                return (
                  <button
                    key={cert}
                    type="button"
                    onClick={() => toggleCertification(cert)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                      selected
                        ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {cert}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* B. Main Results Area Below Filters */}
      <section className="space-y-5">
        {/* Results Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl px-5 py-3.5 shadow-sm">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setResultsTab('ELIGIBLE')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                resultsTab === 'ELIGIBLE'
                  ? 'bg-white text-emerald-700 shadow-xs font-semibold border border-emerald-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Eligible Products ({eligible.length})
            </button>
            <button
              type="button"
              onClick={() => setResultsTab('DISQUALIFIED')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                resultsTab === 'DISQUALIFIED'
                  ? 'bg-white text-rose-700 shadow-xs font-semibold border border-rose-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Disqualified Products ({disqualified.length})
            </button>
          </div>

          <div className="text-sm text-slate-600">
            Automatically excludes{' '}
            <strong className="font-semibold text-slate-900">
              {ignoredSupersededCount} Superseded
            </strong>{' '}
            and{' '}
            <strong className="font-semibold text-slate-900">
              {ignoredDraftCount} Draft
            </strong>{' '}
            revision from selection.
          </div>
        </div>

        {/* Eligible Products View */}
        {resultsTab === 'ELIGIBLE' ? (
          eligible.length === 0 ? (
            <div className="bg-white border border-rose-200 rounded-xl p-8 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-semibold text-slate-900">
                  No Approved Products Match These Requirements
                </h2>
                <p className="text-sm text-slate-600 max-w-lg mx-auto">
                  Every approved product in the catalog exceeded at least one of
                  your required electrical, thermal, or mechanical limits.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResultsTab('DISQUALIFIED')}
                  className="px-4 py-2.5 text-sm font-medium bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
                >
                  View {disqualified.length} Disqualified Product Reasons
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleApplyPreset(
                      CUSTOMER_SCENARIO_PRESETS[0].id,
                      CUSTOMER_SCENARIO_PRESETS[0].constraints
                    )
                  }
                  className="px-4 py-2.5 text-sm font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                >
                  Load Standard 24V / 75W Scenario
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {eligible.map(({ revision, advisoryWarnings }) => {
                const s = revision.specs;
                return (
                  <div
                    key={revision.id}
                    className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Top */}
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl font-bold text-slate-900 font-mono tabular-nums">
                              {revision.modelCode}
                            </span>
                            <span className="text-sm font-medium text-slate-500">
                              {revision.manufacturer}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mt-0.5">
                            {revision.series}
                          </p>
                        </div>

                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approved • Rev {revision.revision}</span>
                        </span>
                      </div>

                      {/* 4-Metric Key Spec Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 p-3.5 bg-slate-50 rounded-lg border border-slate-200/80">
                        <div>
                          <div className="text-xs text-slate-500 font-medium">
                            Output
                          </div>
                          <div className="text-sm font-semibold text-slate-900 font-mono tabular-nums mt-0.5">
                            {s.outputVoltageV}V DC / {s.outputCurrentA}A
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-slate-500 font-medium">
                            Power
                          </div>
                          <div className="text-sm font-semibold text-slate-900 font-mono tabular-nums mt-0.5">
                            {s.outputPowerW} W
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-slate-500 font-medium">
                            Efficiency
                          </div>
                          <div className="text-sm font-semibold text-slate-900 font-mono tabular-nums mt-0.5">
                            {s.efficiencyPct.toFixed(1)}%
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-slate-500 font-medium">
                            Max Temp
                          </div>
                          <div className="text-sm font-semibold text-slate-900 font-mono tabular-nums mt-0.5">
                            {s.operatingTempMaxC}°C
                          </div>
                          <div className="text-xs text-slate-500 font-mono tabular-nums">
                            Full load ≤ {s.fullLoadMaxTempC}°C
                          </div>
                        </div>
                      </div>

                      {/* Secondary Spec Line */}
                      <div className="text-sm text-slate-600 mb-4 leading-relaxed">
                        <span>
                          <strong className="font-medium text-slate-800">
                            Input:
                          </strong>{' '}
                          <span className="font-mono tabular-nums">
                            {s.inputVoltageMinV}–{s.inputVoltageMaxV}V AC
                          </span>
                        </span>
                        <span className="mx-2 text-slate-300">•</span>
                        <span>
                          <strong className="font-medium text-slate-800">
                            Width:
                          </strong>{' '}
                          <span className="font-mono tabular-nums">
                            {s.widthMm} mm
                          </span>
                        </span>
                        <span className="mx-2 text-slate-300">•</span>
                        <span>
                          <strong className="font-medium text-slate-800">
                            Certs:
                          </strong>{' '}
                          <span className="font-mono">
                            {s.certifications.join(', ')}
                          </span>
                        </span>
                      </div>

                      {/* Thermal Derating Advisory (If triggered) */}
                      {advisoryWarnings.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 mb-4 text-sm text-amber-900 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 font-semibold text-amber-900">
                              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                              <span>Thermal Derating Advisory</span>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                onJumpToCitation(
                                  {
                                    modelCode: revision.modelCode,
                                    revision: revision.revision,
                                    page: s.deratingPage,
                                  },
                                  'Derate linearly'
                                )
                              }
                              className="text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200/80 border border-amber-300 px-2.5 py-1 rounded-md transition-colors cursor-pointer shrink-0"
                            >
                              [Verify on Page {s.deratingPage} &rarr;]
                            </button>
                          </div>
                          {advisoryWarnings.map((warn, wIdx) => (
                            <p key={wIdx} className="text-sm text-amber-800">
                              {warn}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Card Footer Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() =>
                          onOpenAssistantForSku(revision.id, s.deratingPage)
                        }
                        className="px-4 py-2.5 text-sm bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium rounded-lg inline-flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <FileSearch className="w-4 h-4 text-blue-600" />
                        <span>Ask AI &amp; Inspect Datasheet</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onProceedToSignOff(revision.id)}
                        className="px-4 py-2.5 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-xs inline-flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <span>Select for Sign-Off</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* Disqualified Products View */
          <div className="space-y-3">
            {disqualified.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-600 shadow-sm">
                All {eligible.length} approved products currently satisfy your
                active filter requirements.
              </div>
            ) : (
              disqualified.map(({ revision, failedReasons }) => (
                <div
                  key={revision.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      <span className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                        {revision.modelCode}
                      </span>
                      <span className="text-sm text-slate-600">
                        Rev {revision.revision} • {revision.series}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {failedReasons.map((reason, rIdx) => (
                        <span
                          key={rIdx}
                          className="px-3 py-1 text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 rounded-lg"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenAssistantForSku(revision.id, 2)}
                      className="px-3.5 py-2 text-sm bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium rounded-lg transition-colors cursor-pointer"
                    >
                      Inspect Datasheet
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
};
