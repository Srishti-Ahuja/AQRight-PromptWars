import { useEffect, useState } from 'react';
import type {
  AirFiltration,
  FamilyMember,
  FloorElevation,
  HouseholdProfile,
  HouseholdTrigger,
  KitchenExhaust,
} from '../types';
import { EMPTY_HOUSEHOLD_PROFILE } from '../lib/constants';

const STORAGE_KEY = 'aqright_household_profile_v2';

export function useHousehold() {
  const [household, setHousehold] = useState<HouseholdProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.isSubmitted === 'boolean' && parsed.isSubmitted && parsed.elevation) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved household profile:', e);
    }
    return EMPTY_HOUSEHOLD_PROFILE;
  });

  // Track if user is currently in editing mode
  const [isEditing, setIsEditing] = useState<boolean>(() => !household.isSubmitted);

  // Save to localStorage whenever submitted
  useEffect(() => {
    try {
      if (household.isSubmitted) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(household));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Failed to persist household profile:', e);
    }
  }, [household]);

  const updateElevation = (elevation: FloorElevation) => {
    setHousehold((prev) => ({ ...prev, elevation }));
  };

  const updateKitchenExhaust = (kitchenExhaust: KitchenExhaust) => {
    setHousehold((prev) => ({ ...prev, kitchenExhaust }));
  };

  const updateAirFiltration = (airFiltration: AirFiltration) => {
    setHousehold((prev) => ({ ...prev, airFiltration }));
  };

  const toggleTrigger = (trigger: HouseholdTrigger) => {
    setHousehold((prev) => {
      const exists = prev.triggers.includes(trigger);
      const triggers = exists
        ? prev.triggers.filter((t) => t !== trigger)
        : [...prev.triggers, trigger];
      return { ...prev, triggers };
    });
  };

  const addMember = (member: Omit<FamilyMember, 'id'>) => {
    const newMember: FamilyMember = {
      ...member,
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    setHousehold((prev) => ({
      ...prev,
      members: [...prev.members, newMember],
    }));
  };

  const updateMember = (id: string, updates: Partial<FamilyMember>) => {
    setHousehold((prev) => ({
      ...prev,
      members: prev.members.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    }));
  };

  const removeMember = (id: string) => {
    setHousehold((prev) => ({
      ...prev,
      members: prev.members.filter((m) => m.id !== id),
    }));
  };

  const submitProfile = (): { success: boolean; error?: string } => {
    if (!household.elevation) {
      return { success: false, error: 'Please select your building floor elevation.' };
    }
    if (!household.kitchenExhaust) {
      return { success: false, error: 'Please select your kitchen exhaust setup.' };
    }
    if (!household.airFiltration) {
      return { success: false, error: 'Please select your home air filtration setup.' };
    }
    if (household.members.length === 0) {
      return { success: false, error: 'Please add at least one household/family member to compute personal exposure.' };
    }

    setHousehold((prev) => ({
      ...prev,
      isSubmitted: true,
    }));
    setIsEditing(false);
    return { success: true };
  };

  const editProfile = () => {
    setIsEditing(true);
  };

  const clearProfile = () => {
    setHousehold(EMPTY_HOUSEHOLD_PROFILE);
    setIsEditing(true);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore localStorage errors
    }

  };

  return {
    household,
    isEditing,
    setIsEditing,
    updateElevation,
    updateKitchenExhaust,
    updateAirFiltration,
    toggleTrigger,
    addMember,
    updateMember,
    removeMember,
    submitProfile,
    editProfile,
    clearProfile,
  };
}
