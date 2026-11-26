import React from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Compass,
  Gauge,
  Layers,
  Thermometer,
  Wind,
} from 'lucide-react';
import type { TelemetryData } from '../types';

interface TelemetryBannerProps {
  telemetry: TelemetryData;
}

export const TelemetryBanner: React.FC<TelemetryBannerProps> = ({ telemetry }) => {
  const { current, cpcb, stationName, locality } = telemetry;
  const isTrapped = current.isTrappedSurfaceSmog;

  return (
    <section
      aria-label="Live Telemetry and Indian Air Quality Index"
      className="w-full bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] p-5 sm:p-6 shadow-sm transition-colors duration-200"
    >
      {/* Header Station Info & GRAP Stage Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--border-subtle)] gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">
              {stationName}
            </h2>
            <span className="text-xs px-2 py-0.5 rounded font-mono bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
              {locality}
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Geographic Coordinates: {telemetry.latitude.toFixed(4)}°N, {telemetry.longitude.toFixed(4)}°E
          </p>
        </div>

        {/* CAQM GRAP Stage Pill */}
        <div className="flex items-center gap-2">
          {cpcb.grapStage !== 'None' ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 animate-pulse">
              <AlertOctagon className="w-4 h-4 text-rose-600" />
              <span>CAQM {cpcb.grapStage} IN FORCE</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              <span>Standard Baseline (No GRAP Restriction)</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: AQI Gauge + Pollutants + Atmospheric Inversion */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-5">
        {/* 1. Indian CPCB AQI Gauge Card (4 cols) */}
        <div className="md:col-span-4 rounded-xl bg-[var(--bg-secondary)]/50 border border-[var(--border-subtle)] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              Indian NAQI Index
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${cpcb.badgeBg} ${cpcb.badgeText}`}
            >
              {cpcb.category.toUpperCase()}
            </span>
          </div>

          <div className="my-3 flex items-baseline gap-3">
            <span
              className="text-5xl sm:text-6xl font-black tracking-tight"
              style={{ color: cpcb.colorHex }}
            >
              {cpcb.aqi}
            </span>
            <div className="text-xs text-[var(--text-secondary)] leading-snug">
              <span className="font-semibold text-[var(--text-primary)] block">
                Primary Driver: {cpcb.dominantPollutant}
              </span>
              <span>Sub-index: {cpcb.subIndices[cpcb.dominantPollutant === 'PM2.5' ? 'pm25' : cpcb.dominantPollutant === 'PM10' ? 'pm10' : 'no2']}</span>
            </div>
          </div>

          {/* Breakpoint Bar */}
          <div className="space-y-1">
            <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
              <div className="h-full bg-emerald-500" style={{ width: '10%' }} title="Good (0-50)" />
              <div className="h-full bg-lime-500" style={{ width: '10%' }} title="Satisfactory (51-100)" />
              <div className="h-full bg-amber-500" style={{ width: '20%' }} title="Moderate (101-200)" />
              <div className="h-full bg-orange-500" style={{ width: '20%' }} title="Poor (201-300)" />
              <div className="h-full bg-rose-500" style={{ width: '20%' }} title="Very Poor (301-400)" />
              <div className="h-full bg-red-950" style={{ width: '20%' }} title="Severe (401-500)" />
            </div>
            <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-mono">
              <span>0</span>
              <span>100</span>
              <span>200</span>
              <span>300</span>
              <span>400</span>
              <span>500</span>
            </div>
          </div>
        </div>

        {/* 2. Pollutant Breakdown Cards (4 cols) */}
        <div className="md:col-span-4 grid grid-cols-2 gap-3">
          {/* PM2.5 */}
          <div className="rounded-xl bg-[var(--bg-secondary)]/50 border border-[var(--border-subtle)] p-3 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-[var(--text-primary)]">PM2.5</span>
              <span className="text-[10px] text-[var(--text-muted)] font-mono">CPCB: 60</span>
            </div>
            <div className="my-1">
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                {current.pm25} <span className="text-xs font-normal text-[var(--text-muted)]">µg/m³</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                {Math.round((current.pm25 / 60) * 10) / 10}x CPCB 24h limit
              </p>
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">Sub-index: {cpcb.subIndices.pm25}</div>
          </div>

          {/* PM10 */}
          <div className="rounded-xl bg-[var(--bg-secondary)]/50 border border-[var(--border-subtle)] p-3 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-[var(--text-primary)]">PM10</span>
              <span className="text-[10px] text-[var(--text-muted)] font-mono">CPCB: 100</span>
            </div>
            <div className="my-1">
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {current.pm10} <span className="text-xs font-normal text-[var(--text-muted)]">µg/m³</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                {Math.round((current.pm10 / 100) * 10) / 10}x CPCB 24h limit
              </p>
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">Sub-index: {cpcb.subIndices.pm10}</div>
          </div>

          {/* NO2 */}
          <div className="rounded-xl bg-[var(--bg-secondary)]/50 border border-[var(--border-subtle)] p-3 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-[var(--text-primary)]">NO2 (Traffic)</span>
              <span className="text-[10px] text-[var(--text-muted)] font-mono">CPCB: 80</span>
            </div>
            <div className="my-1">
              <div className="text-2xl font-black text-[var(--text-primary)]">
                {current.no2} <span className="text-xs font-normal text-[var(--text-muted)]">µg/m³</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                {current.no2 > 80 ? 'Elevated combustion' : 'Within threshold'}
              </p>
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">Sub-index: {cpcb.subIndices.no2}</div>
          </div>

          {/* Temperature & Humidity */}
          <div className="rounded-xl bg-[var(--bg-secondary)]/50 border border-[var(--border-subtle)] p-3 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5 text-teal-600" /> Weather
              </span>
            </div>
            <div className="my-1">
              <div className="text-xl font-bold text-[var(--text-primary)]">
                {current.temperature}°C
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Humidity: {current.relativeHumidity}%
              </p>
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">Wind: {current.windSpeed} km/h</div>
          </div>
        </div>

        {/* 3. Inversion Layer & Boundary Height Card (4 cols) */}
        <div className="md:col-span-4 rounded-xl bg-[var(--bg-secondary)]/50 border border-[var(--border-subtle)] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-500" />
              Atmospheric Inversion
            </span>
            {isTrapped ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                <AlertTriangle className="w-3 h-3 text-rose-600" />
                TRAPPED SURFACE SMOG
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                Adequate Dispersion
              </span>
            )}
          </div>

          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[var(--text-primary)]">
                {current.boundaryLayerHeight}
              </span>
              <span className="text-sm font-semibold text-[var(--text-muted)]">
                meters (Mixing Lid)
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
              {isTrapped
                ? 'Thermal inversion lid < 450m seals pollutants in the lowest urban troposphere. Surface ventilation is hazardous.'
                : 'Planetary mixing depth exceeds 450m, enabling atmospheric dilution and particulate dispersion.'}
            </p>
          </div>

          <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <Wind className="w-3.5 h-3.5 text-teal-600" /> Wind: {current.windSpeed} km/h
            </span>
            <span className="flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-indigo-500" /> Vent Window: {telemetry.bestVentilationWindow.startHour}:00 - {telemetry.bestVentilationWindow.endHour}:00
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
