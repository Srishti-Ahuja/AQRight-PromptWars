/**
 * Comprehensive unit tests for src/lib/aqi-math.ts
 *
 * Covers:
 *  - calculateSubIndex (PM2.5, PM10, NO2 breakpoints)
 *  - getNAQICategory (all 6 category boundaries)
 *  - getGrapStage (all 5 stage boundaries)
 *  - calculateCPCBBreakdown (dominant pollutant, sub-index max rule)
 *  - calculateBerkeleyCigarettes (Berkeley Earth equivalence)
 *  - calculateInhalationDose (physiological dose model)
 *  - findOptimalVentilationWindow (inversion window algorithm)
 */

import { describe, it, expect } from 'vitest';
import type { HourlyTelemetryPoint } from '../types';
import {
  calculateBerkeleyCigarettes,
  calculateCPCBBreakdown,
  calculateInhalationDose,
  findOptimalVentilationWindow,
  getNAQICategory,
  getGrapStage,
} from './aqi-math';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeHourly(
  hour: number,
  pm25: number,
  blh: number,
): HourlyTelemetryPoint {
  return {
    time: `${String(hour).padStart(2, '0')}:00`,
    hour,
    pm25,
    pm10: pm25 * 1.5,
    no2: 50,
    boundaryLayerHeight: blh,
    windSpeed: 4,
    temperature: 18,
    relativeHumidity: 70,
  };
}

function makeFullDiurnal(morningPm = 280, afternoonPm = 80): HourlyTelemetryPoint[] {
  return Array.from({ length: 24 }, (_, h) => {
    const isAfternoon = h >= 12 && h <= 15;
    return makeHourly(h, isAfternoon ? afternoonPm : morningPm, isAfternoon ? 1100 : 240);
  });
}

// ===========================================================================
// getNAQICategory
// ===========================================================================

