"""Pure mathematical and physiological modeling functions for Indian CPCB NAQI and exposure doses."""

from __future__ import annotations

import math
from typing import NamedTuple, Sequence
from app.models.schemas import (
    CPCBBreakdown,
    GrapStage,
    HourlyTelemetryPoint,
    NAQICategory,
    SubIndices,
    VentilationWindow,
)


class Breakpoint(NamedTuple):
    """Linear interpolation boundary for air quality sub-index computation."""
    b_lo: float
    b_hi: float
    i_lo: int
    i_hi: int


# Official Central Pollution Control Board (CPCB) NAQI Breakpoints
PM25_BREAKPOINTS: Sequence[Breakpoint] = (
    Breakpoint(0.0, 30.0, 0, 50),       # Good
    Breakpoint(31.0, 60.0, 51, 100),    # Satisfactory
    Breakpoint(61.0, 90.0, 101, 200),   # Moderate
    Breakpoint(91.0, 120.0, 201, 300),  # Poor
    Breakpoint(121.0, 250.0, 301, 400), # Very Poor
    Breakpoint(251.0, 500.0, 401, 500), # Severe
)

PM10_BREAKPOINTS: Sequence[Breakpoint] = (
    Breakpoint(0.0, 50.0, 0, 50),
    Breakpoint(51.0, 100.0, 51, 100),
    Breakpoint(101.0, 250.0, 101, 200),
    Breakpoint(251.0, 350.0, 201, 300),
    Breakpoint(351.0, 430.0, 301, 400),
    Breakpoint(431.0, 600.0, 401, 500),
)

NO2_BREAKPOINTS: Sequence[Breakpoint] = (
    Breakpoint(0.0, 40.0, 0, 50),
    Breakpoint(41.0, 80.0, 51, 100),
    Breakpoint(81.0, 180.0, 101, 200),
    Breakpoint(181.0, 280.0, 201, 300),
    Breakpoint(281.0, 400.0, 301, 400),
    Breakpoint(401.0, 600.0, 401, 500),
)


def calculate_sub_index(concentration: float, breakpoints: Sequence[Breakpoint]) -> int:
    """Computes an individual pollutant sub-index via CPCB linear interpolation.

    Formula:
        Ip = [ (I_hi - I_lo) / (B_hi - B_lo) ] * (Cp - B_lo) + I_lo

    Args:
        concentration: Measured mass concentration in µg/m³.
        breakpoints: Ordered sequence of breakpoint intervals.

    Returns:
        Calculated integer sub-index bounded between 0 and 500.
    """
    if concentration <= 0:
        return 0

    for bp in breakpoints:
        if concentration <= bp.b_hi:
            sub = ((bp.i_hi - bp.i_lo) / (bp.b_hi - bp.b_lo)) * (concentration - bp.b_lo) + bp.i_lo
            return round(sub)

    # Extreme concentrations beyond maximum breakpoint: cap at 500
    last = breakpoints[-1]
    extrapolated = ((last.i_hi - last.i_lo) / (last.b_hi - last.b_lo)) * (concentration - last.b_lo) + last.i_lo
    return min(500, max(0, round(extrapolated)))


def get_naqi_category(aqi: int) -> tuple[NAQICategory, str, str, str]:
    """Retrieves standard CPCB category label and styling tokens.

    Args:
        aqi: Integer AQI value (0 to 500).

    Returns:
        Tuple containing NAQICategory, hex color, badge background, and text class.
    """
    if aqi <= 50:
        return (
            NAQICategory.GOOD,
            "#16a34a",
            "bg-emerald-500/15 border-emerald-500/30",
            "text-emerald-700 dark:text-emerald-400",
        )
    if aqi <= 100:
        return (
            NAQICategory.SATISFACTORY,
            "#84cc16",
            "bg-lime-500/15 border-lime-500/30",
            "text-lime-700 dark:text-lime-400",
        )
    if aqi <= 200:
        return (
            NAQICategory.MODERATE,
            "#eab308",
            "bg-amber-500/15 border-amber-500/30",
            "text-amber-700 dark:text-amber-400",
        )
    if aqi <= 300:
        return (
            NAQICategory.POOR,
            "#f97316",
            "bg-orange-500/15 border-orange-500/30",
            "text-orange-700 dark:text-orange-400",
        )
    if aqi <= 400:
        return (
            NAQICategory.VERY_POOR,
            "#ef4444",
            "bg-rose-500/15 border-rose-500/30",
            "text-rose-700 dark:text-rose-400",
        )
    return (
        NAQICategory.SEVERE,
        "#881337",
        "bg-red-950/30 border-red-700/50",
        "text-red-600 dark:text-red-300",
    )


def get_grap_stage(aqi: int) -> GrapStage:
    """Determines active Commission for Air Quality Management (CAQM) GRAP stage.

    CAQM GRAP Triggers:
        - Stage I (Poor): AQI 201 - 300
        - Stage II (Very Poor): AQI 301 - 400
        - Stage III (Severe): AQI 401 - 450
        - Stage IV (Severe+): AQI > 450

    Args:
        aqi: Calculated Indian NAQI index value.

    Returns:
        Applicable GrapStage enum.
    """
    if aqi > 450:
        return GrapStage.STAGE_IV
    if aqi >= 401:
        return GrapStage.STAGE_III
    if aqi >= 301:
        return GrapStage.STAGE_II
    if aqi >= 201:
        return GrapStage.STAGE_I
    return GrapStage.NONE


