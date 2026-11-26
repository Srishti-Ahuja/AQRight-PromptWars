"""Pydantic v2 data models and strict schema definitions for AQRight."""

from __future__ import annotations

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class FloorElevation(str, Enum):
    """Building elevation brackets with distinct pollution aerodynamic profiles."""
    GROUND_1_2 = "ground_1_2"
    MID_3_7 = "mid_3_7"
    HIGH_8_PLUS = "high_8_plus"


class KitchenExhaust(str, Enum):
    """Kitchen ventilation infrastructure."""
    DUCTED_CHIMNEY = "ducted_chimney"
    EXHAUST_FAN = "exhaust_fan"
    OPEN_WINDOW_NONE = "open_window_none"


class AirFiltration(str, Enum):
    """Installed home active filtration type."""
    HEPA = "hepa"
    DIY_CORSI_ROSENTHAL = "diy_corsi_rosenthal"
    NONE = "none"


class HouseholdTrigger(str, Enum):
    """Common cultural and domestic aerosol emission triggers."""
    TADKA = "tadka"
    AGARBATTI = "agarbatti"
    MOSQUITO_COILS = "mosquito_coils"
    DRY_JHADU = "dry_jhadu"


class AgeGroup(str, Enum):
    """Biological age cohort."""
    CHILD = "child"
    ADULT = "adult"
    SENIOR = "senior"


class HealthSensitivity(str, Enum):
    """Pre-existing cardiovascular and respiratory vulnerability conditions."""
    NONE = "none"
    ASTHMA_BRONCHITIS = "asthma_bronchitis"
    CARDIAC_HYPERTENSION = "cardiac_hypertension"
    PREGNANT = "pregnant"


class OccupationType(str, Enum):
    """Daily routine and occupational exposure bracket."""
    STUDENT = "student"
    OFFICE_HYBRID = "office_hybrid"
    TWO_WHEELER_FIELD = "two_wheeler_field"
    HOMEMAKER_WFH = "homemaker_wfh"
    RETIRED = "retired"


class CommuteMode(str, Enum):
    """Primary transit mode with varied in-transit microenvironment filtration."""
    METRO_TRAIN = "metro_train"
    CLOSED_CAR = "closed_car"
    TWO_WHEELER_AUTO = "two_wheeler_auto"
    WALK_BUS = "walk_bus"
    NONE = "none"


class PeakOutdoorWindow(str, Enum):
    """Time-of-day window for maximum outdoor exposure."""
    MORNING_7_10 = "morning_7_10"
    MIDDAY_12_4 = "midday_12_4"
    EVENING_6_9 = "evening_6_9"


class NAQICategory(str, Enum):
    """Official Indian National Air Quality Index (NAQI) categories."""
    GOOD = "Good"
    SATISFACTORY = "Satisfactory"
    MODERATE = "Moderate"
    POOR = "Poor"
    VERY_POOR = "Very Poor"
    SEVERE = "Severe"


class GrapStage(str, Enum):
    """Commission for Air Quality Management (CAQM) GRAP Stages."""
    NONE = "None"
    STAGE_I = "Stage I (Poor)"
    STAGE_II = "Stage II (Very Poor)"
    STAGE_III = "Stage III (Severe)"
    STAGE_IV = "Stage IV (Severe+)"


class RecommendationPriority(str, Enum):
    """Action priority rating."""
    CRITICAL = "critical"
    HIGH = "high"
    PREVENTIVE = "preventive"


class RecommendationCategory(str, Enum):
    """Thematic domain of the intervention."""
    INDOOR_HACKS = "indoor_hacks"
    COMMUTE_SWAPS = "commute_swaps"
    ROUTINE_TIMING = "routine_timing"
    VULNERABLE_CARE = "vulnerable_care"


# ---------------------------------------------------------------------------
# Family & Household Input Models
# ---------------------------------------------------------------------------

