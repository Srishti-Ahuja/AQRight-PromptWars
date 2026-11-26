"""Deterministic, explainable atmospheric source attribution engine for Indian urban air pollution."""

from __future__ import annotations

from typing import List
from app.models.schemas import (
    CurrentTelemetry,
    MeteorologicalContext,
    SourceAttributionReport,
    SourceDriverMetric,
    SourceDriverType,
    TelemetryResponse,
)


def _degrees_to_cardinal(deg: float) -> str:
    """Converts meteorological wind azimuth degrees to a 16-point cardinal compass string."""
    val = int((deg / 22.5) + 0.5)
    cardinals = [
        "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
        "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"
    ]
    return cardinals[val % 16]


def compute_source_attribution(
    telemetry: TelemetryResponse,
    wind_direction_deg: float = 315.0,
) -> SourceAttributionReport:
    """Diagnoses dominant urban pollution sources from multi-pollutant ratios and boundary layer physics.

    Diagnostic Framework:
      1. Atmospheric Inversion & Regional Biomass Smoke:
         - Characterized by PM2.5/PM10 ratio >= 0.55 (fine combustion fraction)
         - Boundary layer mixing height < 450m (trapped nocturnal/morning inversion).
      2. Surface & Road Dust Resuspension:
         - Characterized by high PM10 and PM2.5/PM10 ratio < 0.45 (predominance of coarse crustal matter)
         - Exacerbated by dry windy conditions or low humidity.
      3. Vehicular Tailpipe Corridor Emissions:
         - Elevated NO2 (> 40 µg/m³) and CO (> 1.0 mg/m³) indicative of fossil fuel combustion.
      4. Photochemical Secondary Smog:
         - Elevated Ozone O3 (> 60 µg/m³) formed via VOC + NOx reactions under sunlight.

    Args:
        telemetry: Full TelemetryResponse model containing current pollutants and CPCB breakdown.
        wind_direction_deg: Meteorological wind direction in azimuth degrees (0-360).

    Returns:
        Structured SourceAttributionReport with quantitative normalized contributions.
    """
    curr: CurrentTelemetry = telemetry.current
    pm25 = max(0.1, curr.pm25)
    pm10 = max(0.1, curr.pm10)
    no2 = max(0.0, curr.no2)
    co = max(0.0, curr.co)
    o3 = max(0.0, curr.o3)
    blh = max(10.0, curr.boundary_layer_height)
    wind_spd = max(0.0, curr.wind_speed)

    # 1. Compute Primary Scientific Indicator: Fine-to-Coarse Ratio
    ratio = round(pm25 / max(pm25, pm10), 2)
    is_inversion = curr.is_trapped_surface_smog or (blh < 450.0)

    # 2. Derive Raw Diagnostic Scores
    # Driver A: Biomass Smoke & Trapped Thermal Inversion
    # Strong signal if PM2.5/PM10 is high AND mixing layer is shallow
    inversion_severity = max(0.0, (450.0 - blh) / 350.0) if is_inversion else 0.0
    fine_excess = max(0.0, ratio - 0.45)
    biomass_raw = (pm25 * 0.4) * (1.0 + fine_excess * 2.0) * (1.0 + inversion_severity * 0.8)

    # Driver B: Surface Road Dust & Construction Resuspension
    # Strong signal if PM10 is elevated relative to PM2.5 (coarse particles dominant)
    coarse_fraction = max(0.0, 1.0 - ratio)
    dust_raw = (pm10 * 0.35) * (1.0 + coarse_fraction * 1.5) * (1.0 + min(1.5, wind_spd / 12.0))

    # Driver C: Vehicular Traffic & Fossil Combustion Corridor
    # Driven by NO2 and CO
    no2_factor = min(3.0, no2 / 40.0)
    co_factor = min(3.0, co / 1.0)
    traffic_raw = (no2 * 1.2 + co * 25.0) * (0.8 + 0.4 * (no2_factor + co_factor))

    # Driver D: Photochemical Secondary Smog
    # Driven by Ozone during daytime insolation
    ozone_factor = min(3.0, o3 / 50.0)
    photo_raw = (o3 * 0.8) * (0.5 + 0.5 * ozone_factor)

    # 3. Normalize into Percentage Attributions
    total_raw = biomass_raw + dust_raw + traffic_raw + photo_raw
    if total_raw <= 0:
        total_raw = 1.0

    p_biomass = round((biomass_raw / total_raw) * 100.0, 1)
    p_dust = round((dust_raw / total_raw) * 100.0, 1)
    p_traffic = round((traffic_raw / total_raw) * 100.0, 1)
    p_photo = round(100.0 - (p_biomass + p_dust + p_traffic), 1)
    # Clamp in valid range
    p_photo = max(0.0, p_photo)

    # 4. Construct Driver Metrics
    drivers: List[SourceDriverMetric] = [
        SourceDriverMetric(
            driverType=SourceDriverType.BIOMASS_INVERSION,
            label="Biomass Smoke & Nocturnal Thermal Inversion",
            contributionPercent=p_biomass,
            severity="high" if p_biomass >= 40 else ("moderate" if p_biomass >= 20 else "low"),
            rationale=(
                f"Fine combustion fraction (PM2.5/PM10: {ratio:.2f}) combined with a shallow atmospheric "
                f"mixing height ({round(blh)}m) traps crop stubble, biomass burning, and winter heating smoke at breathing height."
            ),
            metricsSnapshot=f"PM2.5/PM10: {ratio:.2f} | Mixing Height: {round(blh)}m",
            iconName="Flame",
        ),
        SourceDriverMetric(
            driverType=SourceDriverType.SURFACE_ROAD_DUST,
            label="Road Dust & Construction Surface Resuspension",
            contributionPercent=p_dust,
            severity="high" if p_dust >= 35 else ("moderate" if p_dust >= 20 else "low"),
            rationale=(
                f"Coarse aerodynamic fraction ({round(coarse_fraction * 100)}%) generated by heavy vehicular shear "
                f"and dry road dust (PM10: {round(pm10)} µg/m³). Settles heavily on ground & 1st-floor households."
            ),
            metricsSnapshot=f"Coarse PM10: {round(pm10)} µg/m³ | Surface Wind: {round(wind_spd, 1)} km/h",
            iconName="Tornado",
        ),
        SourceDriverMetric(
            driverType=SourceDriverType.VEHICULAR_EXHAUST,
            label="Vehicular Exhaust & Urban Transit Corridors",
            contributionPercent=p_traffic,
            severity="high" if p_traffic >= 30 else ("moderate" if p_traffic >= 15 else "low"),
            rationale=(
                f"Direct tailpipe NO2 ({round(no2)} µg/m³) and CO ({co:.1f} mg/m³) emissions from diesel commercial "
                f"transport and stop-and-go congestion. Directly penetrates open two-wheelers and auto-rickshaws."
            ),
            metricsSnapshot=f"NO2: {round(no2)} µg/m³ | CO: {co:.1f} mg/m³",
            iconName="Car",
        ),
        SourceDriverMetric(
            driverType=SourceDriverType.PHOTOCHEMICAL_SMOG,
            label="Photochemical Secondary Smog & Ozone",
            contributionPercent=p_photo,
            severity="high" if p_photo >= 25 else ("moderate" if p_photo >= 10 else "low"),
            rationale=(
                f"Secondary ozone ({round(o3)} µg/m³) catalyzed by solar radiation reacting with unburnt hydrocarbons. "
                f"Peaks during midday sunny windows and triggers airway hyperresponsiveness in asthmatic individuals."
            ),
            metricsSnapshot=f"Ozone (O3): {round(o3)} µg/m³",
            iconName="Sun",
        ),
    ]

    # Sort drivers descending by contribution
    drivers.sort(key=lambda d: d.contribution_percent, reverse=True)
    dominant = drivers[0].driver_type

    # 5. Synthesize Plain-Language Causal Diagnostic & Action Implication
    wind_card = _degrees_to_cardinal(wind_direction_deg)
    if dominant == SourceDriverType.BIOMASS_INVERSION:
        causal = (
            f"Severe atmospheric capping: A low planetary boundary layer ({round(blh)}m) is acting like a ceiling, "
            f"preventing vertical dispersion of combustion particles (PM2.5/PM10: {ratio:.2f}) blown in from the {wind_card}."
        )
        action = "Prioritize perimeter weather-stripping, HEPA recirculation, and delaying outdoor exertion until the afternoon thermal lift."
    elif dominant == SourceDriverType.SURFACE_ROAD_DUST:
        causal = (
            f"Mechanical surface resuspension: High ambient PM10 ({round(pm10)} µg/m³) indicates heavy road dust shearing "
            f"and unpaved construction particulate movement under {wind_card} surface winds of {round(wind_spd, 1)} km/h."
        )
        action = "Switch from dry sweeping (jhadu) to damp microfiber mopping immediately; close roadside ground-floor balconies."
    elif dominant == SourceDriverType.VEHICULAR_EXHAUST:
        causal = (
            f"Transit corridor stagnation: Elevated NO2 ({round(no2)} µg/m³) and carbon monoxide signify concentrated "
            f"tailpipe exhaust accumulation with low lateral wind ventilation ({round(wind_spd, 1)} km/h)."
        )
        action = "Equip two-wheeler commuters with tight-fitting N95 respirators; set car HVAC to internal recirculation mode."
    else:
        causal = (
            f"Photochemical oxidative peak: Elevated tropospheric ozone ({round(o3)} µg/m³) is driving secondary aerosol formation "
            f"under intense solar UV exposure."
        )
        action = "Avoid vigorous outdoor workouts between 1:00 PM and 4:00 PM; vulnerable cohorts should stay in shaded, filtered rooms."

    meteo = MeteorologicalContext(
        mixingLayerM=round(blh, 1),
        isInversionTrapped=is_inversion,
        windSpeedKmh=round(wind_spd, 1),
        windCardinal=wind_card,
        temperatureC=round(curr.temperature, 1),
        humidityPercent=round(curr.relative_humidity, 1),
        pm25ToPm10Ratio=ratio,
    )

    return SourceAttributionReport(
        stationName=telemetry.station_name,
        aqi=telemetry.cpcb.aqi,
        category=telemetry.cpcb.category.value if hasattr(telemetry.cpcb.category, "value") else str(telemetry.cpcb.category),
        dominantDriver=dominant,
        causalSummary=causal,
        drivers=drivers,
        meteorology=meteo,
        actionImplication=action,
    )
