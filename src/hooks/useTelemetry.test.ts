import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTelemetry } from './useTelemetry';
import * as api from '../lib/api';
import { INDIAN_STATION_PRESETS } from '../lib/constants';
import type { TelemetryData } from '../types';

const mockTelemetryData: TelemetryData = {
  stationName: 'Anand Vihar, Delhi',
  locality: 'Anand Vihar ISBT',
  city: 'Delhi',
  state: 'Delhi (NCT)',
  latitude: 28.6469,
  longitude: 77.316,
  lastUpdated: '10:00 AM',
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
  },
  hourly: [],
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
    recommendationText: 'Ventilate between 12:00 and 15:00',
  },
};

describe('useTelemetry hook', () => {
  const originalGeolocation = navigator.geolocation;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.spyOn(api, 'fetchTelemetry').mockResolvedValue(mockTelemetryData);
  });

  afterEach(() => {
    sessionStorage.clear();
    globalThis.fetch = originalFetch;
    Object.defineProperty(navigator, 'geolocation', {
      value: originalGeolocation,
      writable: true,
      configurable: true,
    });
  });

  it('loads telemetry on mount for default preset', async () => {
    const { result } = renderHook(() => useTelemetry());

    expect(result.current.loading).toBe(true);
    expect(result.current.selectedPreset).toEqual(INDIAN_STATION_PRESETS[0]);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.telemetry).toEqual(mockTelemetryData);
    expect(result.current.error).toBeNull();
  });

  it('handles telemetry loading error gracefully', async () => {
    vi.spyOn(api, 'fetchTelemetry').mockRejectedValueOnce(new Error('Network failure'));

    const { result } = renderHook(() => useTelemetry());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network failure');
    expect(result.current.telemetry).toBeNull();
  });

  it('handles telemetry non-Error exception gracefully', async () => {
    vi.spyOn(api, 'fetchTelemetry').mockRejectedValueOnce('Some string error');

    const { result } = renderHook(() => useTelemetry());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch telemetry');
  });

  it('switches preset via selectPreset and resets search', async () => {
    const { result } = renderHook(() => useTelemetry());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const targetPreset = INDIAN_STATION_PRESETS[1];
    act(() => {
      result.current.setSearchQuery('query');
      result.current.selectPreset(targetPreset);
    });

    expect(result.current.selectedPreset).toEqual(targetPreset);
    expect(result.current.searchQuery).toBe('');
    expect(result.current.searchResults).toEqual([]);
  });

  it('switches location via selectCustomLocation', async () => {
    const { result } = renderHook(() => useTelemetry());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const customLoc = {
      id: 'custom-1',
      name: 'Custom Spot',
      locality: 'Custom Locality',
      city: 'Pune',
      state: 'Maharashtra',
      latitude: 18.5204,
      longitude: 73.8567,
      monitoringAgency: 'Custom Agency',
    };

    act(() => {
      result.current.selectCustomLocation(customLoc);
    });

    expect(result.current.selectedPreset).toEqual(customLoc);
  });

  it('debounces and executes city search when query length >= 2', async () => {
    vi.useFakeTimers();
    const mockSearchResults = [
      {
        id: '1',
        name: 'Noida Sector 62',
        locality: 'Sector 62',
        city: 'Noida',
        state: 'Uttar Pradesh',
        latitude: 28.62,
        longitude: 77.36,
        monitoringAgency: 'UPPCB',
      },
    ];
    const searchSpy = vi.spyOn(api, 'searchIndianCities').mockResolvedValue(mockSearchResults);

    const { result } = renderHook(() => useTelemetry());

    act(() => {
      result.current.setSearchQuery('Noida');
    });

    expect(result.current.isSearching).toBe(true);

    // Fast-forward past the 350ms debounce
    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    expect(searchSpy).toHaveBeenCalledWith('Noida');
    expect(result.current.searchResults).toEqual(mockSearchResults);
    expect(result.current.isSearching).toBe(false);

    // Now clear query
    act(() => {
      result.current.setSearchQuery(' ');
    });
    expect(result.current.searchResults).toEqual([]);

    vi.useRealTimers();
  });

  it('handles search failure gracefully', async () => {
    vi.useFakeTimers();
    vi.spyOn(api, 'searchIndianCities').mockRejectedValue(new Error('Search failed'));

    const { result } = renderHook(() => useTelemetry());

    act(() => {
      result.current.setSearchQuery('UnknownPlace');
    });

    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    expect(result.current.searchResults).toEqual([]);
    expect(result.current.isSearching).toBe(false);

    vi.useRealTimers();
  });

  it('handles geolocation when navigator.geolocation is unavailable', () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useTelemetry());

    act(() => {
      result.current.geolocate();
    });

    expect(result.current.geoError).toBe('Geolocation is not supported by your browser.');
  });

  it('geolocates successfully and reverses geocode via Nominatim', async () => {
    const mockGetCurrentPosition = vi.fn().mockImplementation((success) => {
      success({
        coords: {
          latitude: 28.5355,
          longitude: 77.391,
        },
      });
    });

    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition: mockGetCurrentPosition },
      writable: true,
      configurable: true,
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          address: {
            suburb: 'Sector 18',
            city: 'Noida',
            state: 'Uttar Pradesh',
          },
        }),
    });

    const { result } = renderHook(() => useTelemetry());

    act(() => {
      result.current.geolocate();
    });

    await waitFor(() => {
      expect(result.current.isGeolocating).toBe(false);
    });

    expect(result.current.selectedPreset.name).toContain('Sector 18');
    expect(result.current.selectedPreset.latitude).toBe(28.5355);
  });

  it('geolocates successfully with coordinate fallback when reverse geocode fails', async () => {
    const mockGetCurrentPosition = vi.fn().mockImplementation((success) => {
      success({
        coords: {
          latitude: 28.5355,
          longitude: 77.391,
        },
      });
    });

    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition: mockGetCurrentPosition },
      writable: true,
      configurable: true,
    });

    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Reverse geocode failure'));

    const { result } = renderHook(() => useTelemetry());

    act(() => {
      result.current.geolocate();
    });

    await waitFor(() => {
      expect(result.current.isGeolocating).toBe(false);
    });

    expect(result.current.selectedPreset.name).toContain('28.535°N');
  });

  it('handles geolocation errors (PERMISSION_DENIED, POSITION_UNAVAILABLE, TIMEOUT, other)', async () => {
    const makeErrorScenario = (code: number) => ({
      getCurrentPosition: vi.fn().mockImplementation((_, error) => {
        error({
          code,
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        });
      }),
    });

    // 1. PERMISSION_DENIED
    Object.defineProperty(navigator, 'geolocation', {
      value: makeErrorScenario(1),
      writable: true,
      configurable: true,
    });
    const { result: r1 } = renderHook(() => useTelemetry());
    act(() => {
      r1.current.geolocate();
    });
    expect(r1.current.geoError).toContain('Location access denied');

    // 2. POSITION_UNAVAILABLE
    Object.defineProperty(navigator, 'geolocation', {
      value: makeErrorScenario(2),
      writable: true,
      configurable: true,
    });
    const { result: r2 } = renderHook(() => useTelemetry());
    act(() => {
      r2.current.geolocate();
    });
    expect(r2.current.geoError).toContain('Location unavailable');

    // 3. TIMEOUT
    Object.defineProperty(navigator, 'geolocation', {
      value: makeErrorScenario(3),
      writable: true,
      configurable: true,
    });
    const { result: r3 } = renderHook(() => useTelemetry());
    act(() => {
      r3.current.geolocate();
    });
    expect(r3.current.geoError).toContain('Location request timed out');

    // 4. Default / unknown error
    Object.defineProperty(navigator, 'geolocation', {
      value: makeErrorScenario(99),
      writable: true,
      configurable: true,
    });
    const { result: r4 } = renderHook(() => useTelemetry());
    act(() => {
      r4.current.geolocate();
    });
    expect(r4.current.geoError).toContain('Could not determine your location');
  });

  it('refresh clears cache and reloads telemetry', async () => {
    const fetchSpy = vi.spyOn(api, 'fetchTelemetry').mockResolvedValue(mockTelemetryData);
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');

    const { result } = renderHook(() => useTelemetry());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      result.current.refresh();
    });

    expect(removeItemSpy).toHaveBeenCalled();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
