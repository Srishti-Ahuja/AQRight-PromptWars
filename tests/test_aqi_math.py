"""Unit tests for Indian CPCB NAQI math, GRAP stages, and inhalation models."""

import pytest
from app.models.schemas import GrapStage, HourlyTelemetryPoint, NAQICategory
from app.services.aqi_math import (
    NO2_BREAKPOINTS,
    PM10_BREAKPOINTS,
    PM25_BREAKPOINTS,
    calculate_berkeley_cigarettes,
    calculate_cpcb_breakdown,
    calculate_inhalation_dose,
    calculate_sub_index,
    find_optimal_ventilation_window,
    get_grap_stage,
    get_naqi_category,
)


def test_calculate_sub_index_pm25_breakpoints():
    """Verify official CPCB linear sub-index interpolation for PM2.5."""
    # Zero concentration
    assert calculate_sub_index(0.0, PM25_BREAKPOINTS) == 0

    # Within 'Good' category (0-30 µg/m³ -> 0-50 index)
    # At 15 µg/m³ -> exactly 25
    assert calculate_sub_index(15.0, PM25_BREAKPOINTS) == 25
    assert calculate_sub_index(30.0, PM25_BREAKPOINTS) == 50

    # Within 'Satisfactory' category (31-60 µg/m³ -> 51-100 index)
    assert calculate_sub_index(60.0, PM25_BREAKPOINTS) == 100

    # Within 'Moderate' category (61-90 µg/m³ -> 101-200 index)
    assert calculate_sub_index(90.0, PM25_BREAKPOINTS) == 200

    # Within 'Poor' category (91-120 µg/m³ -> 201-300 index)
    assert calculate_sub_index(120.0, PM25_BREAKPOINTS) == 300

    # Within 'Very Poor' category (121-250 µg/m³ -> 301-400 index)
    assert calculate_sub_index(250.0, PM25_BREAKPOINTS) == 400

    # Severe (>250 µg/m³)
    assert calculate_sub_index(380.0, PM25_BREAKPOINTS) >= 450


def test_get_naqi_category_classification():
    """Verify NAQI qualitative category boundaries."""
    assert get_naqi_category(45)[0] == NAQICategory.GOOD
    assert get_naqi_category(85)[0] == NAQICategory.SATISFACTORY
    assert get_naqi_category(160)[0] == NAQICategory.MODERATE
    assert get_naqi_category(240)[0] == NAQICategory.POOR
    assert get_naqi_category(350)[0] == NAQICategory.VERY_POOR
    assert get_naqi_category(460)[0] == NAQICategory.SEVERE


def test_get_grap_stage():
    """Verify Commission for Air Quality Management (CAQM) GRAP stage triggers."""
    assert get_grap_stage(150) == GrapStage.NONE
    assert get_grap_stage(250) == GrapStage.STAGE_I
    assert get_grap_stage(350) == GrapStage.STAGE_II
    assert get_grap_stage(420) == GrapStage.STAGE_III
    assert get_grap_stage(480) == GrapStage.STAGE_IV


def test_cpcb_breakdown_dominant_pollutant():
    """Verify CPCB sub-index maximum rule determines dominant pollutant."""
    # When PM2.5 is drastically higher than PM10 and NO2
    breakdown_pm25 = calculate_cpcb_breakdown(pm25=220.0, pm10=80.0, no2=40.0)
    assert breakdown_pm25.dominant_pollutant == "PM2.5"
    assert breakdown_pm25.category in (NAQICategory.VERY_POOR, NAQICategory.SEVERE)

    # When PM10 is drastically higher
    breakdown_pm10 = calculate_cpcb_breakdown(pm25=25.0, pm10=450.0, no2=40.0)
    assert breakdown_pm10.dominant_pollutant == "PM10"
    assert breakdown_pm10.category == NAQICategory.SEVERE


def test_berkeley_earth_cigarette_equivalence():
    """Verify Berkeley Earth 22 µg/m³ PM2.5 * 24h = 1 cigarette metric."""
    # Inhaling 22 µg/m³ over 24h at resting multiplier 1.0 = 1.0 cigarette
    assert calculate_berkeley_cigarettes(22.0, hours_exposure=24.0, activity_multiplier=1.0) == 1.0

    # Inhaling 220 µg/m³ over 24h = 10.0 cigarettes
    assert calculate_berkeley_cigarettes(220.0, hours_exposure=24.0, activity_multiplier=1.0) == 10.0

    # Zero exposure yields 0.0
    assert calculate_berkeley_cigarettes(0.0, 24.0) == 0.0
    assert calculate_berkeley_cigarettes(100.0, 0.0) == 0.0


def test_inhalation_dose():
    """Verify physiological inhalation mass dose calculations."""
    # 100 µg/m³ * 1 hour * 0.6 m³/h * (1 - 0.0) = 60 µg
    dose = calculate_inhalation_dose(pm25_ug_m3=100.0, duration_hours=1.0, breathing_rate_m3h=0.6, filter_efficiency=0.0)
    assert dose == 60.0

    # With N95 (95% efficiency)
    filtered_dose = calculate_inhalation_dose(pm25_ug_m3=100.0, duration_hours=1.0, breathing_rate_m3h=0.6, filter_efficiency=0.95)
    assert filtered_dose == 3.0


def test_find_optimal_ventilation_window():
    """Verify algorithm identifies the afternoon inversion breakup window."""
    hourly_points = []
    for h in range(24):
        # High PM and low BLH in morning, low PM and high BLH in afternoon (12-15)
        is_afternoon = 12 <= h <= 15
        hourly_points.append(
            HourlyTelemetryPoint(
                time=f"{h:02d}:00",
                hour=h,
                pm25=80.0 if is_afternoon else 280.0,
                pm10=140.0 if is_afternoon else 390.0,
                no2=45.0 if is_afternoon else 85.0,
                boundaryLayerHeight=1100.0 if is_afternoon else 240.0,
                windSpeed=8.0 if is_afternoon else 3.0,
                temperature=23.0 if is_afternoon else 14.0,
                relativeHumidity=45.0 if is_afternoon else 85.0,
            )
        )

    window = find_optimal_ventilation_window(hourly_points)
    assert 11 <= window.start_hour <= 14
    assert window.avg_mixing_height > 800.0
