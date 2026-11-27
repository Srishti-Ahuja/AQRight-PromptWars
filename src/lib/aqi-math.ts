import type { CPCBBreakdown, GrapStage, HourlyTelemetryPoint, NAQICategory } from '../types';

/**
 * Official Central Pollution Control Board (CPCB) National Air Quality Index (NAQI) Breakpoints
 * Formula:
 * Ip = [ (I_hi - I_lo) / (B_hi - B_lo) ] * (Cp - B_lo) + I_lo
 */

interface Breakpoint {
  bLo: number;
  bHi: number;
  iLo: number;
  iHi: number;
}

const PM25_BREAKPOINTS: Breakpoint[] = [
  { bLo: 0, bHi: 30, iLo: 0, iHi: 50 },        // Good
  { bLo: 31, bHi: 60, iLo: 51, iHi: 100 },     // Satisfactory
  { bLo: 61, bHi: 90, iLo: 101, iHi: 200 },    // Moderate
  { bLo: 91, bHi: 120, iLo: 201, iHi: 300 },   // Poor
  { bLo: 121, bHi: 250, iLo: 301, iHi: 400 },  // Very Poor
  { bLo: 251, bHi: 500, iLo: 401, iHi: 500 },  // Severe
];

const PM10_BREAKPOINTS: Breakpoint[] = [
  { bLo: 0, bHi: 50, iLo: 0, iHi: 50 },
  { bLo: 51, bHi: 100, iLo: 51, iHi: 100 },
  { bLo: 101, bHi: 250, iLo: 101, iHi: 200 },
  { bLo: 251, bHi: 350, iLo: 201, iHi: 300 },
  { bLo: 351, bHi: 430, iLo: 301, iHi: 400 },
  { bLo: 431, bHi: 600, iLo: 401, iHi: 500 },
];

const NO2_BREAKPOINTS: Breakpoint[] = [
  { bLo: 0, bHi: 40, iLo: 0, iHi: 50 },
  { bLo: 41, bHi: 80, iLo: 51, iHi: 100 },
  { bLo: 81, bHi: 180, iLo: 101, iHi: 200 },
  { bLo: 181, bHi: 280, iLo: 201, iHi: 300 },
  { bLo: 281, bHi: 400, iLo: 301, iHi: 400 },
  { bLo: 401, bHi: 600, iLo: 401, iHi: 500 },
];

function calculateSubIndex(concentration: number, breakpoints: Breakpoint[]): number {
  if (concentration <= 0) return 0;

  for (const bp of breakpoints) {
    if (concentration <= bp.bHi) {
      const sub = ((bp.iHi - bp.iLo) / (bp.bHi - bp.bLo)) * (concentration - bp.bLo) + bp.iLo;
      return Math.round(sub);
    }
  }

  // Beyond maximum breakpoint (capped at 500 or linear extrapolation)
  const last = breakpoints[breakpoints.length - 1];
  const extrapolated = ((last.iHi - last.iLo) / (last.bHi - last.bLo)) * (concentration - last.bLo) + last.iLo;
  return Math.min(500, Math.round(extrapolated));
}

export function getNAQICategory(aqi: number): {
  category: NAQICategory;
  colorHex: string;
  badgeBg: string;
  badgeText: string;
} {
  if (aqi <= 50) {
    return {
      category: 'Good',
      colorHex: '#16a34a',
      badgeBg: 'bg-emerald-500/15 border-emerald-500/30',
      badgeText: 'text-emerald-700 dark:text-emerald-400',
    };
  }
  if (aqi <= 100) {
    return {
      category: 'Satisfactory',
      colorHex: '#84cc16',
      badgeBg: 'bg-lime-500/15 border-lime-500/30',
      badgeText: 'text-lime-700 dark:text-lime-400',
    };
  }
  if (aqi <= 200) {
    return {
      category: 'Moderate',
      colorHex: '#eab308',
      badgeBg: 'bg-amber-500/15 border-amber-500/30',
      badgeText: 'text-amber-700 dark:text-amber-400',
    };
  }
  if (aqi <= 300) {
    return {
      category: 'Poor',
      colorHex: '#f97316',
      badgeBg: 'bg-orange-500/15 border-orange-500/30',
      badgeText: 'text-orange-700 dark:text-orange-400',
    };
  }
  if (aqi <= 400) {
    return {
      category: 'Very Poor',
      colorHex: '#ef4444',
      badgeBg: 'bg-rose-500/15 border-rose-500/30',
      badgeText: 'text-rose-700 dark:text-rose-400',
    };
  }
  return {
    category: 'Severe',
    colorHex: '#881337',
    badgeBg: 'bg-red-950/30 border-red-700/50',
    badgeText: 'text-red-600 dark:text-red-300',
  };
}