def calculate_cpcb_breakdown(pm25: float, pm10: float, no2: float) -> CPCBBreakdown:
    """Calculates full CPCB NAQI breakdown based on sub-index maximum rule.

    CPCB Guidelines dictate that overall AQI is the maximum of individual sub-indices.

    Args:
        pm25: Fine particulate matter concentration in µg/m³.
        pm10: Coarse particulate matter concentration in µg/m³.
        no2: Nitrogen dioxide concentration in µg/m³.

    Returns:
        Structured CPCBBreakdown model with dominant pollutant and GRAP stage.
    """
    pm25_sub = calculate_sub_index(pm25, PM25_BREAKPOINTS)
    pm10_sub = calculate_sub_index(pm10, PM10_BREAKPOINTS)
    no2_sub = calculate_sub_index(no2, NO2_BREAKPOINTS)

    overall_aqi = pm25_sub
    dominant = "PM2.5"

    if pm10_sub > overall_aqi:
        overall_aqi = pm10_sub
        dominant = "PM10"
    if no2_sub > overall_aqi:
        overall_aqi = no2_sub
        dominant = "NO2"

    category, color_hex, badge_bg, badge_text = get_naqi_category(overall_aqi)
    grap_stage = get_grap_stage(overall_aqi)

    return CPCBBreakdown(
        aqi=overall_aqi,
        category=category,
        grapStage=grap_stage,
        dominantPollutant=dominant,
        subIndices=SubIndices(pm25=pm25_sub, pm10=pm10_sub, no2=no2_sub),
        colorHex=color_hex,
        badgeBg=badge_bg,
        badgeText=badge_text,
    )


def calculate_berkeley_cigarettes(
    pm25_ug_m3: float,
    hours_exposure: float = 24.0,
    activity_multiplier: float = 1.0,
) -> float:
    """Calculates equivalent cigarette consumption via Berkeley Earth inhalation equivalence.

    Benchmark:
        Inhaling 22 µg/m³ of PM2.5 continuously over 24 hours transfers an alveolar
        particulate mass approximately equivalent to smoking 1 cigarette.

    Args:
        pm25_ug_m3: Ambient or indoor PM2.5 concentration in µg/m³.
        hours_exposure: Exposure duration in hours.
        activity_multiplier: Physical ventilation scaling (1.0 sedentary, 1.4 active cycling/walking).

    Returns:
        Equivalent cigarettes rounded to 1 decimal place.
    """
    if pm25_ug_m3 <= 0 or hours_exposure <= 0:
        return 0.0

    raw = (pm25_ug_m3 * (hours_exposure / 24.0) * activity_multiplier) / 22.0
    return round(raw, 1)


def calculate_inhalation_dose(
    pm25_ug_m3: float,
    duration_hours: float,
    breathing_rate_m3h: float = 0.6,
    filter_efficiency: float = 0.0,
) -> float:
    """Calculates total inhaled particulate dose in micrograms.

    Formula:
        Dose (µg) = C_ambient * (1 - Filter_eff) * Breathing_Rate * Duration

    Args:
        pm25_ug_m3: Ambient PM2.5 in µg/m³.
        duration_hours: Exposure time in hours.
        breathing_rate_m3h: Inhalation rate in m³/hour.
        filter_efficiency: Fractional filtration efficiency (0.0 none, 0.95 N95, 0.70 HEPA ambient).

    Returns:
        Micrograms of PM2.5 deposited in respiratory tract.
    """
    effective_concentration = pm25_ug_m3 * max(0.0, 1.0 - filter_efficiency)
    dose = effective_concentration * breathing_rate_m3h * duration_hours
    return round(dose, 1)


def find_optimal_ventilation_window(hourly_points: Sequence[HourlyTelemetryPoint]) -> VentilationWindow:
    """Identifies the cleanest afternoon window when solar heating breaks the surface inversion.

    In Indian winter atmospheric physics, nocturnal ground cooling creates a radiation inversion
    trapping smog below 400m. Around 12:00 to 15:30, solar radiation warms the land surface,
    lifting the planetary boundary layer to 900m-1400m and diluting surface aerosol concentration.

    Args:
        hourly_points: 24-hour sequence of hourly telemetry points.

    Returns:
        VentilationWindow model identifying start hour, end hour, and expected mixing height.
    """
    if not hourly_points:
        return VentilationWindow(
            startHour=12,
            endHour=15,
            avgPm25=120.0,
            avgMixingHeight=950.0,
            recommendationText="Ventilate living areas between 12:00 PM and 3:00 PM during peak solar mixing.",
        )

    daytime_points = [p for p in hourly_points if 10 <= p.hour <= 17]
    best_start = 12
    min_ratio = float("inf")

    for i in range(len(daytime_points) - 2):
        chunk = daytime_points[i : i + 3]
        avg_pm = sum(p.pm25 for p in chunk) / len(chunk)
        avg_blh = sum(p.boundary_layer_height for p in chunk) / len(chunk)
        ratio = avg_pm / max(100.0, avg_blh)

        if ratio < min_ratio:
            min_ratio = ratio
            best_start = chunk[0].hour

    window_chunk = [p for p in hourly_points if best_start <= p.hour <= best_start + 2]
    count = len(window_chunk) or 1
    avg_pm25 = round(sum(p.pm25 for p in window_chunk) / count, 1)
    avg_blh = round(sum(p.boundary_layer_height for p in window_chunk) / count, 1)

    reduction = round(max(10.0, 100.0 - (avg_pm25 / max(1.0, hourly_points[0].pm25)) * 100.0))

    return VentilationWindow(
        startHour=best_start,
        endHour=best_start + 3,
        avgPm25=avg_pm25,
        avgMixingHeight=avg_blh,
        recommendationText=(
            f"Safest cross-ventilation window is {best_start}:00 to {best_start + 3}:00. "
            f"Boundary mixing layer lifts to ~{int(avg_blh)}m, reducing ambient surface PM2.5 "
            f"by ~{reduction}% compared to nocturnal inversion trapping."
        ),
    )
