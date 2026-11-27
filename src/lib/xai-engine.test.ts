/**
 * Comprehensive unit tests for src/lib/xai-engine.ts
 *
 * Covers:
 *  - generateXAIRecommendations submission guard
 *  - All 4 household triggers producing correct recommendation IDs
 *  - Two-wheeler commuter, student, asthmatic, senior, car recommendations
 *  - SHAP weight integrity (sum ≈ 100% per recommendation)
 *  - Counterfactual: action dose ≤ baseline dose
 *  - Priority escalation (critical at PM2.5 > 250)
 *  - Confidence score bounds [0, 1]
 *  - Multi-member household ID uniqueness
 */

import { describe, it, expect } from 'vitest';
import type {
  FamilyMember,
  HouseholdProfile,
  HourlyTelemetryPoint,
  TelemetryData,
} from '../types';
import { generateXAIRecommendations } from './xai-engine';

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeTelemetry(overrides: Partial<TelemetryData['current']> = {}): TelemetryData {
  const hourly: HourlyTelemetryPoint[] = Array.from({ length: 24 }, (_, h) => ({
    time: `${String(h).padStart(2, '0')}:00`,
    hour: h,
    pm25: h >= 12 && h <= 15 ? 172 : 265,
    pm10: h >= 12 && h <= 15 ? 240 : 380,
    no2: 72,
    boundaryLayerHeight: h >= 12 && h <= 15 ? 1100 : 320,
    windSpeed: 4,
    temperature: 14,
    relativeHumidity: 85,
  }));

  return {
    stationName: 'Anand Vihar, Delhi',
    locality: 'Anand Vihar ISBT',
    city: 'Delhi',
    state: 'Delhi (NCT)',
    latitude: 28.6469,
    longitude: 77.316,
    lastUpdated: '06:30 AM',
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
    hourly,
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
      recommendationText: 'Ventilate at 12:00–15:00.',
    },
  };
}

function makeMember(overrides: Partial<FamilyMember> = {}): FamilyMember {
  return {
    id: 'mem_default',
    name: 'Test User',
    ageGroup: 'adult',
    sensitivity: 'none',
    occupation: 'office_hybrid',
    commuteMode: 'metro_train',
    peakWindow: 'morning_7_10',
    ...overrides,
  };
}

function makeHousehold(overrides: Partial<HouseholdProfile> = {}): HouseholdProfile {
  return {
    elevation: 'ground_1_2',
    kitchenExhaust: 'exhaust_fan',
    airFiltration: 'none',
    triggers: [],
    members: [makeMember()],
    isSubmitted: true,
    ...overrides,
  };
}

const SEVERE = makeTelemetry();
const CLEAN = makeTelemetry({ pm25: 25, pm10: 40, boundaryLayerHeight: 1500, isTrappedSurfaceSmog: false });

// ===========================================================================
// Submission guard
// ===========================================================================

describe('generateXAIRecommendations – submission guard', () => {
  it('returns [] when isSubmitted is false', () => {
    const hh = makeHousehold({ isSubmitted: false });
    expect(generateXAIRecommendations(SEVERE, hh)).toEqual([]);
  });

  it('returns [] when elevation is missing', () => {
    const hh = makeHousehold({ elevation: undefined });
    expect(generateXAIRecommendations(SEVERE, hh)).toEqual([]);
  });

  it('returns [] when kitchenExhaust is missing', () => {
    const hh = makeHousehold({ kitchenExhaust: undefined });
    expect(generateXAIRecommendations(SEVERE, hh)).toEqual([]);
  });

  it('returns non-empty array for a valid submitted profile with high PM2.5', () => {
    const hh = makeHousehold({ triggers: ['tadka'] });
    expect(generateXAIRecommendations(SEVERE, hh).length).toBeGreaterThan(0);
  });
});

// ===========================================================================
// Inversion window recommendation
// ===========================================================================

