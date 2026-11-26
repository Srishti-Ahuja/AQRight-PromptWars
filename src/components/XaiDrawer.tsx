import React, { useEffect, useRef } from 'react';
import {
  BarChart3,
  BookOpen,
  Cigarette,
  Cpu,
  Scale,
  ShieldCheck,
  TrendingDown,
  X,
} from 'lucide-react';
import type { XAIRecommendation } from '../types';

interface XaiDrawerProps {
  recommendation: XAIRecommendation | null;
  onClose: () => void;
}

export const XaiDrawer: React.FC<XaiDrawerProps> = ({
  recommendation,
  onClose,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap & Escape key listener
  useEffect(() => {
    if (!recommendation) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Focus close button on open
    setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Trap focus inside drawer
      if (e.key === 'Tab' && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusableElements[0] as HTMLElement;
        const last = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey && document.activeElement === first) {
          last?.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first?.focus();
          e.preventDefault();
        }
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [recommendation, onClose]);


  if (!recommendation) return null;

  const { counterfactual, scientificGrounding, shapAttributions } = recommendation;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="xai-drawer-title"
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div
          ref={drawerRef}
          className="w-screen max-w-2xl bg-[var(--surface-elevated)] border-l border-[var(--border-strong)] shadow-2xl flex flex-col justify-between overflow-y-auto"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-[var(--border-subtle)] bg-[var(--surface-card)] sticky top-0 z-10 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 uppercase tracking-wider">
                  XAI Decision Inspector
                </span>
                <span className="text-xs font-semibold text-[var(--text-muted)]">
                  Target: {recommendation.targetName}
                </span>
              </div>
              <h2
                id="xai-drawer-title"
                className="text-lg sm:text-xl font-black text-[var(--text-primary)] mt-1.5"
              >
                {recommendation.title}
              </h2>
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Close Inspector"
              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] border border-[var(--border-subtle)] focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body: 4 Core Modules */}
          <div className="p-5 sm:p-6 space-y-6 flex-1">
            {/* 1. Decision Summary & Confidence Score */}
            <section className="rounded-xl p-4 bg-[var(--bg-secondary)]/50 border border-[var(--border-subtle)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  1. Model Reasoning & Confidence
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                  {Math.round(recommendation.confidenceScore * 100)}% Decision Confidence
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed font-medium">
                {recommendation.decisionSummary}
              </p>
              <div className="text-xs text-[var(--text-secondary)] italic bg-[var(--bg-primary)] p-2.5 rounded-lg border border-[var(--border-subtle)]">
                "{recommendation.personalizedInstruction}"
              </div>
            </section>

            {/* 2. Feature Attribution Weights (SHAP-Style Horizontal Bar Chart) */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-indigo-500" />
                  2. Feature Attribution Weights (SHAP Breakdown)
                </h3>
                <span className="text-[11px] text-[var(--text-muted)]">Sum = 100% Contribution</span>
              </div>

              <div className="space-y-3">
                {shapAttributions.map((attr, idx) => {
                  const isAmplifying = attr.direction === 'amplifying';
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[var(--bg-secondary)]/30 border border-[var(--border-subtle)] space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[var(--text-primary)]">
                          {attr.featureName}
                        </span>
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                            isAmplifying
                              ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400'
                              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {isAmplifying ? '+' : '-'}
                          {attr.weightPercent}% {isAmplifying ? 'Amplifier' : 'Mitigator'}
                        </span>
                      </div>

                      {/* Bar Visualization */}
                      <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isAmplifying ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(5, attr.weightPercent))}%` }}
                        />
                      </div>

                      <p className="text-[11px] text-[var(--text-secondary)]">{attr.description}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 3. Counterfactual Impact Comparison (Baseline vs. Action) */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-amber-500" />
                  3. Counterfactual Exposure Model (Status Quo vs. AQRight)
                </h3>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  -{counterfactual.exposureReductionPercent}% Reduction
                </span>
              </div>

              {/* Side-by-Side Comparison Table */}
              <div className="grid grid-cols-2 gap-3">
                {/* Status Quo */}
                <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-2">
                  <div className="text-[11px] font-extrabold uppercase text-rose-700 dark:text-rose-400">
                    Status Quo Routine
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                      {counterfactual.baselineInhaledDoseUgd} µg
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)]">Inhaled PM2.5 / day</div>
                  </div>
                  <div className="pt-2 border-t border-rose-500/20 flex items-center gap-1.5 text-xs font-semibold text-rose-800 dark:text-rose-300">
                    <Cigarette className="w-4 h-4 text-rose-600" />
                    <span>~{counterfactual.baselineCigaretteEquiv} Cigs Inhaled</span>
                  </div>
                </div>

                {/* AQRight Action */}
                <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
                  <div className="text-[11px] font-extrabold uppercase text-emerald-700 dark:text-emerald-400">
                    With AQRight Protocol
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {counterfactual.actionInhaledDoseUgd} µg
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)]">Inhaled PM2.5 / day</div>
                  </div>
                  <div className="pt-2 border-t border-emerald-500/20 flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>~{counterfactual.actionCigaretteEquiv} Cigs Equivalent</span>
                  </div>
                </div>
              </div>

              {/* Quantified Net Savings Pill Banner */}
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs text-emerald-950 dark:text-emerald-200">
                <span className="font-bold flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-emerald-600" />
                  Net Physiological Avoidance:
                </span>
                <span className="font-extrabold">
                  {counterfactual.doseAvoidedUgd} µg avoided ({counterfactual.cigarettesAvoided} Cigarette
                  Equivalents Saved)
                </span>
              </div>
            </section>

            {/* 4. Scientific & Policy Grounding */}
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-teal-600" />
                4. Atmospheric & Physiological Science Grounding
              </h3>

              <div className="p-4 rounded-xl bg-[var(--bg-secondary)]/50 border border-[var(--border-subtle)] space-y-2.5 text-xs leading-relaxed">
                <div>
                  <span className="font-bold text-[var(--text-primary)] block">Physical Mechanism:</span>
                  <span className="text-[var(--text-secondary)]">{scientificGrounding.mechanism}</span>
                </div>

                <div>
                  <span className="font-bold text-[var(--text-primary)] block">Physiological Impact:</span>
                  <span className="text-[var(--text-secondary)]">
                    {scientificGrounding.physiologicalDetail}
                  </span>
                </div>

                <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1 text-[11px]">
                  <div className="text-teal-700 dark:text-teal-400 font-medium">
                    🏛️ {scientificGrounding.cpcbStandardCitation}
                  </div>
                  <div className="text-indigo-700 dark:text-indigo-400 font-medium">
                    🌐 {scientificGrounding.whoStandardCitation}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Footer Action */}
          <div className="p-4 sm:p-5 border-t border-[var(--border-subtle)] bg-[var(--surface-card)] flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">
              Powered by CPCB NAQI & Berkeley Earth Inhalation Modeling
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-colors"
            >
              Done Inspecting
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
