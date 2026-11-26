# AQRight — Hyper-Personalized Explainable AI (XAI) Smog & Urban Air Quality Assistant for Indian Households

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19+-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Pytest-12%20Passed-4EAA25?style=flat-square&logo=pytest&logoColor=white)](https://docs.pytest.org/)
[![Accessibility](https://img.shields.io/badge/Accessibility-WCAG%202.1%20AA-blueviolet?style=flat-square)](#accessibility-wcag-21-aa-compliance)

**AQRight** is a production-grade, privacy-first explainable AI (XAI) web application designed specifically for Indian families and urban communities navigating severe winter smog, nocturnal atmospheric inversions, and multi-generational pulmonary vulnerabilities.

---

## 1. Core Philosophy & Design Constraints

1. **Zero Generic Advice:** Every single recommendation dynamically computes and references the user's live hyper-local telemetry ($\text{PM}_{2.5}$, $\text{PM}_{10}$, $\text{NO}_2$, boundary-layer mixing height, wind speed) combined with their exact household floor elevation, kitchen exhaust setup, cultural cooking triggers (high-heat tadka, agarbatti, dry jhadu), and each family member's commute mode and health sensitivities.
2. **Explainable AI (XAI) First:** Every recommendation card features an **Inspect XAI Logic** trigger. Clicking opens an interactive **XAI Decision Inspector Drawer** that presents:
   - Plain-language decision reasoning & confidence score.
   - SHAP-style horizontal feature attribution bars summing to 100%.
   - Counterfactual baseline-vs-action exposure comparison (including Berkeley Earth cigarette inhalation equivalents avoided).
   - Authoritative atmospheric and physiological science citations (CPCB, WHO, CAQM, GINA, AHA).
3. **NO Photo / Image Upload Constraints:** Household context is gathered strictly through fast, structured UI controls (elevation chips, exhaust toggles, family member profile cards).
4. **Privacy-by-Design:** Household member names, health conditions, and floor details remain strictly in browser `localStorage`. No PII is ever sent to third-party servers.
5. **Zero-Flash Theme Engine:** Seamless Light Mode / Dark Mode toggle respecting `prefers-color-scheme` with synchronous `<head>` script hydration preventing flash of unstyled content.

---

## 2. System Architecture

```
AQRight-PromptWars/
├── app/                        # Python FastAPI Backend Layer
│   ├── main.py                 # FastAPI application, CORS, lifespan, exception handlers
│   ├── core/
│   │   └── config.py           # Pydantic Settings, TTL configs, Open-Meteo URLs
│   ├── models/
│   │   └── schemas.py          # Strict Pydantic v2 models (Household, Telemetry, XAI)
│   ├── services/
│   │   ├── aqi_math.py         # Official CPCB NAQI breakpoints, GRAP stages, inhalation dose
│   │   ├── telemetry.py        # Async httpx client with 15-min TTL cache & Open-Meteo mesh
│   │   └── xai_engine.py       # Deterministic SHAP attribution & counterfactual exposure model
│   └── api/
│       └── routes.py           # Endpoints: /telemetry, /recommendations/xai, /cities/search, /presets
├── tests/                      # Python pytest suite
│   ├── test_aqi_math.py        # CPCB sub-index breakpoints, GRAP stages, Berkeley cigarettes
│   └── test_api.py             # FastAPI route integration tests
├── src/                        # React 18+ TypeScript Frontend
│   ├── components/
│   │   ├── Navbar.tsx          # Live telemetry indicator, theme toggle, station search
│   │   ├── TelemetryBanner.tsx # CPCB NAQI gauge, CAQM GRAP stage, pollutant breakdown
│   │   ├── VentilationChart.tsx# 24-Hour dual-axis SVG: PM2.5 vs Boundary Layer Mixing Height
│   │   ├── HouseholdMatrix.tsx # Floor elevation, kitchen exhaust, triggers & dynamic family manager
│   │   ├── ActionFeed.tsx      # Categorized recommendation cards with impact pills & XAI trigger
│   │   ├── XaiDrawer.tsx       # Focus-trapped slide-over drawer with SHAP bars & counterfactuals
│   │   └── CommunitySimulator.tsx# RWA Society Ripple slider & 1-click WhatsApp/SAMEER circulars
│   ├── hooks/
│   │   ├── useTelemetry.ts     # Telemetry hook connecting to API with 15-min sessionStorage cache
│   │   └── useHousehold.ts     # Schema-versioned localStorage manager for family profiles
│   ├── lib/
│   │   ├── constants.ts        # Curated CPCB presets & default Indian family profile
│   │   ├── aqi-math.ts         # Pure TypeScript NAQI calculations
│   │   ├── xai-engine.ts       # Zero-latency instant client-side XAI engine
│   │   └── api.ts              # Open-Meteo & backend API integration
│   └── types/
│       └── index.ts            # Strict TypeScript interfaces matching Pydantic schemas
├── requirements.txt            # Python dependencies (fastapi, uvicorn, pydantic, httpx, pytest)
├── .gitignore                  # Clean Python, Node, OS, and env ignore rules
└── README.md                   # Full engineering documentation
```

---

## 3. Mathematical & Scientific Methodology

### A. Official Indian CPCB NAQI Linear Sub-Index Breakpoints

The National Air Quality Index (NAQI) sub-index $I_p$ for a pollutant concentration $C_p$ is calculated via linear interpolation across the official Central Pollution Control Board (CPCB) breakpoint table:

$$I_p = \left[ \frac{I_{\text{hi}} - I_{\text{lo}}}{B_{\text{hi}} - B_{\text{lo}}} \right] \cdot (C_p - B_{\text{lo}}) + I_{\text{lo}}$$

Where:
- $B_{\text{lo}}, B_{\text{hi}}$ are the lower and upper concentration breakpoints.
- $I_{\text{lo}}, I_{\text{hi}}$ are the corresponding index category breakpoints.

| Category | NAQI Sub-Index | $\text{PM}_{2.5}\ (\mu\text{g/m}^3)$ | $\text{PM}_{10}\ (\mu\text{g/m}^3)$ | $\text{NO}_2\ (\mu\text{g/m}^3)$ |
|:---|:---:|:---:|:---:|:---:|
| **Good** | $0 - 50$ | $0 - 30$ | $0 - 50$ | $0 - 40$ |
| **Satisfactory** | $51 - 100$ | $31 - 60$ | $51 - 100$ | $41 - 80$ |
| **Moderate** | $101 - 200$ | $61 - 90$ | $101 - 250$ | $81 - 180$ |
| **Poor** | $201 - 300$ | $91 - 120$ | $251 - 350$ | $181 - 280$ |
| **Very Poor** | $301 - 400$ | $121 - 250$ | $351 - 430$ | $281 - 400$ |
| **Severe** | $401 - 500$ | $251 - 500$ | $431 - 600$ | $401 - 600$ |

**Overall NAQI Formula:**
$$\text{NAQI} = \max(I_{\text{PM2.5}}, I_{\text{PM10}}, I_{\text{NO2}})$$

### B. Commission for Air Quality Management (CAQM) GRAP Stages

Active emergency measures under the Graded Response Action Plan (GRAP) in NCR & Adjoining Areas are automatically computed:
- **Stage I (Poor):** $\text{NAQI} \in [201, 300]$
- **Stage II (Very Poor):** $\text{NAQI} \in [301, 400]$
- **Stage III (Severe):** $\text{NAQI} \in [401, 450]$
- **Stage IV (Severe+):** $\text{NAQI} > 450$

### C. Berkeley Earth Cigarette Inhalation Equivalence

To convey the physiological toxicity of fine aerosol mass in terms immediately comprehensible to Indian households, AQRight implements the Berkeley Earth inhalation equivalence formula:

$$\text{Cigarettes Equivalent} = \frac{C_{\text{PM2.5}} \cdot \left(\frac{t}{24}\right) \cdot \alpha}{22\ \mu\text{g/m}^3}$$

Where:
- $C_{\text{PM2.5}}$ is the exposure concentration in $\mu\text{g/m}^3$.
- $t$ is exposure duration in hours.
- $\alpha$ is the physical ventilation multiplier ($1.0$ for resting/indoor, $1.3$ for active commute or exercise).
- $22\ \mu\text{g/m}^3$ of $\text{PM}_{2.5}$ over 24 hours transfers an alveolar particulate mass equivalent to smoking 1 cigarette.

### D. Physiological Inhalation Mass Dose

Total inhaled particulate mass deposited in the respiratory tract is modeled as:

$$\text{Dose}\ (\mu\text{g}) = C_{\text{PM2.5}} \cdot (1 - \eta_{\text{filter}}) \cdot \dot{V}_{\text{resp}} \cdot t$$

Where $\eta_{\text{filter}}$ is filtration efficiency ($0.95$ for N95 mask, $0.75$ for closed HEPA envelope, $0.0$ for unprotected air) and $\dot{V}_{\text{resp}}$ is breathing volume rate in $\text{m}^3/\text{hr}$.

### E. Atmospheric Boundary Layer Inversion Dynamics

During Indo-Gangetic Plain winter nights, radiative ground cooling compresses the planetary boundary layer height ($\text{BLH}$) down to $180\text{--}350\text{ m}$. This produces a dense "surface smog trap." Between 12:00 PM and 3:30 PM, solar insolation warms the land surface, initiating buoyant thermals that lift the mixing layer to $900\text{--}1400\text{ m}$. AQRight scans the 24-hour diurnal curve to pinpoint the exact safest window for cross-ventilating Indian homes.

---

## 4. Getting Started & Installation

### Prerequisites
- **Python:** 3.11+
- **Node.js:** 18+ (tested on Node v24)
- **npm:** 9+

### 1. Python FastAPI Backend Setup

```bash
# Clone the repository
git clone https://github.com/Srishti-Ahuja/AQRight-PromptWars.git
cd AQRight-PromptWars

# Install Python dependencies
pip install -r requirements.txt

# Run pytest unit test suite
python -m pytest tests/ -v

# Launch FastAPI development server (runs on http://127.0.0.1:8000)
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Interactive API documentation will be available at:
- Swagger UI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- ReDoc: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

### 2. Frontend Setup

In a new terminal:
```bash
# Install frontend dependencies
npm install

# Run TypeScript type check & build
npm run build

# Start Vite dev server (runs on http://localhost:5173)
npm run dev
```

---

## 5. API Reference (`/api/v1`)

### `GET /api/v1/telemetry`
Fetches real-time ambient air quality and meteorological forecast with 15-minute TTL caching.

**Query Parameters:**
- `lat` (float, required): Latitude coordinate (e.g. `28.6469`)
- `lon` (float, required): Longitude coordinate (e.g. `77.3160`)
- `name` (string, optional): Station name
- `locality` (string, optional): Locality descriptor
- `city` (string, optional): City name
- `state` (string, optional): State name

**Response Payload (`TelemetryResponse`):**
```json
{
  "stationName": "Anand Vihar, Delhi",
  "locality": "Anand Vihar ISBT & Railway Hub",
  "city": "Delhi",
  "state": "Delhi (NCT)",
  "latitude": 28.6469,
  "longitude": 77.316,
  "lastUpdated": "02:30 PM",
  "current": {
    "pm25": 284.0,
    "pm10": 412.0,
    "no2": 88.0,
    "co": 1.8,
    "o3": 42.0,
    "boundaryLayerHeight": 320.0,
    "windSpeed": 5.5,
    "temperature": 19.0,
    "relativeHumidity": 72.0,
    "isTrappedSurfaceSmog": true
  },
  "cpcb": {
    "aqi": 422,
    "category": "Severe",
    "grapStage": "Stage III (Severe)",
    "dominantPollutant": "PM2.5",
    "subIndices": {
      "pm25": 422,
      "pm10": 395,
      "no2": 110
    },
    "colorHex": "#881337",
    "badgeBg": "bg-red-950/30 border-red-700/50",
    "badgeText": "text-red-600 dark:text-red-300"
  },
  "bestVentilationWindow": {
    "startHour": 12,
    "endHour": 15,
    "avgPm25": 95.0,
    "avgMixingHeight": 1100.0,
    "recommendationText": "Safest cross-ventilation window is 12:00 to 15:00..."
  }
}
```

### `POST /api/v1/recommendations/xai`
Computes hyper-personalized recommendations with SHAP feature attribution weights.

**Request Payload (`RecommendationRequest`):**
```json
{
  "telemetry": { ... },
  "household": {
    "elevation": "ground_1_2",
    "kitchenExhaust": "exhaust_fan",
    "airFiltration": "none",
    "triggers": ["tadka", "dry_jhadu"],
    "members": [
      {
        "id": "mem_1",
        "name": "Dad",
        "ageGroup": "adult",
        "sensitivity": "none",
        "occupation": "two_wheeler_field",
        "commuteMode": "two_wheeler_auto",
        "peakWindow": "morning_7_10"
      }
    ]
  }
}
```

---

## 6. Curated Indian CPCB Hotspot Presets

AQRight includes quick-select presets for major high-density Indian CPCB continuous air quality monitoring stations:
1. **Anand Vihar, Delhi** (`28.6469°N, 77.3160°E`) — DPCC / CPCB Hub 01
2. **Dwarka Sec-8, Delhi** (`28.5700°N, 77.0700°E`) — DPCC / CPCB Hub 04
3. **Gurugram Sec-51, Haryana** (`28.4284°N, 77.0716°E`) — HSPCB Hub 02
4. **Noida Sec-62, Uttar Pradesh** (`28.6270°N, 77.3639°E`) — UPPCB Hub 05
5. **Bandra Kurla Complex (BKC), Mumbai** (`19.0660°N, 72.8680°E`) — MPCB Hub 01
6. **Indiranagar, Bengaluru** (`12.9784°N, 77.6408°E`) — KSPCB Hub 03
7. **Ballygunge, Kolkata** (`22.5280°N, 88.3650°E`) — WBPCB Hub 02
8. **Gomti Nagar, Lucknow** (`26.8500°N, 80.9900°E`) — UPPCB Hub 08

---

## 7. Accessibility (WCAG 2.1 AA Compliance)

- **Contrast Ratios:** Minimum $4.5:1$ text contrast maintained across all Light and Dark mode states. Status badges pair color fills with explicit textual labels and iconography.
- **Keyboard Navigation:** All cards, buttons, and tab switches support `:focus-visible` styling with `Enter` and `Space` activation.
- **Focus Management:** The XAI Decision Inspector Drawer traps keyboard focus (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`), closes on `Escape`, and restores focus to the triggering element.
- **Screen Reader Announcements:** Dynamic telemetry updates and clipboard copy events emit feedback via `aria-live="polite"` regions.

---

## 8. License & Civic Use

AQRight is open-source under the MIT License. Developed for Indian public health advocacy, Resident Welfare Associations (RWAs), and citizen science.
