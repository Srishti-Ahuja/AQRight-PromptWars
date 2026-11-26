import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownCircle,
  Lock,
} from 'lucide-react';
import { useHousehold } from './hooks/useHousehold';
import { useTelemetry } from './hooks/useTelemetry';
import { generateXAIRecommendations } from './lib/xai-engine';
import { Navbar } from './components/Navbar';
import { TelemetryBanner } from './components/TelemetryBanner';
import { VentilationChart } from './components/VentilationChart';
import { HouseholdMatrix } from './components/HouseholdMatrix';
import { ActionFeed } from './components/ActionFeed';
import { XaiDrawer } from './components/XaiDrawer';
import { CommunitySimulator } from './components/CommunitySimulator';
import type { XAIRecommendation } from './types';

export function App() {
  const {
    telemetry,
    loading,
    error,
    refresh,
    selectedPreset,
    selectPreset,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    presets,
  } = useTelemetry();

  const {
    household,
    isEditing,
    editProfile,
    submitProfile,
    clearProfile,
    updateElevation,
    updateKitchenExhaust,
    updateAirFiltration,
    toggleTrigger,
    addMember,
    updateMember,
    removeMember,
  } = useHousehold();

  const [selectedRecommendation, setSelectedRecommendation] = useState<XAIRecommendation | null>(null);

  // Compute hyper-personalized XAI recommendations only when profile is submitted
  const recommendations = useMemo(() => {
    if (!telemetry || !household.isSubmitted) return [];
    return generateXAIRecommendations(telemetry, household);
  }, [telemetry, household]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col transition-colors duration-200">
      {/* Top Navigation */}
      <Navbar
        selectedPreset={selectedPreset}
        presets={presets}
        onSelectPreset={selectPreset}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchResults={searchResults}
        isSearching={isSearching}
        onRefresh={refresh}
        isLoading={loading}
        lastUpdated={telemetry?.lastUpdated}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Loading Spinner */}
        {loading && !telemetry && (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <Activity className="w-8 h-8 text-teal-600 animate-spin" />
            <p className="text-sm font-semibold text-[var(--text-muted)]">
              Fetching real-time CPCB telemetry and atmospheric boundary layers...
            </p>
          </div>
        )}

        {/* Error Fallback Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>{error} — Operating on fallback atmospheric inversion model.</span>
            </div>
            <button
              type="button"
              onClick={refresh}
              className="font-bold underline text-amber-700 dark:text-amber-300"
            >
              Retry Sync
            </button>
          </div>
        )}

        {telemetry && (
          <>
            {/* Live Indian Telemetry Banner */}
            <TelemetryBanner telemetry={telemetry} />

            {/* 24-Hour Clean Ventilation Window Chart */}
            <VentilationChart telemetry={telemetry} />

            {/* Household Architecture & Family Matrix Setup Form / Submissions Display */}
            <HouseholdMatrix
              household={household}
              isEditing={isEditing}
              onEdit={editProfile}
              onSubmit={submitProfile}
              onClear={clearProfile}
              onUpdateElevation={updateElevation}
              onUpdateKitchenExhaust={updateKitchenExhaust}
              onUpdateAirFiltration={updateAirFiltration}
              onToggleTrigger={toggleTrigger}
              onAddMember={addMember}
              onUpdateMember={updateMember}
              onRemoveMember={removeMember}
            />

            {/* Display Submissions & Personalized Modules ONLY after form is filled */}
            {household.isSubmitted ? (
              <>
                {/* Personalized Action Feed */}
                <ActionFeed
                  recommendations={recommendations}
                  onSelectRecommendation={setSelectedRecommendation}
                  selectedRecommendationId={selectedRecommendation?.id}
                />

                {/* RWA Community Ripple Simulator & Civic Circular Generator */}
                <CommunitySimulator telemetry={telemetry} />
              </>
            ) : (
              /* Helpful Prompt Banner when form is not yet submitted */
              <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-card)] p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto">
                  <Lock className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-[var(--text-primary)]">
                  Personalized XAI Protocols Awaiting Your Household Input
                </h4>
                <p className="text-xs text-[var(--text-secondary)] max-w-lg mx-auto leading-relaxed">
                  AQRight never generates generic advice. Once you complete and submit your actual building floor elevation, kitchen exhaust setup, and family member commute profiles in the form above, your hyper-personalized recommendations, SHAP attribution trees, and RWA civic circulars will unlock instantly.
                </p>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 dark:text-teal-400">
                    <ArrowDownCircle className="w-4 h-4 animate-bounce" />
                    Complete the 5 steps in the form above to proceed
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* XAI Decision Inspector Drawer */}
      <XaiDrawer
        recommendation={selectedRecommendation}
        onClose={() => setSelectedRecommendation(null)}
      />

      {/* Accessible Footer */}
      <footer className="w-full border-t border-[var(--border-subtle)] bg-[var(--surface-card)] py-6 mt-12 text-xs text-[var(--text-muted)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center font-black text-xs">
              AQ
            </div>
            <span className="font-bold text-[var(--text-primary)]">
              AQRight Indian Household Smog Assistant
            </span>
            <span>•</span>
            <span>Privacy-by-Design (100% Client-Side State)</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>CPCB National Ambient Standards</span>
            <span>•</span>
            <span>Berkeley Earth Inhalation Equivalence</span>
            <span>•</span>
            <span>Open-Meteo Ground Mesh</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
