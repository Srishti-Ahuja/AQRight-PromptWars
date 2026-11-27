import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCommuteComparison } from './commute-api';
import type { RouteCompareRequest, RouteComparisonResponse } from '../types';

describe('fetchCommuteComparison', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('sends POST request with correct payload and returns JSON response on backend success', async () => {
    const mockResponse: RouteComparisonResponse = {
      sourceResolved: 'Connaught Place, New Delhi',
      destinationResolved: 'Cyber City, Gurugram',
      travelMode: 'driving',
      routes: [
        {
          routeId: 'route_fastest',
          label: 'Direct Highway via NH48',
          distanceKm: 28.5,
          durationMin: 45,
          meanAqi: 280,
          peakAqi: 340,
          meanPm25: 140,
          peakPm25: 180,
          meanNo2: 65,
          estimatedDoseUg: 31.5,
          geometryGeojson: { type: 'LineString', coordinates: [[77.2, 28.6], [77.1, 28.5]] },
          waypoints: [],
        },
      ],
      cleanestRouteIndex: 0,
      aqiDifferencePoints: 40,
      exposureSavingsPercent: 18.5,
      inhaledPm25AvoidedUg: 6.2,
      comparisonSummary: 'Route 1 offers lower cumulative PM2.5 exposure.',
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(mockResponse),
    });
    globalThis.fetch = fetchMock;

    const req: RouteCompareRequest = {
      source: 'Connaught Place',
      destination: 'Cyber City',
      travelMode: 'driving',
      memberId: 'mem_1',
    };

    const result = await fetchCommuteComparison(req);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v1/commute/compare');
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(options.body)).toEqual({
      source: 'Connaught Place',
      destination: 'Cyber City',
      travelMode: 'driving',
      memberId: 'mem_1',
      household: null,
    });
    expect(result).toEqual(mockResponse);
  });

  it('throws descriptive error on 400 validation error from backend', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: vi.fn().mockResolvedValue({ detail: 'Geocoding failed for source location' }),
    });
    globalThis.fetch = fetchMock;

    const req: RouteCompareRequest = {
      source: 'NonExistentUnknownPlace123',
      destination: 'Cyber City',
      travelMode: 'cycling',
    };

    await expect(fetchCommuteComparison(req)).rejects.toThrow('Geocoding failed for source location');
  });

  it('rejects empty or identical source and destination before network call', async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    await expect(
      fetchCommuteComparison({ source: '', destination: 'Noida', travelMode: 'driving' })
    ).rejects.toThrow('Please provide both Source and Destination');

    await expect(
      fetchCommuteComparison({ source: 'Delhi', destination: 'Delhi', travelMode: 'driving' })
    ).rejects.toThrow('cannot be identical');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('gracefully falls back to client-side live comparison when backend returns 404', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      // Backend commute endpoint returns 404
      if (url === '/api/v1/commute/compare') {
        return Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ detail: 'Not Found' }),
        });
      }
      // Open-Meteo Geocoding
      if (url.includes('geocoding-api')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              results: [{ name: 'Noida', admin1: 'Uttar Pradesh', latitude: 28.5355, longitude: 77.391 }],
            }),
        });
      }
      // OSRM routing
      if (url.includes('router.project-osrm.org')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              routes: [
                {
                  geometry: {
                    type: 'LineString',
                    coordinates: [
                      [77.316, 28.646],
                      [77.35, 28.6],
                      [77.391, 28.535],
                    ],
                  },
                  distance: 18500,
                  duration: 2100,
                },
              ],
            }),
        });
      }
      // Open-Meteo Air Quality
      if (url.includes('air-quality-api')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              current: { pm2_5: 145, pm10: 220, nitrogen_dioxide: 55 },
            }),
        });
      }
      return Promise.reject(new Error('Unknown URL: ' + url));
    });

    globalThis.fetch = fetchMock;

    const req: RouteCompareRequest = {
      source: 'Anand Vihar, Delhi',
      destination: 'Sector 62, Noida',
      travelMode: 'driving',
    };

    const result = await fetchCommuteComparison(req);

    expect(result).toBeDefined();
    expect(result.routes.length).toBeGreaterThan(0);
    expect(result.sourceResolved).toContain('Anand Vihar');
    expect(result.routes[0].waypoints.length).toBeGreaterThan(0);
    expect(result.cleanestRouteIndex).toBeGreaterThanOrEqual(0);
  });
});
