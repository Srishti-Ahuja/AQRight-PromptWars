import { useCallback, useEffect, useRef, useState } from 'react';
import type { CityPreset, TelemetryData } from '../types';
import { fetchTelemetry, searchIndianCities } from '../lib/api';
import { INDIAN_STATION_PRESETS } from '../lib/constants';

export function useTelemetry() {
  const [selectedPreset, setSelectedPreset] = useState<CityPreset>(INDIAN_STATION_PRESETS[0]);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<CityPreset[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const searchTimeoutRef = useRef<number | null>(null);

  const loadTelemetry = useCallback(async (preset: CityPreset) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTelemetry({
        lat: preset.latitude,
        lon: preset.longitude,
        name: preset.name,
        locality: preset.locality,
        city: preset.city,
        state: preset.state,
      });
      setTelemetry(data);
    } catch (err: unknown) {
      console.error('Error fetching telemetry:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch telemetry');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch telemetry whenever selected preset changes
  useEffect(() => {
    loadTelemetry(selectedPreset);
  }, [selectedPreset, loadTelemetry]);

  // Handle debounced search query (350ms)
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = window.setTimeout(async () => {
      try {
        const results = await searchIndianCities(searchQuery);
        setSearchResults(results);
      } catch (e) {
        console.warn('Search error:', e);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const selectPreset = (preset: CityPreset) => {
    setSelectedPreset(preset);
    setSearchQuery('');
    setSearchResults([]);
  };

  const selectCustomLocation = (location: CityPreset) => {
    setSelectedPreset(location);
    setSearchQuery('');
    setSearchResults([]);
  };

  const refresh = () => {
    const cacheKey = `aqright_telemetry_${selectedPreset.latitude.toFixed(4)}_${selectedPreset.longitude.toFixed(4)}`;
    try {
      sessionStorage.removeItem(cacheKey);
    } catch (e) {}
    loadTelemetry(selectedPreset);
  };

  return {
    telemetry,
    loading,
    error,
    refresh,
    selectedPreset,
    selectPreset,
    selectCustomLocation,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    presets: INDIAN_STATION_PRESETS,
  };
}