class FamilyMemberInput(BaseModel):
    """Anonymized profile of a single household member."""
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(..., min_length=1, max_length=64)
    name: str = Field(..., min_length=1, max_length=64)
    age_group: AgeGroup = Field(default=AgeGroup.ADULT, alias="ageGroup")
    sensitivity: HealthSensitivity = Field(default=HealthSensitivity.NONE)
    occupation: OccupationType = Field(default=OccupationType.OFFICE_HYBRID)
    commute_mode: CommuteMode = Field(default=CommuteMode.METRO_TRAIN, alias="commuteMode")
    peak_window: PeakOutdoorWindow = Field(default=PeakOutdoorWindow.MORNING_7_10, alias="peakWindow")


class HouseholdProfileInput(BaseModel):
    """Structural and cultural characteristics of the residence."""
    model_config = ConfigDict(populate_by_name=True)

    elevation: Optional[FloorElevation] = None
    kitchen_exhaust: Optional[KitchenExhaust] = Field(default=None, alias="kitchenExhaust")
    air_filtration: Optional[AirFiltration] = Field(default=None, alias="airFiltration")
    triggers: List[HouseholdTrigger] = Field(default_factory=list)
    members: List[FamilyMemberInput] = Field(default_factory=list)
    is_submitted: bool = Field(default=False, alias="isSubmitted")


# ---------------------------------------------------------------------------
# Telemetry Models
# ---------------------------------------------------------------------------

class SubIndices(BaseModel):
    """CPCB NAQI individual sub-indices."""
    model_config = ConfigDict(populate_by_name=True)

    pm25: int
    pm10: int
    no2: int


class CPCBBreakdown(BaseModel):
    """Calculated Indian National Air Quality Index parameters."""
    model_config = ConfigDict(populate_by_name=True)

    aqi: int
    category: NAQICategory
    grap_stage: GrapStage = Field(alias="grapStage")
    dominant_pollutant: str = Field(alias="dominantPollutant")
    sub_indices: SubIndices = Field(alias="subIndices")
    color_hex: str = Field(alias="colorHex")
    badge_bg: str = Field(alias="badgeBg")
    badge_text: str = Field(alias="badgeText")


class HourlyTelemetryPoint(BaseModel):
    """Hourly observation or forecast record."""
    model_config = ConfigDict(populate_by_name=True)

    time: str
    hour: int = Field(ge=0, le=23)
    pm25: float
    pm10: float
    no2: float
    boundary_layer_height: float = Field(alias="boundaryLayerHeight")
    wind_speed: float = Field(alias="windSpeed")
    temperature: float
    relative_humidity: float = Field(alias="relativeHumidity")


class CurrentTelemetry(BaseModel):
    """Real-time current meteorological and pollutant concentrations."""
    model_config = ConfigDict(populate_by_name=True)

    pm25: float
    pm10: float
    no2: float
    co: float
    o3: float
    boundary_layer_height: float = Field(alias="boundaryLayerHeight")
    wind_speed: float = Field(alias="windSpeed")
    temperature: float
    relative_humidity: float = Field(alias="relativeHumidity")
    is_trapped_surface_smog: bool = Field(alias="isTrappedSurfaceSmog")


class VentilationWindow(BaseModel):
    """Safest daily window for cross-ventilating living quarters."""
    model_config = ConfigDict(populate_by_name=True)

    start_hour: int = Field(alias="startHour")
    end_hour: int = Field(alias="endHour")
    avg_pm25: float = Field(alias="avgPm25")
    avg_mixing_height: float = Field(alias="avgMixingHeight")
    recommendation_text: str = Field(alias="recommendationText")


class TelemetryResponse(BaseModel):
    """Comprehensive telemetry envelope for a monitoring location."""
    model_config = ConfigDict(populate_by_name=True)

    station_name: str = Field(alias="stationName")
    locality: str
    city: str
    state: str
    latitude: float
    longitude: float
    last_updated: str = Field(alias="lastUpdated")
    current: CurrentTelemetry
    hourly: List[HourlyTelemetryPoint]
    cpcb: CPCBBreakdown
    best_ventilation_window: VentilationWindow = Field(alias="bestVentilationWindow")


# ---------------------------------------------------------------------------
# Explainable AI (XAI) Models
# ---------------------------------------------------------------------------

