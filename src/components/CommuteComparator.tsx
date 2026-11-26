import React, { useId, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Bike,
  Car,
  Footprints,
  MapPin,
  RotateCcw,
  Route,
  Search,
  ShieldCheck,
  TrendingDown,
  User,
} from 'lucide-react';
import type {
  CommuteTravelMode,
  FamilyMember,
  HouseholdProfile,
  RouteComparisonResponse,
  RouteOptionMetrics,
} from '../types';
import { fetchCommuteComparison } from '../lib/commute-api';

function getDefaultDestination(sourceName: string): string {
  const s = sourceName.toLowerCase();
  if (s.includes('anand vihar') || s.includes('noida') || s.includes('ghaziabad')) {
    return 'Connaught Place, New Delhi';
  }
  if (s.includes('connaught place') || s.includes('delhi')) {
    return 'Cyber City, Gurugram';
  }
  if (s.includes('mumbai') || s.includes('bkc') || s.includes('bandra')) {
    return 'Nariman Point, Mumbai';
  }
  if (s.includes('bengaluru') || s.includes('bangalore') || s.includes('btm')) {
    return 'Whitefield, Bengaluru';
  }
  if (s.includes('kolkata') || s.includes('jadavpur')) {
    return 'Salt Lake Sector V, Kolkata';
  }
  if (s.includes('hyderabad') || s.includes('sanath nagar')) {
    return 'Hitec City, Hyderabad';
  }
  if (s.includes('chennai') || s.includes('alandur')) {
    return 'T. Nagar, Chennai';
  }
  if (s.includes('pune') || s.includes('shivajinagar')) {
    return 'Hinjawadi, Pune';
  }
  if (s.includes('ahmedabad') || s.includes('maninagar')) {
    return 'SG Highway, Ahmedabad';
  }
  if (s.includes('lucknow')) {
    return 'Hazratganj, Lucknow';
  }
  if (s.includes('patna')) {
    return 'Bailey Road, Patna';
  }
  const city = sourceName.split(',')[0].trim();
  return `${city} City Center`;
}

interface CommuteComparatorProps {
  household?: HouseholdProfile;
  currentStationName?: string;
}