export function getGrapStage(aqi: number): GrapStage {
  if (aqi > 450) return 'Stage IV (Severe+)';
  if (aqi >= 401) return 'Stage III (Severe)';
  if (aqi >= 301) return 'Stage II (Very Poor)';
  if (aqi >= 201) return 'Stage I (Poor)';
  return 'None';
}

export function calculateCPCBBreakdown(pm25: number, pm10: number, no2: number): CPCBBreakdown {
  const pm25Sub = calculateSubIndex(pm25, PM25_BREAKPOINTS);
  const pm10Sub = calculateSubIndex(pm10, PM10_BREAKPOINTS);
  const no2Sub = calculateSubIndex(no2, NO2_BREAKPOINTS);

  let dominantPollutant: 'PM2.5' | 'PM10' | 'NO2' = 'PM2.5';
  let overallAqi = pm25Sub;

  if (pm10Sub > overallAqi) {
    overallAqi = pm10Sub;
    dominantPollutant = 'PM10';
  }
  if (no2Sub > overallAqi) {
    overallAqi = no2Sub;
    dominantPollutant = 'NO2';
  }

  const { category, colorHex, badgeBg, badgeText } = getNAQICategory(overallAqi);
  const grapStage = getGrapStage(overallAqi);

  return {
    aqi: overallAqi,
    category,
    grapStage,
    dominantPollutant,
    subIndices: {
      pm25: pm25Sub,
      pm10: pm10Sub,
      no2: no2Sub,
    },
    colorHex,
    badgeBg,
    badgeText,
  };
}

export function calculateBerkeleyCigarettes(
  pm25UgM3: number,
  hoursExposure: number = 24,
  activityMultiplier: number = 1.0
): number {
  if (pm25UgM3 <= 0 || hoursExposure <= 0) return 0;
  const rawCigs = (pm25UgM3 * (hoursExposure / 24) * activityMultiplier) / 22;
  return Math.round(rawCigs * 10) / 10;
}

export function calculateInhalationDose(
  pm25UgM3: number,
  durationHours: number,
  breathingRateM3H: number = 0.6,
  filterEfficiency: number = 0
): number {
  const effectiveConcentration = pm25UgM3 * (1 - filterEfficiency);
  const dose = effectiveConcentration * breathingRateM3H * durationHours;
  return Math.round(dose);
}

export function findOptimalVentilationWindow(hourly: HourlyTelemetryPoint[]) {
  if (!hourly || hourly.length === 0) {
    return {
      startHour: 12,
      endHour: 15,
      avgPm25: 120,
      avgMixingHeight: 950,
      recommendationText: 'Ventilate between 12:30 PM - 3:00 PM when solar heating breaks the inversion layer.',
    };
  }

  const daytimeHours = hourly.filter((h) => h.hour >= 10 && h.hour <= 17);
  let bestWindowStart = 12;
  let minCombinedRatio = Infinity;

  for (let i = 0; i < daytimeHours.length - 2; i++) {
    const chunk = daytimeHours.slice(i, i + 3);
    const avgPm = chunk.reduce((sum, h) => sum + h.pm25, 0) / chunk.length;
    const avgBlh = chunk.reduce((sum, h) => sum + h.boundaryLayerHeight, 0) / chunk.length;
    const ratio = avgPm / Math.max(100, avgBlh);

    if (ratio < minCombinedRatio) {
      minCombinedRatio = ratio;
      bestWindowStart = chunk[0].hour;
    }
  }

  const windowChunk = hourly.filter(
    (h) => h.hour >= bestWindowStart && h.hour <= bestWindowStart + 2
  );
  const avgPm25 = Math.round(
    windowChunk.reduce((acc, h) => acc + h.pm25, 0) / (windowChunk.length || 1)
  );
  const avgMixingHeight = Math.round(
    windowChunk.reduce((acc, h) => acc + h.boundaryLayerHeight, 0) / (windowChunk.length || 1)
  );

  return {
    startHour: bestWindowStart,
    endHour: bestWindowStart + 3,
    avgPm25,
    avgMixingHeight,
    recommendationText: `Safest cross-ventilation window is ${bestWindowStart}:00 to ${bestWindowStart + 3}:00. Boundary mixing layer rises to ~${avgMixingHeight}m, reducing ambient surface PM2.5 by ~${Math.round(
      Math.max(10, 100 - (avgPm25 / (hourly[0]?.pm25 || avgPm25)) * 100)
    )}% compared to morning inversion.`,
  };
}