class FeatureAttribution(BaseModel):
    """SHAP-style quantitative feature attribution weight."""
    model_config = ConfigDict(populate_by_name=True)

    feature_name: str = Field(alias="featureName")
    weight_percent: float = Field(alias="weightPercent", ge=0, le=100)
    direction: str  # "amplifying" or "mitigating"
    description: str


class CounterfactualMetrics(BaseModel):
    """Side-by-side exposure model comparing status-quo against recommended intervention."""
    model_config = ConfigDict(populate_by_name=True)

    baseline_inhaled_dose_ugd: float = Field(alias="baselineInhaledDoseUgd")
    action_inhaled_dose_ugd: float = Field(alias="actionInhaledDoseUgd")
    dose_avoided_ugd: float = Field(alias="doseAvoidedUgd")
    exposure_reduction_percent: float = Field(alias="exposureReductionPercent")
    baseline_cigarette_equiv: float = Field(alias="baselineCigaretteEquiv")
    action_cigarette_equiv: float = Field(alias="actionCigaretteEquiv")
    cigarettes_avoided: float = Field(alias="cigarettesAvoided")
    co2_saved_kg: Optional[float] = Field(default=None, alias="co2SavedKg")


class ScientificGrounding(BaseModel):
    """Authoritative scientific and statutory citations supporting the advice."""
    model_config = ConfigDict(populate_by_name=True)

    mechanism: str
    cpcb_standard_citation: str = Field(alias="cpcbStandardCitation")
    who_standard_citation: str = Field(alias="whoStandardCitation")
    physiological_detail: str = Field(alias="physiologicalDetail")


class XAIRecommendation(BaseModel):
    """Fully explainable and personalized action recommendation."""
    model_config = ConfigDict(populate_by_name=True)

    id: str
    target_id: str = Field(alias="targetId")
    target_name: str = Field(alias="targetName")
    priority: RecommendationPriority
    category: RecommendationCategory
    title: str
    personalized_instruction: str = Field(alias="personalizedInstruction")
    impact_pill: str = Field(alias="impactPill")
    decision_summary: str = Field(alias="decisionSummary")
    confidence_score: float = Field(alias="confidenceScore", ge=0.0, le=1.0)
    shap_attributions: List[FeatureAttribution] = Field(alias="shapAttributions")
    counterfactual: CounterfactualMetrics
    scientific_grounding: ScientificGrounding = Field(alias="scientificGrounding")


class RecommendationRequest(BaseModel):
    """Payload to trigger explainable AI recommendations computation."""
    model_config = ConfigDict(populate_by_name=True)

    telemetry: TelemetryResponse
    household: HouseholdProfileInput


class RecommendationResponse(BaseModel):
    """Envelope containing computed explainable AI recommendations."""
    model_config = ConfigDict(populate_by_name=True)

    recommendations: List[XAIRecommendation]
    total_actions: int = Field(alias="totalActions")
    critical_actions: int = Field(alias="criticalActions")
    timestamp: str


class CityPresetResponse(BaseModel):
    """Metadata for an Indian ambient air monitoring station preset."""
    model_config = ConfigDict(populate_by_name=True)

    id: str
    name: str
    locality: str
    city: str
    state: str
    latitude: float
    longitude: float
    monitoring_agency: str = Field(alias="monitoringAgency")


# ---------------------------------------------------------------------------
# Source Attribution Breakdown Models
# ---------------------------------------------------------------------------

class SourceDriverType(str, Enum):
    """Categorization of urban atmospheric pollution sources."""
    BIOMASS_INVERSION = "biomass_inversion"
    SURFACE_ROAD_DUST = "surface_road_dust"
    VEHICULAR_EXHAUST = "vehicular_exhaust"
    PHOTOCHEMICAL_SMOG = "photochemical_smog"


class SourceDriverMetric(BaseModel):
    """Individual atmospheric emission driver with quantitative attribution."""
    model_config = ConfigDict(populate_by_name=True)

    driver_type: SourceDriverType = Field(alias="driverType")
    label: str
    contribution_percent: float = Field(alias="contributionPercent", ge=0.0, le=100.0)
    severity: str  # "high", "moderate", "low"
    rationale: str
    metrics_snapshot: str = Field(alias="metricsSnapshot")
    icon_name: str = Field(alias="iconName")