describe('generateXAIRecommendations – inversion window', () => {
  it('generates rec_inversion_window when surface smog is trapped', () => {
    const hh = makeHousehold();
    const ids = generateXAIRecommendations(SEVERE, hh).map((r) => r.id);
    expect(ids).toContain('rec_inversion_window');
  });

  it('generates rec_inversion_window when PM2.5 > 150 even without trap', () => {
    const tel = makeTelemetry({ pm25: 200, isTrappedSurfaceSmog: false });
    const hh = makeHousehold();
    const ids = generateXAIRecommendations(tel, hh).map((r) => r.id);
    expect(ids).toContain('rec_inversion_window');
  });

  it('no inversion rec for clean air without trap', () => {
    const hh = makeHousehold();
    const ids = generateXAIRecommendations(CLEAN, hh).map((r) => r.id);
    expect(ids).not.toContain('rec_inversion_window');
  });

  it('priority is critical when PM2.5 > 250', () => {
    const tel = makeTelemetry({ pm25: 280, isTrappedSurfaceSmog: true });
    const hh = makeHousehold();
    const rec = generateXAIRecommendations(tel, hh).find((r) => r.id === 'rec_inversion_window');
    expect(rec?.priority).toBe('critical');
  });

  it('priority is high when PM2.5 ≤ 250 but trapped', () => {
    const tel = makeTelemetry({ pm25: 200, blh: 380, isTrappedSurfaceSmog: true } as Parameters<typeof makeTelemetry>[0]);
    const hh = makeHousehold();
    const rec = generateXAIRecommendations(tel, hh).find((r) => r.id === 'rec_inversion_window');
    expect(rec?.priority).toBe('high');
  });

  it.each(['ground_1_2', 'mid_3_7', 'high_8_plus'] as const)(
    'generates inversion rec for elevation %s',
    (elevation) => {
      const hh = makeHousehold({ elevation });
      const ids = generateXAIRecommendations(SEVERE, hh).map((r) => r.id);
      expect(ids).toContain('rec_inversion_window');
    }
  );

  it('HEPA filtration attribution direction is mitigating', () => {
    const hh = makeHousehold({ airFiltration: 'hepa' });
    const rec = generateXAIRecommendations(SEVERE, hh).find((r) => r.id === 'rec_inversion_window')!;
    const filtrationAttr = rec.shapAttributions.find((a) =>
      a.featureName.toLowerCase().includes('filtration')
    );
    expect(filtrationAttr?.direction).toBe('mitigating');
  });

  it('no filtration attribution direction is amplifying', () => {
    const hh = makeHousehold({ airFiltration: 'none' });
    const rec = generateXAIRecommendations(SEVERE, hh).find((r) => r.id === 'rec_inversion_window')!;
    const filtrationAttr = rec.shapAttributions.find((a) =>
      a.featureName.toLowerCase().includes('filtration')
    );
    expect(filtrationAttr?.direction).toBe('amplifying');
  });
});

// ===========================================================================
// Trigger recommendations
// ===========================================================================