describe('getNAQICategory', () => {
  it.each([
    [0,   'Good'],
    [25,  'Good'],
    [50,  'Good'],
    [51,  'Satisfactory'],
    [75,  'Satisfactory'],
    [100, 'Satisfactory'],
    [101, 'Moderate'],
    [150, 'Moderate'],
    [200, 'Moderate'],
    [201, 'Poor'],
    [250, 'Poor'],
    [300, 'Poor'],
    [301, 'Very Poor'],
    [350, 'Very Poor'],
    [400, 'Very Poor'],
    [401, 'Severe'],
    [450, 'Severe'],
    [500, 'Severe'],
  ] as [number, string][])(
    'AQI %i → category %s',
    (aqi, expected) => {
      expect(getNAQICategory(aqi).category).toBe(expected);
    }
  );

  it('returns a hex color string', () => {
    const result = getNAQICategory(100);
    expect(result.colorHex).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('Good category uses green/emerald color', () => {
    const result = getNAQICategory(30);
    expect(result.colorHex).toMatch(/#1[0-9a-f]a3[0-9a-f]{2}/i);
  });

  it('Severe category uses dark red color', () => {
    const result = getNAQICategory(460);
    expect(result.colorHex).toBe('#881337');
  });

  it('badge bg contains correct color class', () => {
    expect(getNAQICategory(30).badgeBg).toContain('emerald');
    expect(getNAQICategory(500).badgeBg).toContain('red');
  });
});

// ===========================================================================
// getGrapStage
// ===========================================================================

describe('getGrapStage', () => {
  it.each([
    [0,   'None'],
    [100, 'None'],
    [200, 'None'],
    [201, 'Stage I (Poor)'],
    [300, 'Stage I (Poor)'],
    [301, 'Stage II (Very Poor)'],
    [400, 'Stage II (Very Poor)'],
    [401, 'Stage III (Severe)'],
    [450, 'Stage III (Severe)'],
    [451, 'Stage IV (Severe+)'],
    [500, 'Stage IV (Severe+)'],
  ] as [number, string][])(
    'AQI %i → stage %s',
    (aqi, expected) => {
      expect(getGrapStage(aqi)).toBe(expected);
    }
  );

  it('Stage III/IV boundary is strictly at 450', () => {
    expect(getGrapStage(450)).toBe('Stage III (Severe)');
    expect(getGrapStage(451)).toBe('Stage IV (Severe+)');
  });
});

// ===========================================================================
// calculateCPCBBreakdown
// ===========================================================================

describe('calculateCPCBBreakdown', () => {
  it('PM2.5 dominant when it has highest sub-index', () => {
    const result = calculateCPCBBreakdown(220, 80, 40);
    expect(result.dominantPollutant).toBe('PM2.5');
  });

  it('PM10 dominant when it has highest sub-index', () => {
    const result = calculateCPCBBreakdown(25, 450, 40);
    expect(result.dominantPollutant).toBe('PM10');
  });

  it('NO2 dominant when it has highest sub-index', () => {
    const result = calculateCPCBBreakdown(15, 30, 450);
    expect(result.dominantPollutant).toBe('NO2');
  });

  it('overall AQI is the maximum of all sub-indices', () => {
    const result = calculateCPCBBreakdown(100, 200, 50);
    const max = Math.max(result.subIndices.pm25, result.subIndices.pm10, result.subIndices.no2);
    expect(result.aqi).toBe(max);
  });

  it('all zero concentrations return AQI 0 and Good category', () => {
    const result = calculateCPCBBreakdown(0, 0, 0);
    expect(result.aqi).toBe(0);
    expect(result.category).toBe('Good');
  });

  it('Delhi winter scenario returns Severe category', () => {
    const result = calculateCPCBBreakdown(380, 550, 90);
    expect(result.category).toBe('Severe');
    expect(result.aqi).toBeGreaterThanOrEqual(401);
  });

  it('sub-indices are all non-negative numbers', () => {
    const result = calculateCPCBBreakdown(50, 100, 50);
    expect(result.subIndices.pm25).toBeGreaterThanOrEqual(0);
    expect(result.subIndices.pm10).toBeGreaterThanOrEqual(0);
    expect(result.subIndices.no2).toBeGreaterThanOrEqual(0);
  });

  it('GRAP stage matches AQI category', () => {
    const result = calculateCPCBBreakdown(380, 550, 90);
    expect(['Stage III (Severe)', 'Stage IV (Severe+)']).toContain(result.grapStage);
  });

  it('returns valid colorHex', () => {
    const result = calculateCPCBBreakdown(100, 100, 100);
    expect(result.colorHex).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

// ===========================================================================
// calculateBerkeleyCigarettes
// ===========================================================================

describe('calculateBerkeleyCigarettes', () => {
  it('22 µg/m³ × 24h × 1.0 = 1.0 cigarette (Berkeley Earth benchmark)', () => {
    expect(calculateBerkeleyCigarettes(22, 24, 1.0)).toBe(1.0);
  });

  it('220 µg/m³ × 24h × 1.0 = 10.0 cigarettes', () => {
    expect(calculateBerkeleyCigarettes(220, 24, 1.0)).toBe(10.0);
  });

  it('zero concentration returns 0', () => {
    expect(calculateBerkeleyCigarettes(0, 24, 1.0)).toBe(0);
  });

  it('zero hours returns 0', () => {
    expect(calculateBerkeleyCigarettes(100, 0, 1.0)).toBe(0);
  });

  it('negative concentration returns 0', () => {
    expect(calculateBerkeleyCigarettes(-10, 24, 1.0)).toBe(0);
  });

  it('12h exposure is half of 24h exposure', () => {
    const full = calculateBerkeleyCigarettes(100, 24, 1.0);
    const half = calculateBerkeleyCigarettes(100, 12, 1.0);
    expect(Math.abs(full - 2 * half)).toBeLessThan(0.2);
  });

  it('active multiplier 1.4 gives higher equivalence', () => {
    const sedentary = calculateBerkeleyCigarettes(100, 24, 1.0);
    const active = calculateBerkeleyCigarettes(100, 24, 1.4);
    expect(active).toBeGreaterThan(sedentary);
  });

  it('Delhi winter typical PM2.5 gives > 8 cigarettes/day', () => {
    expect(calculateBerkeleyCigarettes(265, 24, 1.0)).toBeGreaterThanOrEqual(8);
  });

  it.each([
    [44, 24, 1.0, 1.9, 2.1],
    [66, 24, 1.0, 2.9, 3.1],
    [110, 24, 1.0, 4.9, 5.1],
  ] as [number, number, number, number, number][])(
    'PM2.5=%i × %ih → ~%f–%f cigs',
    (pm25, hours, mult, min, max) => {
      const result = calculateBerkeleyCigarettes(pm25, hours, mult);
      expect(result).toBeGreaterThanOrEqual(min);
      expect(result).toBeLessThanOrEqual(max);
    }
  );
});

// ===========================================================================
// calculateInhalationDose
// ===========================================================================

describe('calculateInhalationDose', () => {
  it('100 µg/m³ × 1h × 0.6 m³/h × no filter = 60 µg', () => {
    expect(calculateInhalationDose(100, 1, 0.6, 0)).toBe(60);
  });

  it('N95 at 95% filter efficiency: 100 µg/m³ × 1h × 0.6 → 3 µg', () => {
    expect(calculateInhalationDose(100, 1, 0.6, 0.95)).toBe(3);
  });

  it('zero concentration returns 0', () => {
    expect(calculateInhalationDose(0, 24)).toBe(0);
  });

  it('zero duration returns 0', () => {
    expect(calculateInhalationDose(100, 0)).toBe(0);
  });

  it('100% filter efficiency returns 0', () => {
    expect(calculateInhalationDose(300, 24, 0.6, 1.0)).toBe(0);
  });

  it('dose scales linearly with duration', () => {
    const d1 = calculateInhalationDose(100, 1, 0.6, 0);
    const d8 = calculateInhalationDose(100, 8, 0.6, 0);
    expect(Math.abs(d8 - 8 * d1)).toBeLessThan(1);
  });

  it('dose scales linearly with concentration', () => {
    const d100 = calculateInhalationDose(100, 1, 0.6, 0);
    const d200 = calculateInhalationDose(200, 1, 0.6, 0);
    expect(Math.abs(d200 - 2 * d100)).toBeLessThan(1);
  });

  it('child breathing rate 0.75 m³/h gives higher dose than adult 0.6', () => {
    const adult = calculateInhalationDose(200, 8, 0.6, 0);
    const child = calculateInhalationDose(200, 8, 0.75, 0);
    expect(child).toBeGreaterThan(adult);
  });
});

// ===========================================================================
// findOptimalVentilationWindow
// ===========================================================================

describe('findOptimalVentilationWindow', () => {
  it('identifies afternoon as the cleanest window', () => {
    const hourly = makeFullDiurnal(280, 80);
    const window = findOptimalVentilationWindow(hourly);
    expect(window.startHour).toBeGreaterThanOrEqual(11);
    expect(window.startHour).toBeLessThanOrEqual(14);
  });

  it('afternoon window has higher mixing height than morning', () => {
    const hourly = makeFullDiurnal();
    const window = findOptimalVentilationWindow(hourly);
    expect(window.avgMixingHeight).toBeGreaterThan(800);
  });

  it('endHour is startHour + 3', () => {
    const hourly = makeFullDiurnal();
    const window = findOptimalVentilationWindow(hourly);
    expect(window.endHour).toBe(window.startHour + 3);
  });

  it('empty array returns default fallback window (12–15)', () => {
    const window = findOptimalVentilationWindow([]);
    expect(window.startHour).toBe(12);
    expect(window.endHour).toBe(15);
  });

  it('recommendation text is non-empty string containing start hour', () => {
    const hourly = makeFullDiurnal();
    const window = findOptimalVentilationWindow(hourly);
    expect(window.recommendationText).toBeTruthy();
    expect(window.recommendationText).toContain(String(window.startHour));
  });

  it('uniformly bad air still returns a valid window in daytime range', () => {
    const hourly = Array.from({ length: 24 }, (_, h) => makeHourly(h, 350, 200));
    const window = findOptimalVentilationWindow(hourly);
    expect(window.startHour).toBeGreaterThanOrEqual(10);
    expect(window.startHour).toBeLessThanOrEqual(17);
  });

  it('clean air all day still returns valid start hour', () => {
    const hourly = Array.from({ length: 24 }, (_, h) => makeHourly(h, 20, 1500));
    const window = findOptimalVentilationWindow(hourly);
    expect(typeof window.startHour).toBe('number');
  });
});
