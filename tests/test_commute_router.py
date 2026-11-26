"""Unit tests for the dynamic Clean-Route Commute Comparator service."""

from __future__ import annotations

import pytest
from app.models.schemas import (
    CommuteMode,
    CommuteTravelMode,
    FamilyMemberInput,
    HouseholdProfileInput,
    RouteCompareRequest,
)
from app.services.commute_router import _clean_text_query, _sample_waypoints, compare_commute_routes


def test_clean_text_query_strips_injection_and_extra_spaces():
    """Validates that control chars and extra whitespace are cleanly removed."""
    raw = "  Connaught Place <script>alert(1)</script> & New Delhi  "
    cleaned = _clean_text_query(raw)
    assert "<" not in cleaned
    assert ">" not in cleaned
    assert "(" not in cleaned
    assert "Connaught Place" in cleaned
    assert "New Delhi" in cleaned


def test_sample_waypoints_returns_bounded_count():
    """Sampling must return evenly spaced coordinates and maintain requested count."""
    coords = [[77.20 + i * 0.01, 28.60 + i * 0.01] for i in range(25)]
    sampled = _sample_waypoints(coords, count=5)
    assert len(sampled) == 5
    # First and last point matching
    assert sampled[0][0] == coords[0][1]
    assert sampled[-1][0] == coords[-1][1]


@pytest.mark.asyncio
async def test_compare_commute_routes_rejects_identical_locations():
    """Identical source and destination must raise ValueError."""
    req = RouteCompareRequest(
        source="Anand Vihar, Delhi",
        destination="Anand Vihar, Delhi",
        travel_mode=CommuteTravelMode.DRIVING,
    )
    with pytest.raises(ValueError, match="cannot be identical"):
        await compare_commute_routes(req)


@pytest.mark.asyncio
async def test_compare_commute_routes_rejects_empty_locations():
    """Empty strings after stripping must raise ValueError."""
    req = RouteCompareRequest(
        source="   ",
        destination="Noida",
        travel_mode=CommuteTravelMode.DRIVING,
    )
    with pytest.raises(ValueError):
        await compare_commute_routes(req)


@pytest.mark.asyncio
async def test_compare_commute_routes_returns_valid_metrics():
    """Valid route comparison between distinct Indian locations."""
    req = RouteCompareRequest(
        source="Anand Vihar, Delhi",
        destination="Connaught Place, Delhi",
        travel_mode=CommuteTravelMode.DRIVING,
    )
    resp = await compare_commute_routes(req)
    assert resp.source_resolved
    assert resp.destination_resolved
    assert len(resp.routes) >= 1
    assert resp.cleanest_route_index >= 0
    assert resp.cleanest_route_index < len(resp.routes)
    for r in resp.routes:
        assert r.distance_km > 0.0
        assert r.duration_min > 0.0
        assert r.mean_aqi >= 0
        assert len(r.waypoints) > 0


@pytest.mark.asyncio
async def test_compare_commute_routes_uses_family_member_profile():
    """When a family member is specified, inhalation dose reflects their commute mode."""
    member = FamilyMemberInput(
        id="mem_cyclist",
        name="Aarav",
        age_group="adult",
        sensitivity="none",
        occupation="student",
        commute_mode=CommuteMode.TWO_WHEELER_AUTO,
        peak_window="morning_7_10",
    )
    hh = HouseholdProfileInput(
        elevation="ground_1_2",
        kitchen_exhaust="exhaust_fan",
        air_filtration="none",
        triggers=[],
        members=[member],
        is_submitted=True,
    )
    req = RouteCompareRequest(
        source="Indiranagar, Bengaluru",
        destination="Whitefield, Bengaluru",
        travel_mode=CommuteTravelMode.CYCLING,
        member_id="mem_cyclist",
        household=hh,
    )
    resp = await compare_commute_routes(req)
    assert resp.commuter_target_name == "Aarav"
    assert resp.inhaled_pm25_avoided_ug >= 0.0