describe('generateXAIRecommendations – triggers', () => {
  it('tadka trigger generates rec_tadka_mitigation', () => {
    const hh = makeHousehold({ triggers: ['tadka'] });
    const ids = generateXAIRecommendations(SEVERE, hh).map((r) => r.id);
    expect(ids).toContain('rec_tadka_mitigation');
  });

  it('no tadka trigger → no tadka rec', () => {
    const hh = makeHousehold({ triggers: [] });
    const ids = generateXAIRecommendations(SEVERE, hh).map((r) => r.id);
    expect(ids).not.toContain('rec_tadka_mitigation');
  });

  it.each(['exhaust_fan', 'open_window_none'] as const)(
    'tadka with poor exhaust (%s) gives critical priority',
    (exhaust) => {
      const hh = makeHousehold({ triggers: ['tadka'], kitchenExhaust: exhaust });
      const rec = generateXAIRecommendations(SEVERE, hh).find((r) => r.id === 'rec_tadka_mitigation');
      expect(rec?.priority).toBe('critical');
    }
  );

  it('tadka with ducted_chimney gives high priority', () => {
    const hh = makeHousehold({ triggers: ['tadka'], kitchenExhaust: 'ducted_chimney' });
    const rec = generateXAIRecommendations(SEVERE, hh).find((r) => r.id === 'rec_tadka_mitigation');
    expect(rec?.priority).toBe('high');
  });

  it('dry_jhadu trigger generates rec_wet_mopping', () => {
    const hh = makeHousehold({ triggers: ['dry_jhadu'] });
    const ids = generateXAIRecommendations(SEVERE, hh).map((r) => r.id);
    expect(ids).toContain('rec_wet_mopping');
  });

  it('agarbatti trigger generates rec_incense_coils', () => {
    const hh = makeHousehold({ triggers: ['agarbatti'] });
    const ids = generateXAIRecommendations(SEVERE, hh).map((r) => r.id);
    expect(ids).toContain('rec_incense_coils');
  });

  it('mosquito_coils trigger generates rec_incense_coils', () => {
    const hh = makeHousehold({ triggers: ['mosquito_coils'] });
    const ids = generateXAIRecommendations(SEVERE, hh).map((r) => r.id);
    expect(ids).toContain('rec_incense_coils');
  });

  it('agarbatti/coil recommendation priority is critical', () => {
    const hh = makeHousehold({ triggers: ['agarbatti'] });
    const rec = generateXAIRecommendations(SEVERE, hh).find((r) => r.id === 'rec_incense_coils');
    expect(rec?.priority).toBe('critical');
  });

  it('all 4 triggers together each produce at least one rec', () => {
    const hh = makeHousehold({ triggers: ['tadka', 'agarbatti', 'dry_jhadu', 'mosquito_coils'] });
    const ids = generateXAIRecommendations(SEVERE, hh).map((r) => r.id);
    expect(ids).toContain('rec_tadka_mitigation');
    expect(ids).toContain('rec_wet_mopping');
    expect(ids).toContain('rec_incense_coils');
  });
});

// ===========================================================================
// Member recommendations
// ===========================================================================

describe('generateXAIRecommendations – two-wheeler commuter', () => {
  it('generates commute rec for two_wheeler_auto commuter', () => {
    const hh = makeHousehold({ members: [makeMember({ id: 'biker', commuteMode: 'two_wheeler_auto' })] });
    const ids = generateXAIRecommendations(SEVERE, hh).map((r) => r.id);
    expect(ids).toContain('rec_commute_biker');
  });

  it('metro commuter does NOT generate commute rec', () => {
    const hh = makeHousehold({ members: [makeMember({ id: 'metro', commuteMode: 'metro_train' })] });
    const ids = generateXAIRecommendations(SEVERE, hh).map((r) => r.id);
    expect(ids).not.toContain('rec_commute_metro');
  });

  it('commute rec target id matches member id', () => {
    const hh = makeHousehold({ members: [makeMember({ id: 'biker42', commuteMode: 'two_wheeler_auto' })] });
    const rec = generateXAIRecommendations(SEVERE, hh).find((r) => r.id === 'rec_commute_biker42');
    expect(rec?.targetId).toBe('biker42');
  });
});

describe('generateXAIRecommendations – student', () => {
  it('morning student generates student rec', () => {
    const student = makeMember({ id: 'st1', occupation: 'student', peakWindow: 'morning_7_10' });
    const hh = makeHousehold({ members: [student] });
    const ids = generateXAIRecommendations(SEVERE, hh).map((r) => r.id);
    expect(ids).toContain('rec_student_st1');
  });

  it('midday student does not generate student rec', () => {
    const student = makeMember({ id: 'st2', occupation: 'student', peakWindow: 'midday_12_4' });
    const hh = makeHousehold({ members: [student] });
    const ids = generateXAIRecommendations(SEVERE, hh).map((r) => r.id);
    expect(ids).not.toContain('rec_student_st2');
  });
});

