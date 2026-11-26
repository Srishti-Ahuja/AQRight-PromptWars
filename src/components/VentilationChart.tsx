import React, { useMemo, useState } from 'react';
import { Clock, Info, ShieldCheck, Sun } from 'lucide-react';
import type { HourlyTelemetryPoint, TelemetryData } from '../types';

interface VentilationChartProps {
  telemetry: TelemetryData;
}

export const VentilationChart: React.FC<VentilationChartProps> = ({ telemetry }) => {
  const { hourly, bestVentilationWindow } = telemetry;
  const [hoveredPoint, setHoveredPoint] = useState<HourlyTelemetryPoint | null>(null);

  // SVG Chart Geometry
  const width = 800;
  const height = 240;
  const padding = { top: 30, right: 40, bottom: 35, left: 50 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Max values for scaling
  const maxPm25 = useMemo(() => {
    const maxVal = Math.max(...hourly.map((h) => h.pm25), 300);
    return Math.ceil(maxVal / 50) * 50;
  }, [hourly]);

  const maxBlh = useMemo(() => {
    const maxVal = Math.max(...hourly.map((h) => h.boundaryLayerHeight), 1200);
    return Math.ceil(maxVal / 200) * 200;
  }, [hourly]);

  // Points computation
  const { pmPoints, blhPoints, coordinates } = useMemo(() => {
    if (hourly.length === 0) return { pmPoints: '', blhPoints: '', coordinates: [] };

    const stepX = chartWidth / (hourly.length - 1);
    const coords: Array<{ x: number; yPm: number; yBlh: number; point: HourlyTelemetryPoint }> = [];

    const pmPath: string[] = [];
    const blhPath: string[] = [];

    hourly.forEach((h, i) => {
      const x = padding.left + i * stepX;
      const yPm = padding.top + chartHeight - (h.pm25 / maxPm25) * chartHeight;
      const yBlh = padding.top + chartHeight - (h.boundaryLayerHeight / maxBlh) * chartHeight;

      coords.push({ x, yPm, yBlh, point: h });

      if (i === 0) {
        pmPath.push(`M ${x} ${yPm}`);
        blhPath.push(`M ${x} ${yBlh}`);
      } else {
        pmPath.push(`L ${x} ${yPm}`);
        blhPath.push(`L ${x} ${yBlh}`);
      }
    });

    return {
      pmPoints: pmPath.join(' '),
      blhPoints: blhPath.join(' '),
      coordinates: coords,
    };
  }, [hourly, chartWidth, chartHeight, maxPm25, maxBlh, padding.left, padding.top]);

  // Safe window X bounds
  const windowStartIdx = hourly.findIndex((h) => h.hour === bestVentilationWindow.startHour);
  const windowEndIdx = hourly.findIndex((h) => h.hour === bestVentilationWindow.endHour);

  const stepX = chartWidth / Math.max(1, hourly.length - 1);
  const startX = padding.left + (windowStartIdx !== -1 ? windowStartIdx : 12) * stepX;
  const endX = padding.left + (windowEndIdx !== -1 ? windowEndIdx : 15) * stepX;

  return (
    <section
      aria-label="24-Hour Clean Ventilation Window and Atmospheric Inversion Chart"
      className="w-full bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] p-5 sm:p-6 shadow-sm transition-colors duration-200"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[var(--border-subtle)] gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Sun className="w-5 h-5 text-amber-500" />
              24-Hour Diurnal Inversion & Clean Ventilation Window
            </h3>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              Golden Window: {bestVentilationWindow.startHour}:00 – {bestVentilationWindow.endHour}:00
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Compares surface PM2.5 aerosol trapping against atmospheric boundary layer mixing depth.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-rose-500 rounded-full" />
            <span className="text-[var(--text-secondary)]">PM2.5 (µg/m³)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-indigo-500 rounded-full" />
            <span className="text-[var(--text-secondary)]">Mixing Lid (m)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-teal-500/20 border border-teal-500/40 rounded-sm" />
            <span className="text-[var(--text-secondary)]">Safe Vent Window</span>
          </div>
        </div>
      </div>

      {/* Action Recommendation Banner */}
      <div className="mt-4 p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-start gap-3 text-xs text-teal-900 dark:text-teal-200">
        <Info className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <span className="font-bold mr-1">Aerodynamic Ventilation Guidance:</span>
          {bestVentilationWindow.recommendationText}
        </div>
      </div>

      {/* SVG Chart Container */}
      <div className="relative mt-4 w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none overflow-visible"
        >
          <defs>
            <linearGradient id="ventWindowGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="pmGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Golden Safe Ventilation Window Highlight Shading */}
          <rect
            x={startX}
            y={padding.top}
            width={Math.max(10, endX - startX)}
            height={chartHeight}
            fill="url(#ventWindowGradient)"
            stroke="#14b8a6"
            strokeDasharray="4 2"
            strokeWidth="1.5"
            rx="4"
          />

          {/* Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = padding.top + ratio * chartHeight;
            const pmVal = Math.round(maxPm25 * (1 - ratio));
            const blhVal = Math.round(maxBlh * (1 - ratio));
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800"
                  strokeDasharray="2 4"
                  strokeWidth="1"
                />
                {/* Left Y Axis (PM2.5) */}
                <text
                  x={padding.left - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[10px] fill-rose-600 dark:fill-rose-400 font-mono"
                >
                  {pmVal}
                </text>
                {/* Right Y Axis (BLH meters) */}
                <text
                  x={width - padding.right + 6}
                  y={y + 3}
                  textAnchor="start"
                  className="text-[10px] fill-indigo-600 dark:fill-indigo-400 font-mono"
                >
                  {blhVal}m
                </text>
              </g>
            );
          })}

          {/* 450m Inversion Hazard Threshold Line */}
          {(() => {
            const yInversion = padding.top + chartHeight - (450 / maxBlh) * chartHeight;
            return (
              <g>
                <line
                  x1={padding.left}
                  y1={yInversion}
                  x2={width - padding.right}
                  y2={yInversion}
                  stroke="#ef4444"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left + 8}
                  y={yInversion - 4}
                  className="text-[9px] fill-rose-600 dark:fill-rose-400 font-semibold uppercase tracking-wider"
                >
                  450m Surface Inversion Danger Threshold
                </text>
              </g>
            );
          })()}

          {/* Boundary Layer Height Curve (Indigo) */}
          <path
            d={blhPoints}
            fill="none"
            stroke="#6366f1"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* PM2.5 Curve (Rose) */}
          <path
            d={pmPoints}
            fill="none"
            stroke="#ef4444"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points & Hover Targets */}
          {coordinates.map((item, i) => (
            <g key={i}>
              <circle
                cx={item.x}
                cy={item.yPm}
                r="10"
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint(item.point)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
              <circle
                cx={item.x}
                cy={item.yPm}
                r={hoveredPoint?.hour === item.point.hour ? '5' : '3'}
                fill="#ef4444"
                stroke="#ffffff"
                strokeWidth="1.5"
                className="transition-all"
              />
              {item.point.hour % 3 === 0 && (
                <text
                  x={item.x}
                  y={height - 8}
                  textAnchor="middle"
                  className="text-[10px] fill-[var(--text-muted)] font-mono"
                >
                  {item.point.time}
                </text>
              )}
            </g>
          ))}
        </svg>

        {/* Hover Detail Tooltip Floating Card */}
        {hoveredPoint && (
          <div
            className="absolute top-2 right-4 z-10 p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-strong)] shadow-xl text-xs space-y-1.5 transition-all"
            style={{ minWidth: '190px' }}
          >
            <div className="flex items-center justify-between font-bold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-teal-600" /> {hoveredPoint.time}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                  hoveredPoint.boundaryLayerHeight < 450
                    ? 'bg-rose-500/15 text-rose-600'
                    : 'bg-emerald-500/15 text-emerald-600'
                }`}
              >
                {hoveredPoint.boundaryLayerHeight < 450 ? 'Smog Trapped' : 'Dispersing'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">PM2.5:</span>
              <span className="font-black text-rose-600 dark:text-rose-400">
                {hoveredPoint.pm25} µg/m³
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Mixing Layer:</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                {hoveredPoint.boundaryLayerHeight} meters
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Wind / Temp:</span>
              <span className="font-medium text-[var(--text-primary)]">
                {hoveredPoint.windSpeed} km/h • {hoveredPoint.temperature}°C
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
