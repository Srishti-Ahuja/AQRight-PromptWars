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

  // Geolocation state
  const [isGeolocating, setIsGeolocating] = useState<boolean>(false);
  const [geoError, setGeoError] = useState<string | null>(null);

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

  /** Use browser Geolocation API to detect user's current coordinates and load telemetry for it. */
  const geolocate = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    setIsGeolocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        // Reverse-geocode to get a human-readable name via Open-Meteo
        let locationName = 'My Location';
        let locality = 'Current GPS Location';
        let city = 'India';
        let state = 'India';
        try {
          const nomUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`;
          const resp = await fetch(nomUrl, { headers: { 'Accept-Language': 'en' } });
          if (resp.ok) {
            const geo = await resp.json() as {
              display_name?: string;
              address?: {
                suburb?: string;
                neighbourhood?: string;
                city?: string;
                town?: string;
                village?: string;
                county?: string;
                state?: string;
                country?: string;
              };
            };
            const addr = geo.address ?? {};
            const area = addr.suburb ?? addr.neighbourhood ?? addr.county ?? '';
            city = addr.city ?? addr.town ?? addr.village ?? 'India';
            state = addr.state ?? 'India';
            locality = area ? `${area}, ${city}` : city;
            locationName = area ? `${area}, ${state}` : `${city}, ${state}`;
          }
        } catch {
          // Fallback to coordinate label if reverse geocoding fails
          locationName = `${latitude.toFixed(3)}°N, ${longitude.toFixed(3)}°E`;
          locality = 'GPS Detected Location';
        }

        const geoPreset: CityPreset = {
          id: `gps-${latitude.toFixed(4)}-${longitude.toFixed(4)}`,
          name: locationName,
          locality,
          city,
          state,
          latitude,
          longitude,
          monitoringAgency: 'Open-Meteo Air Quality Mesh (GPS)',
          isPreset: false,
        };
        setSelectedPreset(geoPreset);
        setSearchQuery('');
        setSearchResults([]);
        setIsGeolocating(false);
      },
      (err) => {
        setIsGeolocating(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGeoError('Location access denied. Please allow location in browser settings.');
            break;
          case err.POSITION_UNAVAILABLE:
            setGeoError('Location unavailable. Try searching by city name instead.');
            break;
          case err.TIMEOUT:
            setGeoError('Location request timed out. Try again.');
            break;
          default:
            setGeoError('Could not determine your location.');
        }
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }, []);

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
    geolocate,
    isGeolocating,
    geoError,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    presets: INDIAN_STATION_PRESETS,
  };
}
