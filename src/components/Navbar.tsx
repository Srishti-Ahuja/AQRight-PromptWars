import React, { useEffect, useState } from 'react';
import {
  Activity,
  Check,
  Moon,
  RotateCw,
  Search,
  Sun,
  Wind,
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

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-[var(--border-subtle)] bg-[var(--surface-card)]/90 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

          {/* Location Autocomplete & Search */}
          <div className="relative flex-1 max-w-md hidden md:block">
            <div className="relative">
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
                placeholder="Search Indian city, district, or CPCB hub..."
                aria-label="Search Indian city or monitoring station"
                className="w-full pl-9 pr-8 py-1.5 text-xs sm:text-sm rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Activity className="w-3.5 h-3.5 animate-spin text-teal-600" />
                </div>
              )}
            </div>

            {/* Autocomplete Dropdown */}
            {isDropdownOpen && (searchResults.length > 0 || presets.length > 0) && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute left-0 right-0 mt-1.5 z-20 max-h-72 overflow-y-auto rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-strong)] shadow-xl p-1.5">
                  {searchResults.length > 0 ? (
                    <div className="space-y-0.5">
                      <div className="px-2 py-1 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                        Search Results
                      </div>
                      {searchResults.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            onSelectPreset(item);
                            setIsDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs rounded-md hover:bg-teal-500/10 hover:text-teal-600 dark:hover:text-teal-400 flex items-center justify-between text-[var(--text-primary)] transition-colors"
                        >
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-[11px] text-[var(--text-muted)]">{item.locality}</div>
                          </div>
                          {selectedPreset.id === item.id && (
                            <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <div className="px-2 py-1 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                        Quick CPCB Hub Presets
                      </div>
                      {presets.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            onSelectPreset(preset);
                            setIsDropdownOpen(false);
                          }}
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
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right Action Controls: Refresh, Time, & Theme Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            {lastUpdated && (
              <span className="hidden xl:inline text-[11px] text-[var(--text-muted)]">
                Updated {lastUpdated}
              </span>
            )}

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
        </div>
      </div>
    </header>
  );
};
