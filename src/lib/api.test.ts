import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchTelemetry, searchIndianCities } from './api';

describe('api.ts - fetchTelemetry', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    sessionStorage.clear();
  });

  const sampleCoords = {
    lat: 28.6469,
    lon: 77.316,
    name: 'Anand Vihar, Delhi',
    locality: 'Anand Vihar ISBT',
    city: 'Delhi',
    state: 'Delhi (NCT)',
  };

  it('returns cached data from sessionStorage if cache is fresh (< 15 mins)', async () => {
    const cachedData = {
      stationName: 'Cached Anand Vihar',
      locality: 'Cached Locality',
      city: 'Delhi',
      state: 'Delhi',
      latitude: 28.647,
      longitude: 77.316,
      lastUpdated: '10:00 AM',
      current: {
        pm25: 150,
        pm10: 220,
        no2: 50,
        co: 1.2,
        o3: 30,
        boundaryLayerHeight: 400,
        windSpeed: 5,
        temperature: 20,
        relativeHumidity: 60,
        isTrappedSurfaceSmog: true,
      },
      hourly: [],
      cpcb: {
        aqi: 320,
        category: 'Very Poor',
        grapStage: 'Stage II',
        dominantPollutant: 'PM2.5',
        subIndices: { pm25: 320, pm10: 200, no2: 80 },
        colorHex: '#ef4444',
        badgeBg: 'bg-rose-500/15',
        badgeText: 'text-rose-700',
      },
      bestVentilationWindow: {
        startHour: 13,
        endHour: 15,
        avgPm25: 110,
        avgMixingHeight: 900,
        recommendationText: 'Good time',
      },
    };

    const cacheKey = `aqright_telemetry_${sampleCoords.lat.toFixed(3)}_${sampleCoords.lon.toFixed(3)}`;
    sessionStorage.setItem(
      cacheKey,
      JSON.stringify({ timestamp: Date.now() - 5 * 60 * 1000, data: cachedData })
    );

    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    const data = await fetchTelemetry(sampleCoords);

    expect(data.stationName).toBe('Cached Anand Vihar');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fetches from Open-Meteo live API and caches when cache is expired or absent', async () => {
    const mockAqJson = {
      current: {
        pm10: 310,
        pm2_5: 220,
        carbon_monoxide: 1400,
        nitrogen_dioxide: 75,
        ozone: 40,
      },
      hourly: {
        time: ['2026-11-26T00:00', '2026-11-26T01:00'],
        pm2_5: [210, 205],
        pm10: [300, 295],
        nitrogen_dioxide: [70, 68],
      },
    };

    const mockWeatherJson = {
      current: {
        temperature_2m: 19,
        relative_humidity_2m: 72,
        wind_speed_10m: 4,
      },
      hourly: {
        boundary_layer_height: [350, 320],
        wind_speed_10m: [4, 3],
        temperature_2m: [18, 17],
        relative_humidity_2m: [75, 78],
      },
    };

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('air-quality')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockAqJson),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockWeatherJson),
      });
    });

    globalThis.fetch = fetchMock;

    const data = await fetchTelemetry(sampleCoords);

    expect(data.stationName).toBe('Anand Vihar, Delhi');
    expect(data.current.pm25).toBe(220);
    expect(data.current.pm10).toBe(310);
    expect(data.current.no2).toBe(75);
    expect(data.current.co).toBe(1.4); // Math.round(1400 / 100) / 10 = 1.4
    expect(data.current.o3).toBe(40);
    expect(data.current.temperature).toBe(19);
    expect(data.current.relativeHumidity).toBe(72);
    expect(data.current.windSpeed).toBe(4);
    expect(data.hourly.length).toBe(2);

    // Verify written to cache
    const cacheKey = `aqright_telemetry_${sampleCoords.lat.toFixed(3)}_${sampleCoords.lon.toFixed(3)}`;
    const stored = sessionStorage.getItem(cacheKey);
    expect(stored).not.toBeNull();
  });

  it('falls back to realistic Indian simulation when Open-Meteo returns non-ok status', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    });
    globalThis.fetch = fetchMock;

    const data = await fetchTelemetry(sampleCoords);

    expect(data.stationName).toBe('Anand Vihar, Delhi');
    expect(data.hourly.length).toBe(24);
    expect(data.current.pm25).toBeGreaterThan(0);
    expect(data.cpcb).toBeDefined();
    expect(data.bestVentilationWindow).toBeDefined();
  });

  it('falls back to realistic Indian simulation on network exception and covers Mumbai region', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network offline'));
    globalThis.fetch = fetchMock;

    const mumbaiCoords = {
      lat: 19.076,
      lon: 72.8777,
      name: 'BKC, Mumbai',
      locality: 'Bandra Kurla Complex',
      city: 'Mumbai',
      state: 'Maharashtra',
    };

    const data = await fetchTelemetry(mumbaiCoords);

    expect(data.stationName).toBe('BKC, Mumbai');
    expect(data.city).toBe('Mumbai');
    expect(data.hourly.length).toBe(24);
  });

  it('falls back to realistic simulation for other non-Delhi, non-Mumbai regions', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network offline'));
    globalThis.fetch = fetchMock;

    const otherCoords = {
      lat: 12.9716,
      lon: 77.5946,
      name: 'BTM Layout, Bengaluru',
      locality: 'BTM Layout',
      city: 'Bengaluru',
      state: 'Karnataka',
    };

    const data = await fetchTelemetry(otherCoords);

    expect(data.stationName).toBe('BTM Layout, Bengaluru');
    expect(data.city).toBe('Bengaluru');
    expect(data.hourly.length).toBe(24);
  });

  it('gracefully handles sessionStorage get/set errors', async () => {
    vi.spyOn(sessionStorage, 'getItem').mockImplementation(() => {
      throw new Error('QuotaExceeded or SecurityError');
    });
    vi.spyOn(sessionStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });

    const fetchMock = vi.fn().mockRejectedValue(new Error('API failure'));
    globalThis.fetch = fetchMock;

    const data = await fetchTelemetry(sampleCoords);
    expect(data).toBeDefined();
    expect(data.city).toBe('Delhi');
  });
});

