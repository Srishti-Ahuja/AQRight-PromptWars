import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Check,
  Locate,
  Moon,
  RotateCw,
  Search,
  Sun,
  Wind,
  X,
} from 'lucide-react';
import type { CityPreset } from '../types';

interface NavbarProps {
  selectedPreset: CityPreset;
  presets: CityPreset[];
  onSelectPreset: (preset: CityPreset) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchResults: CityPreset[];
  isSearching: boolean;
  onGeolocate: () => void;
  isGeolocating: boolean;
  geoError: string | null;
  onRefresh: () => void;
  isLoading: boolean;
  lastUpdated?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  selectedPreset,
  presets,
  onSelectPreset,
  searchQuery,
  onSearchChange,
  searchResults,
  isSearching,
  onGeolocate,
  isGeolocating,
  geoError,
  onRefresh,
  isLoading,
  lastUpdated,
}) => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aqright-theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('aqright-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('aqright-theme', 'light');
    }
  }, [isDark]);

  // Auto-focus mobile input when opened
  useEffect(() => {
    if (isMobileSearchOpen) {
      setTimeout(() => mobileInputRef.current?.focus(), 50);
    }
  }, [isMobileSearchOpen]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  const handleSelect = (preset: CityPreset) => {
    onSelectPreset(preset);
    setIsDropdownOpen(false);
    setIsMobileSearchOpen(false);
  };

  const handleGeolocate = () => {
    onGeolocate();
    setIsDropdownOpen(false);
    setIsMobileSearchOpen(false);
  };

  const hasSearchQuery = searchQuery.trim().length >= 2;
  const showNoResults = hasSearchQuery && !isSearching && searchResults.length === 0;

  const renderDropdownContent = () => (
    <div className="p-1.5 space-y-0.5">
      {/* GPS Locate button */}
      <button
        type="button"
        onClick={handleGeolocate}
        disabled={isGeolocating}
        className="w-full text-left px-3 py-2.5 text-xs rounded-md hover:bg-teal-500/10 hover:text-teal-600 dark:hover:text-teal-400 flex items-center gap-2.5 text-[var(--text-primary)] transition-colors border border-dashed border-teal-500/40 mb-1"
      >
        <Locate className={`w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0 ${isGeolocating ? 'animate-pulse' : ''}`} />
        <div>
          <div className="font-semibold text-teal-700 dark:text-teal-300">
            {isGeolocating ? 'Detecting location…' : 'Use my current location'}
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">GPS · Works anywhere in India</div>
        </div>
      </button>

      {geoError && (
        <div className="px-3 py-2 text-[11px] text-red-600 dark:text-red-400 bg-red-500/10 rounded-md">
          {geoError}
        </div>
      )}

      {/* Search results or presets */}
      {hasSearchQuery ? (
        isSearching ? (
          <div className="flex items-center gap-2 px-3 py-3 text-xs text-[var(--text-muted)]">
            <Activity className="w-3.5 h-3.5 animate-spin text-teal-600" />
            Searching across India…
          </div>
        ) : showNoResults ? (
          <div className="px-3 py-3 text-xs text-[var(--text-muted)]">
            <p className="font-medium text-[var(--text-secondary)]">No locations found for "{searchQuery}"</p>
            <p className="mt-0.5">Try a different spelling, or use GPS above.</p>
          </div>
        ) : (
          <>
            <div className="px-2 pt-1 pb-0.5 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Search Results
            </div>
            {searchResults.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full text-left px-3 py-2 text-xs rounded-md hover:bg-teal-500/10 hover:text-teal-600 dark:hover:text-teal-400 flex items-center justify-between text-[var(--text-primary)] transition-colors"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{item.name}</div>
                  <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5 mt-0.5">
                    {item.isPreset ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-400 text-[10px] font-semibold shrink-0">
                        CPCB Hub
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-400 text-[10px] font-semibold shrink-0">
                        Live Mesh
                      </span>
                    )}
                    <span className="truncate">{item.locality}</span>
                  </div>
                </div>
                {selectedPreset.id === item.id && (
                  <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0 ml-2" />
                )}
              </button>
            ))}
          </>
        )
      ) : (
        <>
          <div className="px-2 pt-1 pb-0.5 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Quick CPCB Hub Presets
          </div>
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelect(preset)}
              className={`w-full text-left px-3 py-1.5 text-xs rounded-md flex items-center justify-between transition-colors ${
                selectedPreset.id === preset.id
                  ? 'bg-teal-500/15 text-teal-700 dark:text-teal-300 font-semibold'
                  : 'hover:bg-[var(--bg-secondary)] text-[var(--text-primary)]'
              }`}
            >
              <span>{preset.name}</span>
              {selectedPreset.id === preset.id && (
                <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              )}
            </button>
          ))}
          <div className="px-2 pt-2 pb-1 text-[11px] text-[var(--text-muted)] border-t border-[var(--border-subtle)] mt-1">
            Type any city, district, or pin code to search all of India
          </div>
        </>
      )}
    </div>
  );

  return (
    <header className="sticky top-0 z-30 w-full border-b border-[var(--border-subtle)] bg-[var(--surface-card)]/90 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Mobile search overlay */}
        {isMobileSearchOpen && (
          <div className="fixed inset-0 z-50 bg-[var(--surface-card)] flex flex-col md:hidden">
            <div className="flex items-center gap-2 p-3 border-b border-[var(--border-subtle)]">
              <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" aria-hidden="true" />
              <input
                ref={mobileInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="City, district, area, pin code…"
                aria-label="Search Indian location"
                className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  setIsMobileSearchOpen(false);
                  onSearchChange('');
                }}
                className="p-1 rounded-md hover:bg-[var(--bg-secondary)]"
                aria-label="Close search"
              >
                <X className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {renderDropdownContent()}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo & Live Sync Indicator */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-400 flex items-center justify-center shadow-md shadow-teal-500/20 text-white font-black tracking-tight text-xl">
              AQ
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-[var(--text-primary)]">
                  AQ<span className="text-teal-600 dark:text-teal-400">Right</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-glow" />
                  LIVE CPCB/OPEN-METEO SYNC
                </span>
              </div>
              <p className="hidden sm:block text-[11px] text-[var(--text-muted)] font-medium">
                XAI Smog & Inversion Layer Assistant for Indian Households
              </p>
            </div>
          </div>

          {/* Desktop Location Search */}
          <div className="relative flex-1 max-w-md hidden md:block">
            <div className="relative flex items-center gap-1.5">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    onSearchChange(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder="Search any city, district, area in India…"
                  aria-label="Search Indian city or monitoring station"
                  className="w-full pl-9 pr-8 py-1.5 text-xs sm:text-sm rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Activity className="w-3.5 h-3.5 animate-spin text-teal-600" />
                  </div>
                )}
                {searchQuery && !isSearching && (
                  <button
                    type="button"
                    onClick={() => { onSearchChange(''); setIsDropdownOpen(false); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-[var(--border-subtle)]"
                    aria-label="Clear search"
                  >
                    <X className="w-3 h-3 text-[var(--text-muted)]" />
                  </button>
                )}
              </div>

              {/* GPS button — desktop */}
              <button
                type="button"
                onClick={() => { handleGeolocate(); setIsDropdownOpen(false); }}
                disabled={isGeolocating}
                title="Use my current location"
                aria-label="Detect my GPS location"
                className={`shrink-0 p-2 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  isGeolocating
                    ? 'border-teal-500 text-teal-600 bg-teal-500/10'
                    : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-teal-600 hover:border-teal-500/50 hover:bg-teal-500/5'
                }`}
              >
                <Locate className={`w-4 h-4 ${isGeolocating ? 'animate-pulse' : ''}`} />
              </button>
            </div>

            {/* Desktop Dropdown */}
            {isDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute left-0 right-0 mt-1.5 z-20 max-h-80 overflow-y-auto rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-strong)] shadow-xl">
                  {renderDropdownContent()}
                </div>
              </>
            )}
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {lastUpdated && (
              <span className="hidden xl:inline text-[11px] text-[var(--text-muted)]">
                Updated {lastUpdated}
              </span>
            )}

            {/* Mobile: search icon to open overlay */}
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen(true)}
              aria-label="Search location"
              title="Search location"
              className="md:hidden p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] border border-[var(--border-subtle)] focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Mobile: GPS button */}
            <button
              type="button"
              onClick={handleGeolocate}
              disabled={isGeolocating}
              aria-label="Detect my GPS location"
              title="Use my current location"
              className={`md:hidden p-2 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                isGeolocating
                  ? 'border-teal-500 text-teal-600 bg-teal-500/10'
                  : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-teal-600 hover:border-teal-500/50'
              }`}
            >
              <Locate className={`w-4 h-4 ${isGeolocating ? 'animate-pulse' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh live telemetry"
              aria-label="Refresh live telemetry"
              className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] border border-[var(--border-subtle)] focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
            >
              <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-teal-600' : ''}`} />
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-pressed={isDark}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] border border-[var(--border-subtle)] focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Quick-Select Station Pills Ribbon */}
        <div className="py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-t border-[var(--border-subtle)]/60 text-xs">
          <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Wind className="w-3 h-3 text-teal-600" /> Hotspots:
          </span>
          {presets.map((preset) => {
            const isSelected = selectedPreset.id === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectPreset(preset)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-teal-600 text-white shadow-sm shadow-teal-500/30'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)] border border-[var(--border-subtle)]'
                }`}
              >
                {preset.city}: {preset.name.split(',')[0]}
              </button>
            );
          })}
          {/* Show custom location pill if user has a non-preset selected */}
          {!selectedPreset.isPreset && (
            <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-600 text-white shadow-sm shadow-sky-500/30 flex items-center gap-1">
              <Locate className="w-3 h-3" />
              {selectedPreset.city}
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
