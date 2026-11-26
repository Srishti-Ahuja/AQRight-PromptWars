import React, { useState } from 'react';
import {
  Building2,
  Check,
  ClipboardCopy,
  Users,
} from 'lucide-react';
import type { TelemetryData } from '../types';

interface CommunitySimulatorProps {
  telemetry: TelemetryData;
}

export const CommunitySimulator: React.FC<CommunitySimulatorProps> = ({ telemetry }) => {
  const [householdCount, setHouseholdCount] = useState<number>(75);
  const [activeTemplate, setActiveTemplate] = useState<'english' | 'hinglish' | 'grievance'>('hinglish');
  const [copied, setCopied] = useState<boolean>(false);

  const { cpcb, current, stationName, locality, latitude, longitude, bestVentilationWindow } = telemetry;

  const weeklyPmPreventedGrams = Math.round(householdCount * 4.2);
  const weeklyCo2MitigatedKg = Math.round(householdCount * 8.5);
  const communityCigarettesAvoided = Math.round(householdCount * 18.5);

  const englishTemplate = `🚨 *RWA WINTER SMOG & HEALTH ADVISORY: ${stationName.toUpperCase()}* 🚨

Dear Residents,

Live monitoring at *${stationName}* indicates severe air pollution levels:
• *Indian NAQI:* ${cpcb.aqi} (${cpcb.category.toUpperCase()})
• *Active CAQM Status:* ${cpcb.grapStage}
• *Atmospheric Inversion:* Trapped below ${Math.round(current.boundaryLayerHeight)}m

*Mandatory Community Action Protocol:*
1. *Lock Perimeter Windows:* Please keep balcony doors and windows closed during early morning hours.
2. *Safest Cross-Ventilation:* Open windows only between *${bestVentilationWindow.startHour}:00 PM - ${bestVentilationWindow.endHour}:00 PM* when solar heating disperses trapped smog.
3. *Ban on Dry Sweeping:* Security & housekeeping must switch exclusively to wet microfiber mopping (dry brooming resuspends hazardous PM10 road dust).
4. *Strict Ban on Open Waste Burning / Dhoop in Common Corridors.*

Let us protect our children, seniors, and asthmatic neighbors.

— *Managing Committee, Resident Welfare Association (RWA)*
_Generated via AQRight XAI Telemetry Assistant_`;

  const hinglishTemplate = `📢 *ZAROORI NOTICE: Society Winter Air Quality Alert (${stationName})* 📢

Dosto, aaj hamare area (*${stationName}*) mein pollution dangerous level par hai:
• *Live AQI:* ${cpcb.aqi} (${cpcb.category})
• *PM2.5 Level:* ${current.pm25} µg/m³ (${Math.round((current.pm25 / 60) * 10) / 10}x CPCB limit)
• *Inversion Smog Lid:* Ground se sirf ${Math.round(current.boundaryLayerHeight)}m upar dhuan phansa hua hai!

*Ghar ke liye 3 Simple Hacks:*
1. 🪟 *Subah Khidkiyan Band Rakhein:* Morning mein smog sabse zyada neeche jamta hai. Ventilate sirf dopahar *${bestVentilationWindow.startHour}:00 se ${bestVentilationWindow.endHour}:00 baje* ke beech karein.
2. 🧹 *Sukha Jhadu Band Karein:* Househelp ko bolen ki dry jhadu ki jagah *Geela Pocha (Wet Mop)* lagayein. Dry jhadu se sadak ki dhool (PM10) seedha saans mein jaati hai.
3. 🛵 *Bahar N95 Mask Zaroori:* Two-wheeler par bina N95 mask nikalke saans lena din mein 15-20 cigarette peene jaisa hai.

Apne parivaar aur buzurgo ka khayal rakhein! 🙏

— *Shared from AQRight Indian Household Assistant*`;

  const grievanceTemplate = `TO:
The Member Secretary / Grievance Cell
Central Pollution Control Board (CPCB) / State Pollution Control Board
Cc: Commission for Air Quality Management (CAQM) in NCR & Adjoining Areas
Platform: SAMEER App / Green Delhi Grievance Portal

SUBJECT: URGENT COMPLAINT REGARDING PERSISTENT SEVERE AMBIENT AIR POLLUTION & RESUSPENSION AT ${stationName.toUpperCase()}

Respected Sir / Madam,

I am writing as a concerned citizen and resident regarding acute and hazardous air pollution levels observed in our vicinity.

TELEMETRIC LOCATION DETAILS:
• Monitoring Station / Hub: ${stationName} (${locality})
• GPS Coordinates: ${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E
• Recorded Indian NAQI: ${cpcb.aqi} [Category: ${cpcb.category.toUpperCase()}]
• Current Fine Particulate (PM2.5): ${current.pm25} µg/m³ (CPCB Standard: 60 µg/m³)
• Current Coarse Dust (PM10): ${current.pm10} µg/m³ (CPCB Standard: 100 µg/m³)
• Traffic Combustion Marker (NO2): ${current.no2} µg/m³ (CPCB Standard: 80 µg/m³)
• Boundary Layer Mixing Height: ${Math.round(current.boundaryLayerHeight)} meters (Trapped surface inversion)
• CAQM GRAP Trigger Level: ${cpcb.grapStage}

CIVIC INTERVENTION REQUESTED:
1. Immediate mechanical road sweeping with water sprinkling along arterial transit corridors to curb PM10 resuspension.
2. Intensive enforcement and challan against unauthorized open construction dust and dry sweeping in commercial zones.
3. Verification of strict adherence to CAQM GRAP guidelines for high-emission clusters.

Kindly issue a formal grievance tracking token for this complaint.

Respectfully submitted,
Resident & Citizen Representative
Timestamp: ${new Date().toLocaleString('en-IN')}`;

  const currentText =
    activeTemplate === 'english'
      ? englishTemplate
      : activeTemplate === 'hinglish'
      ? hinglishTemplate
      : grievanceTemplate;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <section
      aria-label="RWA Community Ripple Simulator and Civic Circular Generator"
      className="w-full bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] p-5 sm:p-6 shadow-sm transition-colors duration-200"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--border-subtle)] gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              RWA Community Ripple Simulator & Civic Circular Generator
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
              Collective Action
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Model hyper-local air mitigation across apartment societies and export 1-click WhatsApp broadcasts.
          </p>
        </div>
      </div>

      {/* Simulator Section */}
      <div className="mt-5 p-5 rounded-xl bg-[var(--bg-secondary)]/40 border border-[var(--border-subtle)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <label
              htmlFor="household-slider"
              className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5"
            >
              <Users className="w-4 h-4 text-teal-600" />
              Apartment Society / RWA Adoption Scale:
              <span className="text-teal-600 font-extrabold text-sm ml-1">
                {householdCount} Households
              </span>
            </label>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Drag slider to simulate collective compliance across your residential tower or block.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-[var(--text-muted)]">
            Range: 10 – 500 Flats
          </span>
        </div>

        {/* Range Slider */}
        <input
          id="household-slider"
          type="range"
          min="10"
          max="500"
          step="5"
          value={householdCount}
          onChange={(e) => setHouseholdCount(Number(e.target.value))}
          aria-label="Number of households in apartment society"
          className="w-full h-2 rounded-lg bg-slate-200 dark:bg-slate-700 accent-teal-600 cursor-pointer"
        />

        {/* Dynamic Collective Impact Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] block">
              Weekly PM2.5 Prevented
            </span>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {weeklyPmPreventedGrams.toLocaleString()} <span className="text-xs font-normal">grams</span>
            </div>
            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
              Equal to filtering millions of liters of dirty indoor air
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] block">
              Community Inhalation Avoidance
            </span>
            <div className="text-xl sm:text-2xl font-black text-teal-600 dark:text-teal-400 mt-1">
              {communityCigarettesAvoided.toLocaleString()} <span className="text-xs font-normal">Cigarettes Equiv</span>
            </div>
            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
              Avoided across children, adults, and seniors weekly
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] block">
              CO2 Mitigated
            </span>
            <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {weeklyCo2MitigatedKg.toLocaleString()} <span className="text-xs font-normal">kg CO2</span>
            </div>
            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
              Through optimized smart ventilation & HVAC scheduling
            </p>
          </div>
        </div>
      </div>

      {/* Vernacular Circular & Grievance Generator */}
      <div className="mt-6 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
            One-Click Vernacular Broadcast & Grievance Generator
          </label>

          {/* Format Selector Pills */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTemplate('hinglish')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
                activeTemplate === 'hinglish'
                  ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                  : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              💬 Hinglish WhatsApp
            </button>
            <button
              type="button"
              onClick={() => setActiveTemplate('english')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
                activeTemplate === 'english'
                  ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                  : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              📋 English RWA Notice
            </button>
            <button
              type="button"
              onClick={() => setActiveTemplate('grievance')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
                activeTemplate === 'grievance'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                  : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              🏛️ SAMEER / CPCB Complaint
            </button>
          </div>
        </div>

        {/* Circular Display Box */}
        <div className="relative rounded-xl bg-[var(--bg-secondary)]/50 border border-[var(--border-subtle)] p-4">
          <pre className="text-xs text-[var(--text-primary)] font-mono whitespace-pre-wrap leading-relaxed select-all max-h-60 overflow-y-auto">
            {currentText}
          </pre>

          {/* Copy Button */}
          <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <span className="text-[11px] text-[var(--text-muted)]" aria-live="polite">
              {copied ? '✅ Copied to clipboard!' : 'Pre-filled with your live station AQI & coordinates.'}
            </span>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <ClipboardCopy className="w-3.5 h-3.5" />
                  <span>Copy Ready-to-Send Text</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
