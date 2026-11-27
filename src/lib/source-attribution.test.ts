/**
 * Unit tests for client-side Source Attribution calculations.
 */

import { describe, expect, it } from 'vitest';
import type { TelemetryData } from '../types';
import { calculateSourceAttribution } from './source-attribution';

function makeTelemetry(overrides: Partial<TelemetryData['current']> = {}): TelemetryData {
  return {
    stationName: 'Anand Vihar, Delhi',
    locality: 'Anand Vihar ISBT',
    city: 'Delhi',
    state: 'Delhi (NCT)',
    latitude: 28.6469,
    longitude: 77.3160,
    lastUpdated: '08:30 AM',
    current: {
      pm25: 265,
      pm10: 380,
      no2: 72,
      co: 1.8,
      o3: 42,
      boundaryLayerHeight: 320,
      windSpeed: 4,
      temperature: 14,
      relativeHumidity: 85,
      isTrappedSurfaceSmog: true,
      ...overrides,
    },
    hourly: [],
    cpcb: {
      aqi: 380,
      category: 'Very Poor',
      grapStage: 'Stage II (Very Poor)',
      dominantPollutant: 'PM2.5',
      subIndices: { pm25: 380, pm10: 340, no2: 130 },
      colorHex: '#ef4444',
      badgeBg: 'bg-rose-500/15',
      badgeText: 'text-rose-700',
    },
    bestVentilationWindow: {
      startHour: 12,
      endHour: 15,
      avgPm25: 172,
      avgMixingHeight: 1100,
      recommendationText: 'Ventilate at 12:00-15:00',
    },
  };
}

describe('calculateSourceAttribution', () => {
  it('correctly calculates 4 driver contributions totaling ~100%', () => {
    const tel = makeTelemetry();
    const report = calculateSourceAttribution(tel);

    expect(report.drivers).toHaveLength(4);
    const sum = report.drivers.reduce((acc, d) => acc + d.contributionPercent, 0);
    expect(sum).toBeGreaterThanOrEqual(99.0);
    expect(sum).toBeLessThanOrEqual(101.0);
  });

  it('identifies biomass inversion when PM2.5/PM10 ratio is high and boundary layer is low', () => {
    const tel = makeTelemetry({ pm25: 290, pm10: 340, boundaryLayerHeight: 180, isTrappedSurfaceSmog: true });
    const report = calculateSourceAttribution(tel);

    expect(report.dominantDriver).toBe('biomass_inversion');
    expect(report.meteorology.isInversionTrapped).toBe(true);
    expect(report.actionImplication).toContain('HEPA');
  });

  it('identifies road dust when PM10 is high and PM2.5/PM10 ratio is low', () => {
    const tel = makeTelemetry({ pm25: 45, pm10: 420, boundaryLayerHeight: 900, isTrappedSurfaceSmog: false });
    const report = calculateSourceAttribution(tel);

    expect(report.dominantDriver).toBe('surface_road_dust');
    expect(report.actionImplication).toContain('jhadu');
  });

  it('identifies vehicular traffic when NO2 and CO are elevated', () => {
    const tel = makeTelemetry({ pm25: 40, pm10: 70, no2: 135, co: 4.2, boundaryLayerHeight: 700, isTrappedSurfaceSmog: false });
    const report = calculateSourceAttribution(tel);

    expect(report.dominantDriver).toBe('vehicular_exhaust');
    expect(report.actionImplication).toContain('N95');
  });

  it('identifies photochemical ozone peak when O3 is high', () => {
    const tel = makeTelemetry({ pm25: 25, pm10: 40, no2: 15, co: 0.3, o3: 150, boundaryLayerHeight: 1200, isTrappedSurfaceSmog: false });
    const report = calculateSourceAttribution(tel);

    expect(report.dominantDriver).toBe('photochemical_smog');
    expect(report.actionImplication).toContain('1:00 PM and 4:00 PM');
  });
});
