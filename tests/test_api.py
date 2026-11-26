"""Integration tests for FastAPI application endpoints."""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.schemas import (
    AgeGroup,
    AirFiltration,
    CommuteMode,
    FamilyMemberInput,
    FloorElevation,
    HealthSensitivity,
    HouseholdProfileInput,
    HouseholdTrigger,
    KitchenExhaust,
    OccupationType,
    PeakOutdoorWindow,
)

client = TestClient(app)


def test_health_check_endpoint():
    """Verify /health endpoint returns status 200 and healthy status."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "AQRight" in data["service"]


def test_root_endpoint():
    """Verify root / endpoint returns documentation and endpoint references."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "endpoints" in data
    assert "telemetry" in data["endpoints"]


def test_get_presets_endpoint():
    """Verify /api/v1/presets returns curated Indian monitoring stations."""
    response = client.get("/api/v1/presets")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 8
    # Ensure Delhi Anand Vihar and Mumbai BKC exist
    names = [p["name"] for p in data]
    assert any("Anand Vihar" in n for n in names)
    assert any("Bandra Kurla" in n for n in names)


def test_get_telemetry_endpoint():
    """Verify /api/v1/telemetry returns full CPCB telemetry model."""
    response = client.get("/api/v1/telemetry?lat=28.6469&lon=77.3160&name=Anand%20Vihar")
    assert response.status_code == 200
    data = response.json()
    assert "current" in data
    assert "cpcb" in data
    assert "hourly" in data
    assert "bestVentilationWindow" in data
    assert data["cpcb"]["aqi"] > 0
    assert len(data["hourly"]) >= 24


def test_compute_xai_recommendations_endpoint():
    """Verify POST /api/v1/recommendations/xai generates explainable recommendations."""
    # First get telemetry
    tel_res = client.get("/api/v1/telemetry?lat=28.6469&lon=77.3160")
    assert tel_res.status_code == 200
    telemetry_data = tel_res.json()

    # Build household payload
    payload = {
        "telemetry": telemetry_data,
        "household": {
            "isSubmitted": True,
            "elevation": "ground_1_2",
            "kitchenExhaust": "exhaust_fan",
            "airFiltration": "none",
            "triggers": ["tadka", "dry_jhadu"],
            "members": [
                {
                    "id": "mem_1",
                    "name": "Dad (Rajesh)",
                    "ageGroup": "adult",
                    "sensitivity": "none",
                    "occupation": "two_wheeler_field",
                    "commuteMode": "two_wheeler_auto",
                    "peakWindow": "morning_7_10",
                },
                {
                    "id": "mem_2",
                    "name": "Dadi (Kamla)",
                    "ageGroup": "senior",
                    "sensitivity": "asthma_bronchitis",
                    "occupation": "retired",
                    "commuteMode": "none",
                    "peakWindow": "morning_7_10",
                },
            ],
        },
    }

    response = client.post("/api/v1/recommendations/xai", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "recommendations" in data
    assert data["totalActions"] > 0
    assert data["criticalActions"] > 0

    first_rec = data["recommendations"][0]
    assert "decisionSummary" in first_rec
    assert "shapAttributions" in first_rec
    assert "counterfactual" in first_rec
    assert "scientificGrounding" in first_rec
    assert len(first_rec["shapAttributions"]) > 0

    # Ensure SHAP weights approximately sum to 100%
    total_weight = sum(a["weightPercent"] for a in first_rec["shapAttributions"])
    assert 95 <= total_weight <= 105


def test_unsubmitted_household_returns_empty_recommendations():
    """Verify that an unsubmitted or empty household profile yields 0 recommendations."""
    tel_res = client.get("/api/v1/telemetry?lat=28.6469&lon=77.3160")
    assert tel_res.status_code == 200
    telemetry_data = tel_res.json()

    payload = {
        "telemetry": telemetry_data,
        "household": {
            "isSubmitted": False,
            "elevation": None,
            "kitchenExhaust": None,
            "airFiltration": None,
            "triggers": [],
            "members": [],
        },
    }

    response = client.post("/api/v1/recommendations/xai", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["totalActions"] == 0
    assert len(data["recommendations"]) == 0

