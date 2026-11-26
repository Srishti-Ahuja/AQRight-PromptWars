"""Unit tests for the Source Attribution Breakdown diagnostic engine."""

from __future__ import annotations

import pytest
from app.models.schemas import (
    CPCBBreakdown,
    CurrentTelemetry,
    GrapStage,
    HourlyTelemetryPoint,
    NAQICategory,
    SourceDriverType,
    SubIndices,
    TelemetryResponse,
    VentilationWindow,
)
from app.services.source_attribution import compute_source_attribution


def _make_telemetry(
    pm25: float = 265.0,
    pm10: float = 380.0,
    no2: float = 72.0,
    co: float = 1.8,
    o3: float = 42.0,
    blh: float = 320.0,
    wind: float = 4.0,
    is_trapped: bool = True,
) -> TelemetryResponse:
    """Builds a test TelemetryResponse model."""
    hourly = [
        HourlyTelemetryPoint(
            time=f"{h:02d}:00",
            hour=h,
            pm25=pm25,
            pm10=pm10,
            no2=no2,
            boundaryLayerHeight=blh,
            windSpeed=wind,
            temperature=18.0,
            relativeHumidity=65.0,
        )
        for h in range(24)
    ]
    cpcb = CPCBBreakdown(
        aqi=380,
        category=NAQICategory.VERY_POOR,
        grapStage=GrapStage.STAGE_II,
        dominantPollutant="PM2.5",
        subIndices=SubIndices(pm25=380, pm10=340, no2=130),
        colorHex="#ef4444",
        badgeBg="bg-rose-500/15",
        badgeText="text-rose-700",
    )
    vent = VentilationWindow(
        startHour=12,
        endHour=15,
        avgPm25=172.0,
        avgMixingHeight=1100.0,
        recommendationText="Ventilate at 12:00-15:00",
    )
    return TelemetryResponse(
        stationName="Anand Vihar, Delhi",
        locality="Anand Vihar ISBT",
        city="Delhi",
        state="Delhi (NCT)",
        latitude=28.6469,
        longitude=77.3160,
        lastUpdated="07:30 AM",
        current=CurrentTelemetry(
            pm25=pm25,
            pm10=pm10,
            no2=no2,
            co=co,
            o3=o3,
            boundaryLayerHeight=blh,
            windSpeed=wind,
            temperature=14.0,
            relativeHumidity=85.0,
            isTrappedSurfaceSmog=is_trapped,
        ),
        hourly=hourly,
        cpcb=cpcb,
        bestVentilationWindow=vent,
    )


def test_biomass_inversion_identified_when_fine_fraction_and_inversion_high():
    """High PM2.5/PM10 ratio with low mixing height should diagnose biomass inversion."""
    tel = _make_telemetry(pm25=280.0, pm10=340.0, blh=220.0, is_trapped=True)
    report = compute_source_attribution(tel)
    assert report.dominant_driver == SourceDriverType.BIOMASS_INVERSION
    assert report.meteorology.is_inversion_trapped is True
    biomass_metric = next(d for d in report.drivers if d.driver_type == SourceDriverType.BIOMASS_INVERSION)
    assert biomass_metric.contribution_percent >= 35.0


def test_surface_road_dust_identified_when_coarse_fraction_elevated():
    """Low PM2.5/PM10 ratio with high PM10 should diagnose road dust resuspension."""
    tel = _make_telemetry(pm25=60.0, pm10=450.0, blh=800.0, wind=16.0, is_trapped=False)
    report = compute_source_attribution(tel)
    assert report.dominant_driver == SourceDriverType.SURFACE_ROAD_DUST
    dust_metric = next(d for d in report.drivers if d.driver_type == SourceDriverType.SURFACE_ROAD_DUST)
    assert dust_metric.contribution_percent >= 40.0


def test_vehicular_exhaust_identified_when_no2_and_co_spike():
    """High NO2 and CO in moderate particulate ambient should highlight vehicular corridor."""
    tel = _make_telemetry(pm25=50.0, pm10=80.0, no2=145.0, co=4.5, blh=650.0, is_trapped=False)
    report = compute_source_attribution(tel)
    assert report.dominant_driver == SourceDriverType.VEHICULAR_EXHAUST
    traffic_metric = next(d for d in report.drivers if d.driver_type == SourceDriverType.VEHICULAR_EXHAUST)
    assert traffic_metric.contribution_percent >= 40.0


def test_photochemical_smog_identified_when_ozone_spikes():
    """High Ozone during daytime should diagnose photochemical smog."""
    tel = _make_telemetry(pm25=30.0, pm10=50.0, no2=20.0, co=0.4, o3=160.0, blh=1200.0, is_trapped=False)
    report = compute_source_attribution(tel)
    assert report.dominant_driver == SourceDriverType.PHOTOCHEMICAL_SMOG
    photo_metric = next(d for d in report.drivers if d.driver_type == SourceDriverType.PHOTOCHEMICAL_SMOG)
    assert photo_metric.contribution_percent >= 35.0


def test_contribution_percentages_sum_to_100():
    """All 4 driver contribution percentages must sum to 100% (+/- 1% rounding)."""
    tel = _make_telemetry()
    report = compute_source_attribution(tel)
    total_pct = sum(d.contribution_percent for d in report.drivers)
    assert 99.0 <= total_pct <= 101.0
    assert len(report.drivers) == 4
