import React, { useMemo } from 'react';
import {
  AlertCircle,
  Car,
  Compass,
  Flame,
  HelpCircle,
  Info,
  Sun,
  Tornado,
  Wind,
} from 'lucide-react';
import type { SourceAttributionReport, SourceDriverMetric, TelemetryData } from '../types';
import { calculateSourceAttribution } from '../lib/source-attribution';

interface SourceAttributionCardProps {
  telemetry: TelemetryData;
  onInspectDriver?: (metric: SourceDriverMetric) => void;
}

export const SourceAttributionCard: React.FC<SourceAttributionCardProps> = ({
  telemetry,
  onInspectDriver,
}) => {
  const report: SourceAttributionReport = useMemo(() => {
    return calculateSourceAttribution(telemetry);
  }, [telemetry]);

  const getDriverIcon = (iconName: string) => {
    switch (iconName) {
      case 'Flame':
        return <Flame className="w-5 h-5 text-orange-500" />;
      case 'Tornado':
        return <Tornado className="w-5 h-5 text-amber-500" />;
      case 'Car':
        return <Car className="w-5 h-5 text-blue-500" />;
      case 'Sun':
        return <Sun className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-teal-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30';
      case 'moderate':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30';
      default:
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
    }
  };

  const getBarColor = (driverType: string) => {
    switch (driverType) {
      case 'biomass_inversion':
        return 'bg-gradient-to-r from-orange-500 to-rose-600';
      case 'surface_road_dust':
        return 'bg-gradient-to-r from-amber-500 to-yellow-600';
      case 'vehicular_exhaust':
        return 'bg-gradient-to-r from-blue-500 to-indigo-600';
      case 'photochemical_smog':
        return 'bg-gradient-to-r from-yellow-400 to-amber-500';
      default:
        return 'bg-teal-500';
    }
  };

  return (
    <section
      aria-label="Source Attribution Breakdown"
      className="w-full bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] p-5 sm:p-6 shadow-sm transition-colors duration-200 space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                Why is AQI High Today?
              </h3>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                Live Source Attribution
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Deterministic multi-pollutant ratio diagnostic & boundary-layer meteorological breakdown
            </p>
          </div>
        </div>

        {/* Meteorological Metrics Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
            <Wind className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>
              {report.meteorology.windSpeedKmh} km/h from {report.meteorology.windCardinal}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
            <span className="font-bold text-teal-600 dark:text-teal-400">BLH:</span>
            <span>
              {report.meteorology.mixingLayerM}m{' '}
              {report.meteorology.isInversionTrapped ? '(Trapped Inversion)' : '(Dispersing)'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
            <span className="font-bold text-teal-600 dark:text-teal-400">Ratio:</span>
            <span>{report.meteorology.pm25ToPm10Ratio.toFixed(2)} PM2.5/PM10</span>
          </div>
        </div>
      </div>

      {/* Causal Diagnostic Summary Box */}
      <div className="p-4 rounded-xl bg-teal-500/5 dark:bg-teal-950/20 border border-teal-500/20 space-y-2">
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] leading-relaxed">
              {report.causalSummary}
            </p>
            <p className="text-xs text-teal-700 dark:text-teal-300 font-medium">
              <span className="font-bold">Recommended Immediate Countermeasure:</span>{' '}
              {report.actionImplication}
            </p>
          </div>
        </div>
      </div>

      {/* 4 Source Attribution Driver Contribution Bars */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
          <span>Emission Source Mechanism</span>
          <span>Relative Contribution %</span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {report.drivers.map((driver) => (
            <div
              key={driver.driverType}
              className="group p-3.5 rounded-xl bg-[var(--bg-secondary)]/50 hover:bg-[var(--bg-secondary)] border border-[var(--border-subtle)] transition-all duration-150 space-y-2.5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-lg bg-[var(--surface-card)] border border-[var(--border-subtle)]">
                    {getDriverIcon(driver.iconName)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate">
                        {driver.label}
                      </h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.2 rounded-full border uppercase tracking-wider ${getSeverityBadge(
                          driver.severity
                        )}`}
                      >
                        {driver.severity}
                      </span>
                    </div>
                    <span className="text-[11px] text-[var(--text-muted)] font-mono">
                      {driver.metricsSnapshot}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-base sm:text-lg font-black text-[var(--text-primary)]">
                    {driver.contributionPercent.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Relative Progress Bar */}
              <div className="w-full h-2 rounded-full bg-[var(--border-subtle)] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getBarColor(
                    driver.driverType
                  )}`}
                  style={{ width: `${Math.max(4, driver.contributionPercent)}%` }}
                />
              </div>

              {/* Rationale & Action Hook */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[var(--text-secondary)] pt-0.5">
                <p className="leading-relaxed flex-1">{driver.rationale}</p>
                {onInspectDriver && (
                  <button
                    type="button"
                    onClick={() => onInspectDriver(driver)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline shrink-0"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    Inspect Rule
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
