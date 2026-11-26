import React, { useState } from 'react';
import {
  AlertCircle,
  Building,
  Check,
  Edit3,
  Flame,
  Heart,
  Home,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  User,
  UserPlus,
  Users,
  UtensilsCrossed,
  Wind,
  X,
} from 'lucide-react';
import type {
  AgeGroup,
  AirFiltration,
  CommuteMode,
  FamilyMember,
  FloorElevation,
  HealthSensitivity,
  HouseholdProfile,
  HouseholdTrigger,
  KitchenExhaust,
  OccupationType,
  PeakOutdoorWindow,
} from '../types';

interface HouseholdMatrixProps {
  household: HouseholdProfile;
  isEditing: boolean;
  onEdit: () => void;
  onSubmit: () => { success: boolean; error?: string };
  onClear: () => void;
  onUpdateElevation: (elevation: FloorElevation) => void;
  onUpdateKitchenExhaust: (exhaust: KitchenExhaust) => void;
  onUpdateAirFiltration: (filter: AirFiltration) => void;
  onToggleTrigger: (trigger: HouseholdTrigger) => void;
  onAddMember: (member: Omit<FamilyMember, 'id'>) => void;
  onUpdateMember: (id: string, updates: Partial<FamilyMember>) => void;
  onRemoveMember: (id: string) => void;
}