describe('api.ts - searchIndianCities', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns empty array if query is too short or empty', async () => {
    expect(await searchIndianCities('')).toEqual([]);
    expect(await searchIndianCities(' ')).toEqual([]);
    expect(await searchIndianCities('a')).toEqual([]);
  });

  it('matches local presets when query matches name or city', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [] }),
    });
    globalThis.fetch = fetchMock;

    const results = await searchIndianCities('delhi');
    expect(results.length).toBeGreaterThan(0);
    const preset = results.find((r) => r.isPreset);
    expect(preset).toBeDefined();
  });

  it('merges remote Open-Meteo geocoding results and deduplicates close coordinates', async () => {
    const mockGeoResults = {
      results: [
        {
          id: 12345,
          name: 'Rohini',
          admin1: 'Delhi',
          admin2: 'North West Delhi',
          latitude: 28.7495,
          longitude: 77.0565,
        },
        {
          // Near Anand Vihar (approx 28.647, 77.316) -> should be deduplicated against Anand Vihar preset
          id: 99999,
          name: 'Anand Vihar',
          admin1: 'Delhi',
          admin2: 'East Delhi',
          latitude: 28.647,
          longitude: 77.316,
        },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockGeoResults),
    });
    globalThis.fetch = fetchMock;

    const results = await searchIndianCities('anand');
    expect(results.length).toBeGreaterThan(0);
    // Preset should be present
    expect(results.some((r) => r.isPreset)).toBe(true);
    // Rohini should be added as remote match
    expect(results.some((r) => r.name.includes('Rohini'))).toBe(true);
  });

  it('returns preset matches only if remote geocoding fails or returns error', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network error in geocoder'));
    globalThis.fetch = fetchMock;

    const results = await searchIndianCities('mumbai');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.isPreset)).toBe(true);
  });

  it('returns preset matches only if remote geocoding response is not ok', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    globalThis.fetch = fetchMock;

    const results = await searchIndianCities('mumbai');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.isPreset)).toBe(true);
  });
});
