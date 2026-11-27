/**
 * Comprehensive unit tests for src/lib/constants.ts
 *
 * Covers:
 *  - INDIAN_STATION_PRESETS structure and content validation
 *  - EMPTY_HOUSEHOLD_PROFILE initial state
 *  - Coordinate bounds for all presets (Indian bounding box)
 *  - Required fields on every preset
 *  - isPreset flag on all presets
 *  - ID uniqueness
 *  - Specific landmark presets present
 */

import { describe, it, expect } from 'vitest';
import { EMPTY_HOUSEHOLD_PROFILE, INDIAN_STATION_PRESETS } from './constants';

describe('INDIAN_STATION_PRESETS', () => {
  it('has at least 8 presets', () => {
    expect(INDIAN_STATION_PRESETS.length).toBeGreaterThanOrEqual(8);
  });

  it('all presets have required fields', () => {
    const required = ['id', 'name', 'locality', 'city', 'state', 'latitude', 'longitude', 'monitoringAgency'];
    for (const preset of INDIAN_STATION_PRESETS) {
      for (const field of required) {
        expect(preset).toHaveProperty(field);
        expect(String(preset[field as keyof typeof preset]).length).toBeGreaterThan(0);
      }
    }
  });

  it('all preset IDs are unique', () => {
    const ids = INDIAN_STATION_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all presets have isPreset: true', () => {
    for (const preset of INDIAN_STATION_PRESETS) {
      expect(preset.isPreset).toBe(true);
    }
  });

  it('all latitudes are within India bounding box (6°N – 37°N)', () => {
    for (const preset of INDIAN_STATION_PRESETS) {
      expect(preset.latitude).toBeGreaterThanOrEqual(6);
      expect(preset.latitude).toBeLessThanOrEqual(37);
    }
  });

  it('all longitudes are within India bounding box (68°E – 97.5°E)', () => {
    for (const preset of INDIAN_STATION_PRESETS) {
      expect(preset.longitude).toBeGreaterThanOrEqual(68);
      expect(preset.longitude).toBeLessThanOrEqual(97.5);
    }
  });

  it('contains Anand Vihar Delhi preset', () => {
    expect(INDIAN_STATION_PRESETS.some((p) => p.id === 'anand-vihar-delhi')).toBe(true);
  });

  it('contains BKC Mumbai preset', () => {
    expect(INDIAN_STATION_PRESETS.some((p) => p.id === 'bkc-mumbai')).toBe(true);
  });

  it('contains Bengaluru preset', () => {
    expect(INDIAN_STATION_PRESETS.some((p) => p.city === 'Bengaluru')).toBe(true);
  });

  it('contains Kolkata preset', () => {
    expect(INDIAN_STATION_PRESETS.some((p) => p.city === 'Kolkata')).toBe(true);
  });

  it('no two presets have the same lat/lon', () => {
    const coords = INDIAN_STATION_PRESETS.map(
      (p) => `${p.latitude.toFixed(4)},${p.longitude.toFixed(4)}`
    );
    expect(new Set(coords).size).toBe(coords.length);
  });

  it('monitoringAgency strings mention CPCB, DPCC, or state board abbreviations', () => {
    for (const preset of INDIAN_STATION_PRESETS) {
      const agency = preset.monitoringAgency.toUpperCase();
      const knownAgencies = ['CPCB', 'DPCC', 'MPCB', 'KSPCB', 'WBPCB', 'UPPCB', 'HSPCB'];
      expect(knownAgencies.some((a) => agency.includes(a))).toBe(true);
    }
  });
});

describe('EMPTY_HOUSEHOLD_PROFILE', () => {
  it('isSubmitted is false', () => {
    expect(EMPTY_HOUSEHOLD_PROFILE.isSubmitted).toBe(false);
  });

  it('elevation is undefined/falsy', () => {
    expect(EMPTY_HOUSEHOLD_PROFILE.elevation).toBeFalsy();
  });

  it('kitchenExhaust is undefined/falsy', () => {
    expect(EMPTY_HOUSEHOLD_PROFILE.kitchenExhaust).toBeFalsy();
  });

  it('airFiltration is undefined/falsy', () => {
    expect(EMPTY_HOUSEHOLD_PROFILE.airFiltration).toBeFalsy();
  });

  it('triggers is an empty array', () => {
    expect(Array.isArray(EMPTY_HOUSEHOLD_PROFILE.triggers)).toBe(true);
    expect(EMPTY_HOUSEHOLD_PROFILE.triggers).toHaveLength(0);
  });

  it('members is an empty array', () => {
    expect(Array.isArray(EMPTY_HOUSEHOLD_PROFILE.members)).toBe(true);
    expect(EMPTY_HOUSEHOLD_PROFILE.members).toHaveLength(0);
  });

  it('is a pure data object without mutation between accesses', () => {
    // Mutating a copy should not affect the import
    const copy = { ...EMPTY_HOUSEHOLD_PROFILE };
    copy.triggers = ['tadka'];
    expect(EMPTY_HOUSEHOLD_PROFILE.triggers).toHaveLength(0);
  });
});