export const HouseholdMatrix: React.FC<HouseholdMatrixProps> = ({
  household,
  isEditing,
  onEdit,
  onSubmit,
  onClear,
  onUpdateElevation,
  onUpdateKitchenExhaust,
  onUpdateAirFiltration,
  onToggleTrigger,
  onAddMember,
  onUpdateMember,
  onRemoveMember,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form State for Adding / Editing a Member
  const [name, setName] = useState('');
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('adult');
  const [sensitivity, setSensitivity] = useState<HealthSensitivity>('none');
  const [occupation, setOccupation] = useState<OccupationType>('office_hybrid');
  const [commuteMode, setCommuteMode] = useState<CommuteMode>('metro_train');
  const [peakWindow, setPeakWindow] = useState<PeakOutdoorWindow>('morning_7_10');

  const openAddModal = () => {
    setEditingMember(null);
    setName('');
    setAgeGroup('adult');
    setSensitivity('none');
    setOccupation('office_hybrid');
    setCommuteMode('metro_train');
    setPeakWindow('morning_7_10');
    setIsModalOpen(true);
  };

  const openEditModal = (mem: FamilyMember) => {
    setEditingMember(mem);
    setName(mem.name);
    setAgeGroup(mem.ageGroup);
    setSensitivity(mem.sensitivity);
    setOccupation(mem.occupation);
    setCommuteMode(mem.commuteMode);
    setPeakWindow(mem.peakWindow);
    setIsModalOpen(true);
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingMember) {
      onUpdateMember(editingMember.id, {
        name: name.trim(),
        ageGroup,
        sensitivity,
        occupation,
        commuteMode,
        peakWindow,
      });
    } else {
      onAddMember({
        name: name.trim(),
        ageGroup,
        sensitivity,
        occupation,
        commuteMode,
        peakWindow,
      });
    }
    setValidationError(null);
    setIsModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = onSubmit();
    if (!result.success) {
      setValidationError(result.error || 'Please complete all required fields.');
    } else {
      setValidationError(null);
    }
  };

  // -------------------------------------------------------------------------
  // SUBMISSION VIEW (When profile is submitted and NOT currently editing)
  // -------------------------------------------------------------------------
  if (household.isSubmitted && !isEditing) {
    const elevationLabel =
      household.elevation === 'high_8_plus'
        ? '8th+ Floor (High-Rise Plume)'
        : household.elevation === 'ground_1_2'
        ? 'Ground / 1st–2nd Floor'
        : '3rd–7th Floor (Mid-Rise)';

    const exhaustLabel =
      household.kitchenExhaust === 'ducted_chimney'
        ? 'Ducted Chimney'
        : household.kitchenExhaust === 'exhaust_fan'
        ? 'Exhaust Fan Only'
        : 'Open Window / No Exhaust';

    const filtrationLabel =
      household.airFiltration === 'hepa'
        ? 'True HEPA Purifier'
        : household.airFiltration === 'diy_corsi_rosenthal'
        ? 'DIY Corsi-Rosenthal Box'
        : 'None (Passive Envelope)';

    return (
      <section
        aria-label="Submitted Household Profile and Family Matrix"
        className="w-full bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] p-5 sm:p-6 shadow-sm transition-colors duration-200"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--border-subtle)] gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Home className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                Configured Household Profile & Family Matrix
              </h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                ACTIVE PROFILE
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Live recommendations are computing against this exact profile.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Details
            </button>
            <button
              type="button"
              onClick={onClear}
              title="Clear and start with empty form"
              className="p-1.5 text-xs text-[var(--text-muted)] hover:text-rose-600 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Profile Architecture Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)]/50 border border-[var(--border-subtle)]">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
              Floor Elevation
            </span>
            <div className="font-bold text-sm text-[var(--text-primary)] mt-1">
              {elevationLabel}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)]/50 border border-[var(--border-subtle)]">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
              Kitchen Exhaust
            </span>
            <div className="font-bold text-sm text-[var(--text-primary)] mt-1">
              {exhaustLabel}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)]/50 border border-[var(--border-subtle)]">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
              Air Filtration
            </span>
            <div className="font-bold text-sm text-[var(--text-primary)] mt-1">
              {filtrationLabel}
            </div>
          </div>
        </div>

        {/* Active Domestic Triggers */}
        {household.triggers.length > 0 && (
          <div className="mt-3.5 p-3 rounded-xl bg-[var(--bg-secondary)]/30 border border-[var(--border-subtle)] flex items-center gap-2 flex-wrap text-xs">
            <span className="font-semibold text-[var(--text-muted)] uppercase text-[10px] tracking-wider flex items-center gap-1">
              <Flame className="w-3 h-3 text-rose-500" /> Active Triggers:
            </span>
            {household.triggers.map((t) => (
              <span
                key={t}
                className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20"
              >
                {t === 'tadka'
                  ? 'High-Heat Tadka'
                  : t === 'agarbatti'
                  ? 'Agarbatti / Dhoop'
                  : t === 'mosquito_coils'
                  ? 'Mosquito Coils'
                  : 'Dry Jhadu (Brooming)'}
              </span>
            ))}
          </div>
        )}

        {/* Configured Family Members */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-teal-600" />
              Configured Family Members ({household.members.length})
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {household.members.map((mem) => {
              const isTwoWheeler = mem.commuteMode === 'two_wheeler_auto';
              return (
                <div
                  key={mem.id}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/40 p-3.5 flex flex-col justify-between"
                >
                  <div>
                    <h5 className="font-bold text-sm text-[var(--text-primary)]">{mem.name}</h5>
                    <span className="text-[11px] text-[var(--text-muted)] font-medium capitalize">
                      {mem.ageGroup} • {mem.occupation.replace(/_/g, ' ')}
                    </span>

                    <div className="flex flex-wrap gap-1 mt-2">
                      {mem.sensitivity !== 'none' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                          <Heart className="w-2.5 h-2.5" />
                          {mem.sensitivity.replace('_', ' ').toUpperCase()}
                        </span>
                      )}

                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                          isTwoWheeler
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-bold'
                            : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                        }`}
                      >
                        {mem.commuteMode.replace(/_/g, ' ')}
                      </span>

                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--bg-primary)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                        {mem.peakWindow
                          .replace('morning_7_10', '7-10 AM')
                          .replace('midday_12_4', '12-4 PM')
                          .replace('evening_6_9', '6-9 PM')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  // -------------------------------------------------------------------------
  // EMPTY / EDIT SETUP FORM VIEW (Prompting User to Fill Actual Values)
  // -------------------------------------------------------------------------
  return (
    <section
      aria-label="Household Configuration Setup Form"
      className="w-full bg-[var(--surface-card)] rounded-2xl border-2 border-teal-500/30 p-5 sm:p-6 shadow-md transition-colors duration-200"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--border-subtle)] gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-black text-[var(--text-primary)] flex items-center gap-2">
              <Home className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              Configure Your Household & Family Profile
            </h3>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              ACTUAL VALUES REQUIRED
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Zero generic advice: Please enter your actual living conditions and add your family members to unlock hyper-personalized explainable AI recommendations.
          </p>
        </div>

        {household.isSubmitted && (
          <button
            type="button"
            onClick={() => onSubmit()}
            className="text-xs font-semibold text-teal-600 hover:underline self-start sm:self-auto"
          >
            Cancel Editing
          </button>
        )}
      </div>

      {/* Validation Alert */}
      {validationError && (
        <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 flex items-center gap-2 text-xs font-medium">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 mt-5">
        {/* Step 1: Floor Elevation */}
        <div>
          <label className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5">
              <Building className="w-4 h-4 text-teal-600" />
              1. Select Building Floor Elevation <span className="text-rose-500">*</span>
            </span>
            <span className="text-[11px] font-normal text-[var(--text-muted)] lowercase">
              {household.elevation ? 'Selected' : 'Required'}
            </span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {[
              {
                id: 'ground_1_2',
                label: 'Ground / 1st–2nd Floor',
                desc: 'Exposed to road dust PM10 & direct tailpipe NO2 wash-off',
              },
              {
                id: 'mid_3_7',
                label: '3rd–7th Floor (Mid-Rise)',
                desc: 'Moderate ambient wind flow and urban particulate dispersion',
              },
              {
                id: 'high_8_plus',
                label: '8th+ High-Rise Plume',
                desc: 'Intercepts regional winter horizontal PM2.5 transport plumes',
              },
            ].map((item) => {
              const isSelected = household.elevation === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onUpdateElevation(item.id as FloorElevation);
                    setValidationError(null);
                  }}
                  className={`text-left p-3 rounded-xl border text-xs transition-all ${
                    isSelected
                      ? 'bg-teal-500/15 border-teal-500 text-teal-900 dark:text-teal-200 ring-2 ring-teal-500/20 shadow-sm'
                      : 'bg-[var(--bg-secondary)]/50 border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="font-bold text-[var(--text-primary)] flex items-center justify-between">
                    <span>{item.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-teal-600 dark:text-teal-400" />}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-1">{item.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Kitchen Exhaust Setup */}
        <div>
          <label className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5">
              <UtensilsCrossed className="w-4 h-4 text-amber-500" />
              2. Select Kitchen Exhaust Setup <span className="text-rose-500">*</span>
            </span>
            <span className="text-[11px] font-normal text-[var(--text-muted)] lowercase">
              {household.kitchenExhaust ? 'Selected' : 'Required'}
            </span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {[
              {
                id: 'ducted_chimney',
                label: 'Ducted Chimney',
                desc: 'Mechanical hood ducting oil aerosols outside the residence',
              },
              {
                id: 'exhaust_fan',
                label: 'Exhaust Fan Only',
                desc: 'Wall propeller fan, susceptible to reverse winter wind drafts',
              },
              {
                id: 'open_window_none',
                label: 'Open Window / No Exhaust',
                desc: 'Cooking aerosol plumes spill directly into bedrooms and hall',
              },
            ].map((item) => {
              const isSelected = household.kitchenExhaust === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onUpdateKitchenExhaust(item.id as KitchenExhaust);
                    setValidationError(null);
                  }}
                  className={`text-left p-3 rounded-xl border text-xs transition-all ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20 shadow-sm'
                      : 'bg-[var(--bg-secondary)]/50 border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="font-bold text-[var(--text-primary)] flex items-center justify-between">
                    <span>{item.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-1">{item.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 3: Air Filtration Setup */}
        <div>
          <label className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5">
              <Wind className="w-4 h-4 text-indigo-500" />
              3. Select Active Air Purifier / Filtration <span className="text-rose-500">*</span>
            </span>
            <span className="text-[11px] font-normal text-[var(--text-muted)] lowercase">
              {household.airFiltration ? 'Selected' : 'Required'}
            </span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {[
              {
                id: 'hepa',
                label: 'True HEPA Purifier (H13/H14)',
                desc: 'Sealed commercial mechanical air scrubber with carbon pre-filter',
              },
              {
                id: 'diy_corsi_rosenthal',
                label: 'DIY Corsi-Rosenthal Box',
                desc: 'Box fan with 4x MERV13 furnace filters (high clean air CADR)',
              },
              {
                id: 'none',
                label: 'No Active Air Purifier',
                desc: 'Home relies solely on window sealing and perimeter envelope',
              },
            ].map((item) => {
              const isSelected = household.airFiltration === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onUpdateAirFiltration(item.id as AirFiltration);
                    setValidationError(null);
                  }}
                  className={`text-left p-3 rounded-xl border text-xs transition-all ${
                    isSelected
                      ? 'bg-indigo-500/15 border-indigo-500 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20 shadow-sm'
                      : 'bg-[var(--bg-secondary)]/50 border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="font-bold text-[var(--text-primary)] flex items-center justify-between">
                    <span>{item.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-1">{item.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 4: Cultural Triggers (Optional) */}
        <div className="pt-2">
          <label className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <Flame className="w-4 h-4 text-rose-500" />
            4. Cultural & Domestic Emission Triggers (Select all that happen in your home)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              {
                id: 'tadka',
                title: 'High-Heat Tadka / Frying',
                detail: 'Mustard oil smoke & aerosol spikes',
              },
              {
                id: 'agarbatti',
                title: 'Agarbatti / Dhoop / Camphor',
                detail: 'Incense smoldering in puja room',
              },
              {
                id: 'mosquito_coils',
                title: 'Mosquito Coils Burning',
                detail: 'Pyrethroid and benzene emissions',
              },
              {
                id: 'dry_jhadu',
                title: 'Dry Jhadu (Brooming)',
                detail: 'Mechanical resuspension of dust',
              },
            ].map((trigger) => {
              const isActive = household.triggers.includes(trigger.id as HouseholdTrigger);
              return (
                <button
                  key={trigger.id}
                  type="button"
                  onClick={() => onToggleTrigger(trigger.id as HouseholdTrigger)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isActive
                      ? 'bg-rose-500/15 border-rose-500/50 text-rose-900 dark:text-rose-200 shadow-sm'
                      : 'bg-[var(--bg-secondary)]/40 border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-xs">
                    <span>{trigger.title}</span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isActive ? 'bg-rose-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    />
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-1">{trigger.detail}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 5: Family Members Matrix */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-teal-600" />
              5. Add Family Members <span className="text-rose-500">* (At least 1 required)</span>
            </label>
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              + Add Person
            </button>
          </div>

          {household.members.length === 0 ? (
            <div className="p-6 rounded-xl border-2 border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)]/30 text-center space-y-2">
              <Users className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-60" />
              <p className="text-xs font-semibold text-[var(--text-primary)]">
                No family members configured yet.
              </p>
              <p className="text-[11px] text-[var(--text-muted)] max-w-sm mx-auto">
                Add at least one household member (e.g. yourself, child, parent) to compute their exact physical breathing volume and commute exposure.
              </p>
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-colors mt-2"
              >
                <Plus className="w-4 h-4" />
                Add First Family Member
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {household.members.map((mem) => {
                const isTwoWheeler = mem.commuteMode === 'two_wheeler_auto';
                return (
                  <div
                    key={mem.id}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 p-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h5 className="font-bold text-sm text-[var(--text-primary)]">{mem.name}</h5>
                          <span className="text-[11px] text-[var(--text-muted)] capitalize">
                            {mem.ageGroup} • {mem.occupation.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(mem)}
                            className="p-1 text-[var(--text-muted)] hover:text-teal-600"
                          >
                            <User className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveMember(mem.id)}
                            className="p-1 text-[var(--text-muted)] hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 mt-2">
                        {mem.sensitivity !== 'none' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400">
                            {mem.sensitivity.replace('_', ' ').toUpperCase()}
                          </span>
                        )}
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            isTwoWheeler
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold'
                              : 'bg-[var(--bg-primary)] text-[var(--text-secondary)]'
                          }`}
                        >
                          {mem.commuteMode.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Submit Form Action Bar */}
        <div className="pt-4 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-[var(--text-muted)]">
            * All data is stored purely in client-side localStorage. No personal identifiers leave your browser.
          </p>

          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-2.5 text-xs sm:text-sm font-extrabold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Save Profile & Generate Assistant</span>
          </button>
        </div>
      </form>

      {/* Add / Edit Member Modal Dialog */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border-strong)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h4 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <User className="w-4 h-4 text-teal-600" />
                {editingMember ? 'Edit Family Member' : 'Add Family Member'}
              </h4>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Name / Role
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Myself, Priya, Son (Kabir), Grandfather"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Age Group
                  </label>
                  <select
                    value={ageGroup}
                    onChange={(e) => setAgeGroup(e.target.value as AgeGroup)}
                    className="w-full px-2.5 py-2 text-xs rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="child">Child (0–12 yrs)</option>
                    <option value="adult">Teen/Adult (13–59 yrs)</option>
                    <option value="senior">Senior (60+ yrs)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Health Sensitivity
                  </label>
                  <select
                    value={sensitivity}
                    onChange={(e) => setSensitivity(e.target.value as HealthSensitivity)}
                    className="w-full px-2.5 py-2 text-xs rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="none">None (Standard)</option>
                    <option value="asthma_bronchitis">Asthma / Bronchitis</option>
                    <option value="cardiac_hypertension">Cardiac / Hypertension</option>
                    <option value="pregnant">Pregnant</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Occupation Type
                  </label>
                  <select
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value as OccupationType)}
                    className="w-full px-2.5 py-2 text-xs rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="student">School / College Student</option>
                    <option value="office_hybrid">Office / Hybrid Worker</option>
                    <option value="two_wheeler_field">Two-Wheeler Field / Delivery</option>
                    <option value="homemaker_wfh">Homemaker / WFH</option>
                    <option value="retired">Retired</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Commute Mode
                  </label>
                  <select
                    value={commuteMode}
                    onChange={(e) => setCommuteMode(e.target.value as CommuteMode)}
                    className="w-full px-2.5 py-2 text-xs rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="metro_train">Metro / AC Train</option>
                    <option value="closed_car">Closed Car / Cab</option>
                    <option value="two_wheeler_auto">Two-Wheeler / Open Auto</option>
                    <option value="walk_bus">Walk / School Bus</option>
                    <option value="none">Zero Commute</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Peak Outdoor Window
                </label>
                <select
                  value={peakWindow}
                  onChange={(e) => setPeakWindow(e.target.value as PeakOutdoorWindow)}
                  className="w-full px-2.5 py-2 text-xs rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="morning_7_10">Morning (7:00 AM – 10:00 AM) — Inversion Peak</option>
                  <option value="midday_12_4">Midday (12:00 PM – 4:00 PM) — Solar Break</option>
                  <option value="evening_6_9">Evening (6:00 PM – 9:00 PM) — Traffic Peak</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
                >
                  {editingMember ? 'Update Member' : 'Save Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
