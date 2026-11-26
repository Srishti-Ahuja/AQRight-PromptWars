import React, { useState } from 'react';
import {
  ArrowRight,
  BrainCircuit,
  TrendingDown,
} from 'lucide-react';
import type { XAIRecommendation } from '../types';

interface ActionFeedProps {
  recommendations: XAIRecommendation[];
  onSelectRecommendation: (rec: XAIRecommendation) => void;
  selectedRecommendationId?: string;
}

type FilterTab = 'all' | 'family' | 'indoor_hacks' | 'commute_swaps';

export const ActionFeed: React.FC<ActionFeedProps> = ({
  recommendations,
  onSelectRecommendation,
  selectedRecommendationId,
}) => {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const filteredRecommendations = recommendations.filter((rec) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'indoor_hacks') return rec.category === 'indoor_hacks';
    if (activeTab === 'commute_swaps') return rec.category === 'commute_swaps' || rec.category === 'routine_timing';
    if (activeTab === 'family') return rec.targetId !== 'household';
    return true;
  });

  return (
    <section
      aria-label="Hyper-Personalized Action Feed"
      className="w-full bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] p-5 sm:p-6 shadow-sm transition-colors duration-200"
    >
      {/* Header & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--border-subtle)] gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              Personalized Action Feed & XAI Decisions
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
              {recommendations.length} Active Protocols
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Zero generic advice: Every card computes live telemetry against your specific floor elevation and family members.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'All Actions' },
            { id: 'family', label: 'By Family Member' },
            { id: 'indoor_hacks', label: 'Indoor Hacks' },
            { id: 'commute_swaps', label: 'Commute & Routines' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as FilterTab)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[var(--surface-elevated)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cards Feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        {filteredRecommendations.map((rec) => {
          const isSelected = selectedRecommendationId === rec.id;
          const isCritical = rec.priority === 'critical';
          const isHigh = rec.priority === 'high';

          return (
            <button
              key={rec.id}
              type="button"
              onClick={() => onSelectRecommendation(rec)}
              className={`w-full text-left rounded-xl border p-4 flex flex-col justify-between transition-all group focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                isSelected
                  ? 'border-teal-500 bg-teal-500/10 shadow-md ring-1 ring-teal-500'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30 hover:border-teal-500/50 hover:bg-[var(--bg-secondary)]/60'
              }`}
            >
              <div>
                {/* Priority & Target Badges */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-subtle)]">
                      {rec.targetName}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                        isCritical
                          ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30'
                          : isHigh
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                          : 'bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30'
                      }`}
                    >
                      {rec.priority}
                    </span>
                  </div>

                  {/* Impact Pill */}
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                    <TrendingDown className="w-3 h-3 text-emerald-600" />
                    {rec.impactPill}
                  </span>
                </div>

                {/* Title */}
                <h4 className="font-bold text-sm sm:text-base text-[var(--text-primary)] group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                  {rec.title}
                </h4>

                {/* Personalized Instruction */}
                <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed line-clamp-3">
                  {rec.personalizedInstruction}
                </p>
              </div>

              {/* Bottom Affordance: Inspect XAI Logic */}
              <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-[var(--text-muted)]">
                  <span className="font-semibold text-teal-600 dark:text-teal-400">
                    {Math.round(rec.confidenceScore * 100)}% Confidence
                  </span>
                  <span>•</span>
                  <span>{rec.shapAttributions.length} SHAP Factors</span>
                </div>

                <div className="inline-flex items-center gap-1 font-bold text-teal-600 dark:text-teal-400 group-hover:translate-x-0.5 transition-transform">
                  <span>Inspect XAI Logic</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {filteredRecommendations.length === 0 && (
        <div className="text-center py-12 text-[var(--text-muted)] text-sm">
          No recommendations match this filter tab.
        </div>
      )}
    </section>
  );
};