describe('generateXAIRecommendations – asthmatic member', () => {
  it('generates asthma rec for asthmatic member', () => {
    const member = makeMember({ id: 'asth1', sensitivity: 'asthma_bronchitis' });
    const hh = makeHousehold({ members: [member] });
    const ids = generateXAIRecommendations(SEVERE, hh).map((r) => r.id);
    expect(ids).toContain('rec_asthma_asth1');
  });

  it('healthy member does not generate asthma rec', () => {
    const member = makeMember({ id: 'h1', sensitivity: 'none' });
    const hh = makeHousehold({ members: [member] });
    const ids = generateXAIRecommendations(SEVERE, hh).map((r) => r.id);
    expect(ids).not.toContain('rec_asthma_h1');
  });
});

describe('generateXAIRecommendations – senior', () => {
  it('generates senior rec for senior member', () => {
    const member = makeMember({ id: 'sr1', ageGroup: 'senior' });
    const hh = makeHousehold({ members: [member] });
    const ids = generateXAIRecommendations(SEVERE, hh).map((r) => r.id);
    expect(ids).toContain('rec_senior_sr1');
  });

  it('asthmatic senior gets asthma rec but not duplicate senior rec', () => {
    const member = makeMember({ id: 'sa1', ageGroup: 'senior', sensitivity: 'asthma_bronchitis' });
    const hh = makeHousehold({ members: [member] });
    const ids = generateXAIRecommendations(SEVERE, hh).map((r) => r.id);
    expect(ids).toContain('rec_asthma_sa1');
    expect(ids).not.toContain('rec_senior_sa1');
  });
});

describe('generateXAIRecommendations – car commuter', () => {
  it('generates car rec for closed_car commuter', () => {
    const member = makeMember({ id: 'drv1', commuteMode: 'closed_car' });
    const hh = makeHousehold({ members: [member] });
    const ids = generateXAIRecommendations(SEVERE, hh).map((r) => r.id);
    expect(ids).toContain('rec_car_recirc_drv1');
  });

  it('car rec priority is preventive', () => {
    const member = makeMember({ id: 'drv2', commuteMode: 'closed_car' });
    const hh = makeHousehold({ members: [member] });
    const rec = generateXAIRecommendations(SEVERE, hh).find((r) => r.id === 'rec_car_recirc_drv2');
    expect(rec?.priority).toBe('preventive');
  });
});


// ===========================================================================
// SHAP integrity
// ===========================================================================

describe('generateXAIRecommendations – SHAP integrity', () => {
  it('every rec has non-empty shapAttributions', () => {
    const hh = makeHousehold({ triggers: ['tadka', 'agarbatti'] });
    const recs = generateXAIRecommendations(SEVERE, hh);
    for (const rec of recs) {
      expect(rec.shapAttributions.length).toBeGreaterThan(0);
    }
  });

  it('SHAP weights sum between 85% and 115% per recommendation', () => {
    const hh = makeHousehold({
      triggers: ['tadka', 'agarbatti', 'dry_jhadu', 'mosquito_coils'],
      members: [
        makeMember({ id: 'm1', commuteMode: 'two_wheeler_auto' }),
        makeMember({ id: 'm2', sensitivity: 'asthma_bronchitis' }),
        makeMember({ id: 'm3', ageGroup: 'senior' }),
      ],
    });
    const recs = generateXAIRecommendations(SEVERE, hh);
    for (const rec of recs) {
      const total = rec.shapAttributions.reduce((sum, a) => sum + a.weightPercent, 0);
      expect(total).toBeGreaterThanOrEqual(85);
      expect(total).toBeLessThanOrEqual(115);
    }
  });

  it('all SHAP directions are either amplifying or mitigating', () => {
    const hh = makeHousehold({ triggers: ['tadka', 'dry_jhadu'] });
    const recs = generateXAIRecommendations(SEVERE, hh);
    for (const rec of recs) {
      for (const attr of rec.shapAttributions) {
        expect(['amplifying', 'mitigating']).toContain(attr.direction);
      }
    }
  });
});

// ===========================================================================
// Counterfactual ordering
// ===========================================================================