class MeteorologicalContext(BaseModel):
    """Atmospheric dispersion and mixing layer indicators."""
    model_config = ConfigDict(populate_by_name=True)

    mixing_layer_m: float = Field(alias="mixingLayerM")
    is_inversion_trapped: bool = Field(alias="isInversionTrapped")
    wind_speed_kmh: float = Field(alias="windSpeedKmh")
    wind_cardinal: str = Field(alias="windCardinal")
    temperature_c: float = Field(alias="temperatureC")
    humidity_percent: float = Field(alias="humidityPercent")
    pm25_to_pm10_ratio: float = Field(alias="pm25ToPm10Ratio")


class SourceAttributionReport(BaseModel):
    """Comprehensive diagnostic breakdown explaining why AQI is elevated."""
    model_config = ConfigDict(populate_by_name=True)

    station_name: str = Field(alias="stationName")
    aqi: int
    category: str
    dominant_driver: SourceDriverType = Field(alias="dominantDriver")
    causal_summary: str = Field(alias="causalSummary")
    drivers: List[SourceDriverMetric]
    meteorology: MeteorologicalContext
    action_implication: str = Field(alias="actionImplication")


# ---------------------------------------------------------------------------
# Dynamic Clean-Route Commute Comparator Models
# ---------------------------------------------------------------------------

class CommuteTravelMode(str, Enum):
    """Travel transit mode for commute exposure simulation."""
    DRIVING = "driving"
    CYCLING = "cycling"
    WALKING = "walking"


class RouteCompareRequest(BaseModel):
    """Validated user payload to trigger dynamic clean route comparison."""
    model_config = ConfigDict(populate_by_name=True)

    source: str = Field(..., min_length=2, max_length=120)
    destination: str = Field(..., min_length=2, max_length=120)
    travel_mode: CommuteTravelMode = Field(default=CommuteTravelMode.DRIVING, alias="travelMode")
    member_id: Optional[str] = Field(default=None, alias="memberId")
    household: Optional[HouseholdProfileInput] = None


class RouteWaypoint(BaseModel):
    """Sampled geographic point along a road route with live ambient AQI."""
    model_config = ConfigDict(populate_by_name=True)

    lat: float
    lon: float
    order: int
    pm25: float
    pm10: float
    no2: float
    aqi: int
    category: str


class RouteOptionMetrics(BaseModel):
    """Aggregated navigational and environmental air quality metrics for a single route."""
    model_config = ConfigDict(populate_by_name=True)

    route_id: str = Field(alias="routeId")
    label: str
    distance_km: float = Field(alias="distanceKm")
    duration_min: float = Field(alias="durationMin")
    mean_aqi: int = Field(alias="meanAqi")
    peak_aqi: int = Field(alias="peakAqi")
    mean_pm25: float = Field(alias="meanPm25")
    peak_pm25: float = Field(alias="peakPm25")
    mean_no2: float = Field(alias="meanNo2")
    estimated_dose_ug: float = Field(alias="estimatedDoseUg")
    geometry_geojson: dict = Field(alias="geometryGeojson")
    waypoints: List[RouteWaypoint]


class RouteComparisonResponse(BaseModel):
    """Envelope comparing multiple routes with AQI differential and commuter exposure savings."""
    model_config = ConfigDict(populate_by_name=True)

    source_resolved: str = Field(alias="sourceResolved")
    destination_resolved: str = Field(alias="destinationResolved")
    travel_mode: CommuteTravelMode = Field(alias="travelMode")
    routes: List[RouteOptionMetrics]
    cleanest_route_index: int = Field(alias="cleanestRouteIndex")
    aqi_difference_points: int = Field(alias="aqiDifferencePoints")
    exposure_savings_percent: float = Field(alias="exposureSavingsPercent")
    inhaled_pm25_avoided_ug: float = Field(alias="inhaledPm25AvoidedUg")
    comparison_summary: str = Field(alias="comparisonSummary")
    commuter_target_name: Optional[str] = Field(default=None, alias="commuterTargetName")

