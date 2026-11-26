"""FastAPI API route definitions for AQRight."""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import (
    CityPresetResponse,
    RecommendationPriority,
    RecommendationRequest,
    RecommendationResponse,
    RouteCompareRequest,
    RouteComparisonResponse,
    SourceAttributionReport,
    TelemetryResponse,
)
from app.services.commute_router import compare_commute_routes
from app.services.source_attribution import compute_source_attribution
from app.services.telemetry import (
    INDIAN_STATION_PRESETS,
    get_telemetry_data,
    search_indian_cities,
)
from app.services.xai_engine import generate_xai_recommendations

router = APIRouter()



@router.get(
    "/telemetry",
    response_model=TelemetryResponse,
    summary="Fetch live Indian CPCB/Open-Meteo telemetry",
    description="Retrieves live air quality telemetry, NAQI breakpoint sub-indices, and boundary mixing layer height with 15-minute TTL caching.",
)
async def get_telemetry(
    lat: float = Query(28.6469, description="Latitude coordinate", ge=-90.0, le=90.0),
    lon: float = Query(77.3160, description="Longitude coordinate", ge=-180.0, le=180.0),
    name: Optional[str] = Query(None, description="Optional custom station name"),
    locality: Optional[str] = Query(None, description="Optional locality name"),
    city: Optional[str] = Query(None, description="Optional city name"),
    state: Optional[str] = Query(None, description="Optional state name"),
) -> TelemetryResponse:
    """Endpoint retrieving ambient telemetry and CPCB NAQI breakdown."""
    try:
        return await get_telemetry_data(
            lat=lat,
            lon=lon,
            name=name,
            locality=locality,
            city=city,
            state=state,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve telemetry data: {str(exc)}")




@router.get(
    "/presets",
    response_model=List[CityPresetResponse],
    summary="Get curated Indian CPCB monitoring station presets",
    description="Returns preconfigured major metropolitan monitoring hubs (Delhi Anand Vihar, Mumbai BKC, Bengaluru, etc.).",
)
async def get_presets() -> List[CityPresetResponse]:
    """Endpoint returning curated station presets."""
    return INDIAN_STATION_PRESETS


@router.get(
    "/cities/search",
    response_model=List[CityPresetResponse],
    summary="Search Indian cities & localities",
    description="Geocoding autocomplete constrained strictly to Indian geography with 350ms frontend debouncing.",
)
async def search_cities(
    q: str = Query(..., min_length=2, description="Search query string")
) -> List[CityPresetResponse]:
    """Endpoint performing geocoding lookup across Indian locations."""
    return await search_indian_cities(q)


@router.post(
    "/recommendations/xai",
    response_model=RecommendationResponse,
    summary="Generate Explainable AI (XAI) recommendations",
    description="Computes hyper-personalized recommendations with SHAP feature attribution weights and counterfactual exposure reductions.",
)
async def compute_recommendations(
    payload: RecommendationRequest,
) -> RecommendationResponse:
    """Endpoint generating explainable recommendations."""
    recommendations = generate_xai_recommendations(
        telemetry=payload.telemetry,
        household=payload.household,
    )

    critical_count = sum(1 for r in recommendations if r.priority == RecommendationPriority.CRITICAL)

    return RecommendationResponse(
        recommendations=recommendations,
        totalActions=len(recommendations),
        criticalActions=critical_count,
        timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    )


@router.get(
    "/telemetry/attribution",
    response_model=SourceAttributionReport,
    summary="Get source attribution breakdown for current telemetry",
    description="Diagnoses primary pollution mechanisms (inversion, road dust, vehicular, photochemical) from multi-pollutant ratios.",
)
async def get_source_attribution(
    lat: float = Query(28.6469, description="Latitude coordinate", ge=-90.0, le=90.0),
    lon: float = Query(77.3160, description="Longitude coordinate", ge=-180.0, le=180.0),
    wind_deg: float = Query(315.0, description="Wind direction azimuth degrees", ge=0.0, le=360.0),
) -> SourceAttributionReport:
    """Endpoint calculating deterministic multi-pollutant source attribution."""
    try:
        telemetry = await get_telemetry_data(lat=lat, lon=lon)
        return compute_source_attribution(telemetry=telemetry, wind_direction_deg=wind_deg)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Source attribution calculation failed: {str(exc)}")


@router.post(
    "/commute/compare",
    response_model=RouteComparisonResponse,
    summary="Dynamic Clean-Route Commute Comparator",
    description="Compares real OSRM road routes between Source and Destination with sampled live waypoint AQI and personal exposure deltas.",
)
async def compare_routes(
    payload: RouteCompareRequest,
) -> RouteComparisonResponse:
    """Endpoint comparing road routes with live waypoint air quality metrics."""
    try:
        return await compare_commute_routes(payload)
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Route comparison failed: {str(exc)}")