export const CommuteComparator: React.FC<CommuteComparatorProps> = ({
  household,
  currentStationName,
}) => {
  const sourceInputId = useId();
  const destInputId = useId();
  const memberSelectId = useId();

  const initialSource = currentStationName || 'Anand Vihar, Delhi';
  const [source, setSource] = useState<string>(initialSource);
  const [destination, setDestination] = useState<string>(() => getDefaultDestination(initialSource));
  const [travelMode, setTravelMode] = useState<CommuteTravelMode>('driving');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');

  const [comparison, setComparison] = useState<RouteComparisonResponse | null>(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Synchronize default source and destination whenever user selects or enters a new location in the top search bar
  React.useEffect(() => {
    if (currentStationName) {
      setSource(currentStationName);
      setDestination(getDefaultDestination(currentStationName));
      setComparison(null);
      setError(null);
    }
  }, [currentStationName]);

  const members: FamilyMember[] = household?.members || [];

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const s = source.trim();
    const d = destination.trim();

    if (!s || !d) {
      setError('Please provide both Source and Destination locations.');
      return;
    }

    if (s.toLowerCase() === d.toLowerCase()) {
      setError('Source and Destination cannot be identical. Please enter distinct locations.');
      return;
    }

    setLoading(true);
    try {
      const result = await fetchCommuteComparison({
        source: s,
        destination: d,
        travelMode,
        memberId: selectedMemberId || undefined,
        household,
      });
      setComparison(result);
      setSelectedRouteIndex(result.cleanestRouteIndex);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to compare commute routes.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    const defaultOrigin = currentStationName || 'Anand Vihar, Delhi';
    setComparison(null);
    setSource(defaultOrigin);
    setDestination(getDefaultDestination(defaultOrigin));
    setError(null);
    setSelectedRouteIndex(0);
  };

  const activeRoute: RouteOptionMetrics | undefined = comparison?.routes[selectedRouteIndex];

  return (
    <section
      aria-label="Dynamic Clean-Route Commute Comparator"
      className="w-full bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] p-5 sm:p-6 shadow-sm transition-colors duration-200 space-y-6"
    >
      {/* Screen Reader Live Feedback */}
      <div aria-live="polite" className="sr-only">
        {loading ? 'Comparing commute routes and sampling waypoint air quality...' : ''}
        {comparison ? `Route comparison loaded. Cleanest route offers ${comparison.exposureSavingsPercent.toFixed(1)} percent exposure reduction.` : ''}
        {error ? `Commute comparison error: ${error}` : ''}
      </div>

      {/* Title & Scope */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
            <Route className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                Clean-Route Commute Comparator
              </h3>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                Live Waypoint AQI
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Live multi-route comparison using OSRM geometry and waypoint air quality sampling
            </p>
          </div>
        </div>

        {comparison && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] text-xs font-semibold text-[var(--text-secondary)] transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset / New Route
          </button>
        )}
      </div>

      {/* Input-Gated Form */}
      <form onSubmit={handleCompare} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Source Input */}
          <div className="space-y-1.5">
            <label
              htmlFor={sourceInputId}
              className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              Source Location (Origin)
            </label>
            <input
              id={sourceInputId}
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. Anand Vihar, Delhi or Indiranagar, Bengaluru"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Destination Input */}
          <div className="space-y-1.5">
            <label
              htmlFor={destInputId}
              className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              Destination Location
            </label>
            <input
              id={destInputId}
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Connaught Place, Delhi or Whitefield, Bengaluru"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Travel Mode & Family Commuter Selectors */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Travel Mode:
            </span>
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setTravelMode('driving')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  travelMode === 'driving'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                Car / Cab
              </button>
              <button
                type="button"
                onClick={() => setTravelMode('cycling')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  travelMode === 'cycling'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Bike className="w-3.5 h-3.5" />
                Bike / Auto
              </button>
              <button
                type="button"
                onClick={() => setTravelMode('walking')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  travelMode === 'walking'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Footprints className="w-3.5 h-3.5" />
                Walk / Transit
              </button>
            </div>
          </div>

          {members.length > 0 && (
            <div className="flex items-center gap-2">
              <label
                htmlFor={memberSelectId}
                className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1"
              >
                <User className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                Family Commuter:
              </label>
              <select
                id={memberSelectId}
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Default Commuter Model</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.commuteMode.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">Sampling Route AQI...</span>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Compare Route AQI
              </>
            )}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </form>

      {/* Dynamic Results Display (Rendered strictly after user submission) */}
      {comparison && (
        <div className="space-y-6 pt-3 border-t border-[var(--border-subtle)] animate-fade-in">
          {/* Comparison Summary Banner */}
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-[var(--text-primary)]">
                  Cleanest Commute Recommendation Found
                </h4>
                <p className="text-xs text-[var(--text-secondary)] max-w-2xl leading-relaxed">
                  {comparison.comparisonSummary}
                </p>
              </div>
            </div>

            {comparison.exposureSavingsPercent > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-bold shrink-0">
                <TrendingDown className="w-4 h-4" />
                <span>
                  -{comparison.exposureSavingsPercent}% Exposure (-{comparison.aqiDifferencePoints} AQI)
                </span>
              </div>
            )}
          </div>

          {/* Route Option Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {comparison.routes.map((r, idx) => {
              const isCleanest = idx === comparison.cleanestRouteIndex;
              const isSelected = idx === selectedRouteIndex;

              return (
                <button
                  key={r.routeId}
                  type="button"
                  onClick={() => setSelectedRouteIndex(idx)}
                  className={`text-left p-4 rounded-xl border transition-all duration-150 space-y-3 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    isSelected
                      ? 'border-teal-500 bg-teal-500/5 ring-1 ring-teal-500/30'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 hover:bg-[var(--bg-secondary)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-black uppercase text-[var(--text-muted)]">
                        Option {idx + 1}
                      </span>
                      <h5 className="text-sm font-bold text-[var(--text-primary)]">
                        {r.label}
                      </h5>
                    </div>
                    {isCleanest && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0">
                        Cleanest
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-[var(--surface-card)] border border-[var(--border-subtle)]">
                      <span className="text-[10px] text-[var(--text-muted)] uppercase block">
                        Distance & Time
                      </span>
                      <span className="font-bold text-[var(--text-primary)]">
                        {r.distanceKm} km · {Math.round(r.durationMin)}m
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-[var(--surface-card)] border border-[var(--border-subtle)]">
                      <span className="text-[10px] text-[var(--text-muted)] uppercase block">
                        Average AQI
                      </span>
                      <span
                        className={`font-black ${
                          r.meanAqi > 300
                            ? 'text-rose-600 dark:text-rose-400'
                            : r.meanAqi > 200
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {r.meanAqi} NAQI
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] pt-1 border-t border-[var(--border-subtle)]">
                    <span>Peak PM2.5: {r.peakPm25} µg</span>
                    <span>Dose: ~{r.estimatedDoseUg} µg</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Route Waypoints Inspector */}
          {activeRoute && (
            <div className="p-4 rounded-xl bg-[var(--bg-secondary)]/50 border border-[var(--border-subtle)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  Waypoint Live Air Quality Profile ({activeRoute.label})
                </span>
                <span className="text-xs text-[var(--text-secondary)]">
                  {comparison.sourceResolved} <ArrowRight className="w-3 h-3 inline mx-1" />{' '}
                  {comparison.destinationResolved}
                </span>
              </div>

              {/* Waypoint Sequence Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                {activeRoute.waypoints.map((wp, wIdx) => (
                  <div
                    key={`${wp.lat}-${wp.lon}-${wIdx}`}
                    className="p-2.5 rounded-lg bg-[var(--surface-card)] border border-[var(--border-subtle)] space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold text-[var(--text-muted)] uppercase">
                      <span>Point {wIdx + 1}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                          wp.aqi > 300
                            ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400'
                            : wp.aqi > 200
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                            : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {wp.aqi} AQI
                      </span>
                    </div>
                    <div className="text-xs font-bold text-[var(--text-primary)]">
                      PM2.5: {wp.pm25} µg
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)]">
                      NO2: {wp.no2} µg/m³
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
