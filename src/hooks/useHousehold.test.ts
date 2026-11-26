/**
 * Comprehensive unit tests for useHousehold hook
 *
 * Covers:
 *  - Initial state: empty profile, isSubmitted false, isEditing true
 *  - updateElevation, updateKitchenExhaust, updateAirFiltration
 *  - toggleTrigger (add, remove, idempotent toggle)
 *  - addMember, updateMember, removeMember
 *  - submitProfile validation errors (missing required fields)
 *  - submitProfile success → isSubmitted true, isEditing false
 *  - editProfile → isEditing true
 *  - clearProfile → back to empty state
 *  - localStorage persistence: saves on submit, removes on clear
 *  - localStorage hydration: restores state from storage on mount
 *  - Corrupt localStorage: falls back to empty profile gracefully
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useHousehold } from './useHousehold';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type HouseholdHook = ReturnType<typeof useHousehold>;

function fillAndSubmit(result: { current: HouseholdHook }) {
  act(() => {
    result.current.updateElevation('ground_1_2');
    result.current.updateKitchenExhaust('exhaust_fan');
    result.current.updateAirFiltration('none');
    result.current.addMember({
      name: 'Test User',
      ageGroup: 'adult',
      sensitivity: 'none',
      occupation: 'office_hybrid',
      commuteMode: 'metro_train',
      peakWindow: 'morning_7_10',
    });
  });
  let submitResult!: ReturnType<typeof result.current.submitProfile>;
  act(() => {
    submitResult = result.current.submitProfile();
  });
  return submitResult;
}



// ---------------------------------------------------------------------------
// Storage mock
// ---------------------------------------------------------------------------

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// ===========================================================================
// Tests
// ===========================================================================

describe('useHousehold – initial state', () => {
  beforeEach(() => localStorageMock.clear());

  it('elevation is undefined', () => {
    const { result } = renderHook(() => useHousehold());
    expect(result.current.household.elevation).toBeUndefined();
  });

  it('kitchenExhaust is undefined', () => {
    const { result } = renderHook(() => useHousehold());
    expect(result.current.household.kitchenExhaust).toBeUndefined();
  });

  it('airFiltration is undefined', () => {
    const { result } = renderHook(() => useHousehold());
    expect(result.current.household.airFiltration).toBeUndefined();
  });

  it('triggers is empty array', () => {
    const { result } = renderHook(() => useHousehold());
    expect(result.current.household.triggers).toEqual([]);
  });

  it('members is empty array', () => {
    const { result } = renderHook(() => useHousehold());
    expect(result.current.household.members).toEqual([]);
  });

  it('isSubmitted is false', () => {
    const { result } = renderHook(() => useHousehold());
    expect(result.current.household.isSubmitted).toBe(false);
  });

  it('isEditing is true when not submitted', () => {
    const { result } = renderHook(() => useHousehold());
    expect(result.current.isEditing).toBe(true);
  });
});

// ===========================================================================
// Field updaters
// ===========================================================================

describe('useHousehold – field updaters', () => {
  beforeEach(() => localStorageMock.clear());

  it('updateElevation sets elevation', () => {
    const { result } = renderHook(() => useHousehold());
    act(() => { result.current.updateElevation('high_8_plus'); });
    expect(result.current.household.elevation).toBe('high_8_plus');
  });

  it('updateKitchenExhaust sets kitchenExhaust', () => {
    const { result } = renderHook(() => useHousehold());
    act(() => { result.current.updateKitchenExhaust('ducted_chimney'); });
    expect(result.current.household.kitchenExhaust).toBe('ducted_chimney');
  });

  it('updateAirFiltration sets airFiltration', () => {
    const { result } = renderHook(() => useHousehold());
    act(() => { result.current.updateAirFiltration('hepa'); });
    expect(result.current.household.airFiltration).toBe('hepa');
  });

  it('elevation can be changed multiple times', () => {
    const { result } = renderHook(() => useHousehold());
    act(() => { result.current.updateElevation('ground_1_2'); });
    act(() => { result.current.updateElevation('mid_3_7'); });
    expect(result.current.household.elevation).toBe('mid_3_7');
  });
});

// ===========================================================================
// toggleTrigger
// ===========================================================================

describe('useHousehold – toggleTrigger', () => {
  beforeEach(() => localStorageMock.clear());

  it('adds a trigger when not present', () => {
    const { result } = renderHook(() => useHousehold());
    act(() => { result.current.toggleTrigger('tadka'); });
    expect(result.current.household.triggers).toContain('tadka');
  });

  it('removes a trigger when already present', () => {
    const { result } = renderHook(() => useHousehold());
    act(() => { result.current.toggleTrigger('tadka'); });
    act(() => { result.current.toggleTrigger('tadka'); });
    expect(result.current.household.triggers).not.toContain('tadka');
  });

  it('can toggle multiple independent triggers', () => {
    const { result } = renderHook(() => useHousehold());
    act(() => { result.current.toggleTrigger('tadka'); });
    act(() => { result.current.toggleTrigger('agarbatti'); });
    expect(result.current.household.triggers).toContain('tadka');
    expect(result.current.household.triggers).toContain('agarbatti');
  });

  it('removing one trigger does not remove others', () => {
    const { result } = renderHook(() => useHousehold());
    act(() => {
      result.current.toggleTrigger('tadka');
      result.current.toggleTrigger('dry_jhadu');
    });
    act(() => { result.current.toggleTrigger('tadka'); });
    expect(result.current.household.triggers).not.toContain('tadka');
    expect(result.current.household.triggers).toContain('dry_jhadu');
  });
});

// ===========================================================================
// Member management
// ===========================================================================

describe('useHousehold – addMember', () => {
  beforeEach(() => localStorageMock.clear());

  it('adds a member with auto-generated id', () => {
    const { result } = renderHook(() => useHousehold());
    act(() => {
      result.current.addMember({
        name: 'Priya',
        ageGroup: 'adult',
        sensitivity: 'none',
        occupation: 'office_hybrid',
        commuteMode: 'metro_train',
        peakWindow: 'morning_7_10',
      });
    });
    expect(result.current.household.members).toHaveLength(1);
    expect(result.current.household.members[0].name).toBe('Priya');
  });

  it('generated member id starts with mem_', () => {
    const { result } = renderHook(() => useHousehold());
    act(() => {
      result.current.addMember({
        name: 'Rahul',
        ageGroup: 'adult',
        sensitivity: 'none',
        occupation: 'student',
        commuteMode: 'walk_bus',
        peakWindow: 'morning_7_10',
      });
    });
    expect(result.current.household.members[0].id).toMatch(/^mem_/);
  });

  it('adding two members results in 2 members', () => {
    const { result } = renderHook(() => useHousehold());
    act(() => {
      result.current.addMember({ name: 'A', ageGroup: 'adult', sensitivity: 'none', occupation: 'office_hybrid', commuteMode: 'metro_train', peakWindow: 'morning_7_10' });
      result.current.addMember({ name: 'B', ageGroup: 'senior', sensitivity: 'none', occupation: 'retired', commuteMode: 'none', peakWindow: 'morning_7_10' });
    });
    expect(result.current.household.members).toHaveLength(2);
  });
});

describe('useHousehold – updateMember', () => {
  beforeEach(() => localStorageMock.clear());

  it('updates the specified member', () => {
    const { result } = renderHook(() => useHousehold());
    act(() => {
      result.current.addMember({ name: 'Priya', ageGroup: 'adult', sensitivity: 'none', occupation: 'office_hybrid', commuteMode: 'metro_train', peakWindow: 'morning_7_10' });
    });
    const id = result.current.household.members[0].id;
    act(() => {
      result.current.updateMember(id, { name: 'Priya Sharma' });
    });
    expect(result.current.household.members[0].name).toBe('Priya Sharma');
  });

  it('updating one member does not affect another', () => {
    const { result } = renderHook(() => useHousehold());
    act(() => {
      result.current.addMember({ name: 'A', ageGroup: 'adult', sensitivity: 'none', occupation: 'office_hybrid', commuteMode: 'metro_train', peakWindow: 'morning_7_10' });
      result.current.addMember({ name: 'B', ageGroup: 'senior', sensitivity: 'none', occupation: 'retired', commuteMode: 'none', peakWindow: 'morning_7_10' });
    });
    const firstId = result.current.household.members[0].id;
    act(() => { result.current.updateMember(firstId, { name: 'A Updated' }); });
    expect(result.current.household.members[1].name).toBe('B');
  });
});

describe('useHousehold – removeMember', () => {
  beforeEach(() => localStorageMock.clear());

  it('removes the specified member', () => {
    const { result } = renderHook(() => useHousehold());
    act(() => {
      result.current.addMember({ name: 'X', ageGroup: 'adult', sensitivity: 'none', occupation: 'office_hybrid', commuteMode: 'metro_train', peakWindow: 'morning_7_10' });
    });
    const id = result.current.household.members[0].id;
    act(() => { result.current.removeMember(id); });
    expect(result.current.household.members).toHaveLength(0);
  });

  it('removing one member does not remove another', () => {
    const { result } = renderHook(() => useHousehold());
    act(() => {
      result.current.addMember({ name: 'A', ageGroup: 'adult', sensitivity: 'none', occupation: 'office_hybrid', commuteMode: 'metro_train', peakWindow: 'morning_7_10' });
      result.current.addMember({ name: 'B', ageGroup: 'senior', sensitivity: 'none', occupation: 'retired', commuteMode: 'none', peakWindow: 'morning_7_10' });
    });
    const firstId = result.current.household.members[0].id;
    act(() => { result.current.removeMember(firstId); });
    expect(result.current.household.members).toHaveLength(1);
    expect(result.current.household.members[0].name).toBe('B');
  });
});

// ===========================================================================
// submitProfile validation
// ===========================================================================

describe('useHousehold – submitProfile validation', () => {
  beforeEach(() => localStorageMock.clear());

  it('fails with error when elevation is missing', () => {
    const { result } = renderHook(() => useHousehold());
    let res!: { success: boolean; error?: string };
    act(() => { res = result.current.submitProfile(); });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/elevation/i);
  });

  it('fails with error when kitchenExhaust is missing', () => {
    const { result } = renderHook(() => useHousehold());
    act(() => { result.current.updateElevation('ground_1_2'); });
    let res!: { success: boolean; error?: string };
    act(() => { res = result.current.submitProfile(); });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/kitchen/i);
  });

  it('fails with error when airFiltration is missing', () => {
    const { result } = renderHook(() => useHousehold());
    act(() => {
      result.current.updateElevation('ground_1_2');
      result.current.updateKitchenExhaust('exhaust_fan');
    });
    let res!: { success: boolean; error?: string };
    act(() => { res = result.current.submitProfile(); });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/filtration/i);
  });

  it('fails with error when no members added', () => {
    const { result } = renderHook(() => useHousehold());
    act(() => {
      result.current.updateElevation('ground_1_2');
      result.current.updateKitchenExhaust('exhaust_fan');
      result.current.updateAirFiltration('none');
    });
    let res!: { success: boolean; error?: string };
    act(() => { res = result.current.submitProfile(); });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/member/i);
  });

  it('succeeds when all required fields are filled', () => {
    const { result } = renderHook(() => useHousehold());
    const res = fillAndSubmit(result);
    expect(res.success).toBe(true);
    expect(res.error).toBeUndefined();
  });

  it('sets isSubmitted to true on success', () => {
    const { result } = renderHook(() => useHousehold());
    fillAndSubmit(result);
    expect(result.current.household.isSubmitted).toBe(true);
  });

  it('sets isEditing to false on success', () => {
    const { result } = renderHook(() => useHousehold());
    fillAndSubmit(result);
    expect(result.current.isEditing).toBe(false);
  });
});

// ===========================================================================
// editProfile
// ===========================================================================

describe('useHousehold – editProfile', () => {
  beforeEach(() => localStorageMock.clear());

  it('sets isEditing to true', () => {
    const { result } = renderHook(() => useHousehold());
    fillAndSubmit(result);
    expect(result.current.isEditing).toBe(false);
    act(() => { result.current.editProfile(); });
    expect(result.current.isEditing).toBe(true);
  });

  it('does not reset the household data', () => {
    const { result } = renderHook(() => useHousehold());
    fillAndSubmit(result);
    act(() => { result.current.editProfile(); });
    expect(result.current.household.elevation).toBe('ground_1_2');
    expect(result.current.household.members).toHaveLength(1);
  });
});

// ===========================================================================
// clearProfile
// ===========================================================================

describe('useHousehold – clearProfile', () => {
  beforeEach(() => localStorageMock.clear());

  it('resets household to empty state', () => {
    const { result } = renderHook(() => useHousehold());
    fillAndSubmit(result);
    act(() => { result.current.clearProfile(); });
    expect(result.current.household.isSubmitted).toBe(false);
    expect(result.current.household.elevation).toBeUndefined();
    expect(result.current.household.members).toHaveLength(0);
  });

  it('sets isEditing to true after clear', () => {
    const { result } = renderHook(() => useHousehold());
    fillAndSubmit(result);
    act(() => { result.current.clearProfile(); });
    expect(result.current.isEditing).toBe(true);
  });

  it('removes data from localStorage', () => {
    const { result } = renderHook(() => useHousehold());
    fillAndSubmit(result);
    expect(localStorageMock.getItem('aqright_household_profile_v2')).not.toBeNull();
    act(() => { result.current.clearProfile(); });
    expect(localStorageMock.getItem('aqright_household_profile_v2')).toBeNull();
  });
});

// ===========================================================================
// localStorage persistence
// ===========================================================================

describe('useHousehold – localStorage persistence', () => {
  beforeEach(() => localStorageMock.clear());

  it('persists submitted profile to localStorage', () => {
    const { result } = renderHook(() => useHousehold());
    fillAndSubmit(result);
    const stored = localStorageMock.getItem('aqright_household_profile_v2');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.isSubmitted).toBe(true);
  });

  it('restores submitted profile from localStorage on mount', () => {
    const savedData = {
      elevation: 'mid_3_7',
      kitchenExhaust: 'ducted_chimney',
      airFiltration: 'hepa',
      triggers: ['tadka'],
      members: [{ id: 'mem_saved', name: 'Saved User', ageGroup: 'adult', sensitivity: 'none', occupation: 'office_hybrid', commuteMode: 'metro_train', peakWindow: 'morning_7_10' }],
      isSubmitted: true,
    };
    localStorageMock.setItem('aqright_household_profile_v2', JSON.stringify(savedData));

    const { result } = renderHook(() => useHousehold());
    expect(result.current.household.elevation).toBe('mid_3_7');
    expect(result.current.household.isSubmitted).toBe(true);
    expect(result.current.isEditing).toBe(false);
  });

  it('ignores unsubmitted data in localStorage', () => {
    const unsubmitted = {
      elevation: 'ground_1_2',
      kitchenExhaust: 'exhaust_fan',
      airFiltration: 'none',
      triggers: [],
      members: [],
      isSubmitted: false,
    };
    localStorageMock.setItem('aqright_household_profile_v2', JSON.stringify(unsubmitted));
    const { result } = renderHook(() => useHousehold());
    expect(result.current.household.isSubmitted).toBe(false);
    expect(result.current.household.elevation).toBeUndefined();
  });

  it('handles corrupt localStorage gracefully (falls back to empty)', () => {
    localStorageMock.setItem('aqright_household_profile_v2', 'NOT_VALID_JSON{{{');
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useHousehold());
    expect(result.current.household.isSubmitted).toBe(false);
    consoleSpy.mockRestore();
  });

  it('does not save to localStorage when profile is not submitted', () => {
    const { result } = renderHook(() => useHousehold());
    act(() => { result.current.updateElevation('ground_1_2'); });
    expect(localStorageMock.getItem('aqright_household_profile_v2')).toBeNull();
  });
});