describe('generateXAIRecommendations – counterfactual', () => {
  it('action dose ≤ baseline dose for all recommendations', () => {
    const hh = makeHousehold({
      triggers: ['tadka', 'agarbatti', 'dry_jhadu'],
      members: [makeMember({ id: 'm1', commuteMode: 'two_wheeler_auto' })],
    });
    for (const rec of generateXAIRecommendations(SEVERE, hh)) {
      expect(rec.counterfactual.actionInhaledDoseUgd).toBeLessThanOrEqual(
        rec.counterfactual.baselineInhaledDoseUgd
      );
    }
  });

  it('dose avoided is non-negative', () => {
    const hh = makeHousehold({ triggers: ['tadka'] });
    for (const rec of generateXAIRecommendations(SEVERE, hh)) {
      expect(rec.counterfactual.doseAvoidedUgd).toBeGreaterThanOrEqual(0);
    }
  });

  it('cigarettes avoided is non-negative', () => {
    const hh = makeHousehold({ triggers: ['agarbatti'] });
    for (const rec of generateXAIRecommendations(SEVERE, hh)) {
      expect(rec.counterfactual.cigarettesAvoided).toBeGreaterThanOrEqual(0);
    }
  });

  it('exposure reduction percent is 0–100', () => {
    const hh = makeHousehold({ triggers: ['tadka'] });
    for (const rec of generateXAIRecommendations(SEVERE, hh)) {
      expect(rec.counterfactual.exposureReductionPercent).toBeGreaterThanOrEqual(0);
      expect(rec.counterfactual.exposureReductionPercent).toBeLessThanOrEqual(100);
    }
  });
});

// ===========================================================================
// General quality
// ===========================================================================

describe('generateXAIRecommendations – general quality', () => {
  it('confidence scores are between 0 and 1', () => {
    const hh = makeHousehold({ triggers: ['tadka', 'agarbatti'] });
    for (const rec of generateXAIRecommendations(SEVERE, hh)) {
      expect(rec.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(rec.confidenceScore).toBeLessThanOrEqual(1);
    }
  });

  it('recommendation IDs are unique across a full household', () => {
    const hh = makeHousehold({
      triggers: ['tadka', 'agarbatti', 'dry_jhadu', 'mosquito_coils'],
      members: [
        makeMember({ id: 'm1', commuteMode: 'two_wheeler_auto' }),
        makeMember({ id: 'm2', sensitivity: 'asthma_bronchitis' }),
        makeMember({ id: 'm3', ageGroup: 'senior' }),
        makeMember({ id: 'm4', commuteMode: 'closed_car' }),
      ],
    });
    const recs = generateXAIRecommendations(SEVERE, hh);
    const ids = recs.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all recommendations have non-empty personalized instruction', () => {
    const hh = makeHousehold({ triggers: ['tadka'] });
    for (const rec of generateXAIRecommendations(SEVERE, hh)) {
      expect(rec.personalizedInstruction.length).toBeGreaterThan(20);
    }
  });

  it('all recommendations have non-empty decision summary', () => {
    const hh = makeHousehold({ triggers: ['tadka'] });
    for (const rec of generateXAIRecommendations(SEVERE, hh)) {
      expect(rec.decisionSummary.length).toBeGreaterThan(20);
    }
  });

  it('multi-member household produces more recs than single member', () => {
    const single = makeHousehold({ members: [makeMember({ id: 'solo' })] });
    const multi = makeHousehold({
      members: [
        makeMember({ id: 'm1', commuteMode: 'two_wheeler_auto' }),
        makeMember({ id: 'm2', sensitivity: 'asthma_bronchitis' }),
        makeMember({ id: 'm3', ageGroup: 'senior' }),
      ],
    });
    const singleRecs = generateXAIRecommendations(SEVERE, single);
    const multiRecs = generateXAIRecommendations(SEVERE, multi);
    expect(multiRecs.length).toBeGreaterThan(singleRecs.length);
  });
});
