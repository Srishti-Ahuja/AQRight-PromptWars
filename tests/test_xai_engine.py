"""
Comprehensive unit tests for the deterministic XAI recommendation engine.

Covers:
  - Submission guard (empty profile → empty list)
  - Every household trigger generates correct recommendation id
  - All floor elevation variants
  - All kitchen exhaust variants
  - All family member profiles (sensitivity, age, commute, occupation)
  - SHAP weight integrity (sum ≈ 100% per recommendation)
  - Counterfactual dose ordering (action ≤ baseline)
  - Scientific grounding fields present and non-empty
  - Multi-member household accumulation
  - Priority escalation logic
"""

from __future__ import annotations

import pytest

from app.models.schemas import (
    AgeGroup,
    AirFiltration,
    CommuteMode,
    CurrentTelemetry,
    CPCBBreakdown,
    FamilyMemberInput,
    FloorElevation,
    GrapStage,
    HealthSensitivity,
    HourlyTelemetryPoint,
    HouseholdProfileInput,
    HouseholdTrigger,
    KitchenExhaust,
    NAQICategory,
    OccupationType,
    PeakOutdoorWindow,
    RecommendationPriority,
    SubIndices,
    TelemetryResponse,
    VentilationWindow,
)
from app.services.xai_engine import generate_xai_recommendations


# ---------------------------------------------------------------------------
# Factories
# ---------------------------------------------------------------------------

def _make_telemetry(
    pm25: float = 265.0,
    pm10: float = 380.0,
    no2: float = 72.0,
    blh: float = 320.0,
    is_trapped: bool = True,
) -> TelemetryResponse:
    """Build a fully-populated TelemetryResponse for testing."""
    hourly = [
        HourlyTelemetryPoint(
            time=f"{h:02d}:00",
            hour=h,
            pm25=pm25 * (0.65 if 12 <= h <= 15 else 1.0),
            pm10=pm10 * (0.65 if 12 <= h <= 15 else 1.0),
            no2=no2,
            boundaryLayerHeight=1100.0 if 12 <= h <= 15 else blh,
            windSpeed=8.0 if 12 <= h <= 15 else 4.0,
            temperature=22.0,
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
    ventilation = VentilationWindow(
        startHour=12,
        endHour=15,
        avgPm25=172.0,
        avgMixingHeight=1100.0,
        recommendationText="Ventilate at 12:00–15:00.",
    )
    return TelemetryResponse(
        stationName="Anand Vihar, Delhi",
        locality="Anand Vihar ISBT",
        city="Delhi",
        state="Delhi (NCT)",
        latitude=28.6469,
        longitude=77.316,
        lastUpdated="06:30 AM",
        current=CurrentTelemetry(
            pm25=pm25,
            pm10=pm10,
            no2=no2,
            co=1.8,
            o3=42.0,
            boundaryLayerHeight=blh,
            windSpeed=4.0,
            temperature=14.0,
            relativeHumidity=85.0,
            isTrappedSurfaceSmog=is_trapped,
        ),
        hourly=hourly,
        cpcb=cpcb,
        bestVentilationWindow=ventilation,
    )


def _make_member(
    id: str = "mem1",
    name: str = "Test User",
    age_group: AgeGroup = AgeGroup.ADULT,
    sensitivity: HealthSensitivity = HealthSensitivity.NONE,
    occupation: OccupationType = OccupationType.OFFICE_HYBRID,
    commute_mode: CommuteMode = CommuteMode.METRO_TRAIN,
    peak_window: PeakOutdoorWindow = PeakOutdoorWindow.MORNING_7_10,
) -> FamilyMemberInput:
    return FamilyMemberInput(
        id=id,
        name=name,
        ageGroup=age_group,
        sensitivity=sensitivity,
        occupation=occupation,
        commuteMode=commute_mode,
        peakWindow=peak_window,
    )


def _make_household(
    elevation: FloorElevation = FloorElevation.GROUND_1_2,
    kitchen_exhaust: KitchenExhaust = KitchenExhaust.EXHAUST_FAN,
    air_filtration: AirFiltration = AirFiltration.NONE,
    triggers: list[HouseholdTrigger] | None = None,
    members: list[FamilyMemberInput] | None = None,
    is_submitted: bool = True,
) -> HouseholdProfileInput:
    return HouseholdProfileInput(
        elevation=elevation,
        kitchenExhaust=kitchen_exhaust,
        airFiltration=air_filtration,
        triggers=triggers or [],
        members=members or [_make_member()],
        isSubmitted=is_submitted,
    )


SEVERE_TELEMETRY = _make_telemetry(pm25=265.0, blh=320.0, is_trapped=True)
CLEAN_TELEMETRY = _make_telemetry(pm25=25.0, pm10=40.0, blh=1500.0, is_trapped=False)


# ===========================================================================
# Submission guard
# ===========================================================================

class TestSubmissionGuard:
    def test_unsubmitted_returns_empty_list(self):
        hh = _make_household(is_submitted=False)
        result = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        assert result == []

    def test_submitted_with_no_elevation_returns_empty(self):
        hh = HouseholdProfileInput(
            elevation=None,
            kitchenExhaust=KitchenExhaust.EXHAUST_FAN,
            airFiltration=AirFiltration.NONE,
            triggers=[],
            members=[_make_member()],
            isSubmitted=True,
        )
        result = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        assert result == []

    def test_submitted_with_no_kitchen_exhaust_returns_empty(self):
        hh = HouseholdProfileInput(
            elevation=FloorElevation.GROUND_1_2,
            kitchenExhaust=None,
            airFiltration=AirFiltration.NONE,
            triggers=[],
            members=[_make_member()],
            isSubmitted=True,
        )
        result = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        assert result == []

    def test_submitted_valid_profile_returns_recommendations(self):
        hh = _make_household(triggers=[HouseholdTrigger.TADKA])
        result = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        assert len(result) > 0

    def test_clean_air_no_trapped_still_returns_trigger_recs(self):
        hh = _make_household(triggers=[HouseholdTrigger.TADKA])
        result = generate_xai_recommendations(CLEAN_TELEMETRY, hh)
        ids = [r.id for r in result]
        assert "rec_tadka_mitigation" in ids


# ===========================================================================
# Inversion window recommendation
# ===========================================================================

class TestInversionWindowRecommendation:
    def test_trapped_smog_generates_inversion_rec(self):
        hh = _make_household()
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        ids = [r.id for r in recs]
        assert "rec_inversion_window" in ids

    def test_high_pm25_without_trap_generates_inversion_rec(self):
        tel = _make_telemetry(pm25=200.0, blh=600.0, is_trapped=False)
        hh = _make_household()
        recs = generate_xai_recommendations(tel, hh)
        ids = [r.id for r in recs]
        assert "rec_inversion_window" in ids

    def test_low_pm25_no_trap_no_inversion_rec(self):
        hh = _make_household()
        recs = generate_xai_recommendations(CLEAN_TELEMETRY, hh)
        ids = [r.id for r in recs]
        assert "rec_inversion_window" not in ids

    def test_very_high_pm25_triggers_critical_priority(self):
        tel = _make_telemetry(pm25=280.0, blh=320.0, is_trapped=True)
        hh = _make_household()
        recs = generate_xai_recommendations(tel, hh)
        inv_rec = next(r for r in recs if r.id == "rec_inversion_window")
        assert inv_rec.priority == RecommendationPriority.CRITICAL

    def test_moderate_pm25_triggers_high_priority(self):
        tel = _make_telemetry(pm25=200.0, blh=380.0, is_trapped=True)
        hh = _make_household()
        recs = generate_xai_recommendations(tel, hh)
        inv_rec = next(r for r in recs if r.id == "rec_inversion_window")
        assert inv_rec.priority == RecommendationPriority.HIGH

    @pytest.mark.parametrize("elevation", list(FloorElevation))
    def test_all_elevations_generate_inversion_rec(self, elevation):
        hh = _make_household(elevation=elevation)
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        ids = [r.id for r in recs]
        assert "rec_inversion_window" in ids

    def test_high_rise_instruction_mentions_plume(self):
        hh = _make_household(elevation=FloorElevation.HIGH_8_PLUS)
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        inv = next(r for r in recs if r.id == "rec_inversion_window")
        assert "8th+" in inv.personalized_instruction or "plume" in inv.personalized_instruction.lower()

    def test_ground_instruction_mentions_no2_or_road(self):
        hh = _make_household(elevation=FloorElevation.GROUND_1_2)
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        inv = next(r for r in recs if r.id == "rec_inversion_window")
        instruction_lower = inv.personalized_instruction.lower()
        assert "no2" in instruction_lower or "tailpipe" in instruction_lower or "ground" in instruction_lower

    def test_hepa_filtration_direction_is_mitigating(self):
        hh = _make_household(air_filtration=AirFiltration.HEPA)
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        inv = next(r for r in recs if r.id == "rec_inversion_window")
        filtration_attr = next(
            a for a in inv.shap_attributions if "filtration" in a.feature_name.lower()
        )
        assert filtration_attr.direction == "mitigating"

    def test_no_filtration_direction_is_amplifying(self):
        hh = _make_household(air_filtration=AirFiltration.NONE)
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        inv = next(r for r in recs if r.id == "rec_inversion_window")
        filtration_attr = next(
            a for a in inv.shap_attributions if "filtration" in a.feature_name.lower()
        )
        assert filtration_attr.direction == "amplifying"


# ===========================================================================
# Tadka recommendation
# ===========================================================================

class TestTadkaRecommendation:
    def test_tadka_trigger_generates_rec(self):
        hh = _make_household(triggers=[HouseholdTrigger.TADKA])
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        ids = [r.id for r in recs]
        assert "rec_tadka_mitigation" in ids

    def test_no_tadka_trigger_no_tadka_rec(self):
        hh = _make_household(triggers=[])
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        ids = [r.id for r in recs]
        assert "rec_tadka_mitigation" not in ids

    def test_poor_exhaust_gives_critical_priority(self):
        hh = _make_household(triggers=[HouseholdTrigger.TADKA], kitchen_exhaust=KitchenExhaust.OPEN_WINDOW_NONE)
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        tadka_rec = next(r for r in recs if r.id == "rec_tadka_mitigation")
        assert tadka_rec.priority == RecommendationPriority.CRITICAL

    def test_ducted_chimney_gives_high_priority(self):
        hh = _make_household(triggers=[HouseholdTrigger.TADKA], kitchen_exhaust=KitchenExhaust.DUCTED_CHIMNEY)
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        tadka_rec = next(r for r in recs if r.id == "rec_tadka_mitigation")
        assert tadka_rec.priority == RecommendationPriority.HIGH

    @pytest.mark.parametrize("exhaust", list(KitchenExhaust))
    def test_all_exhaust_types_generate_tadka_rec(self, exhaust):
        hh = _make_household(triggers=[HouseholdTrigger.TADKA], kitchen_exhaust=exhaust)
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        ids = [r.id for r in recs]
        assert "rec_tadka_mitigation" in ids


# ===========================================================================
# Dry jhadu recommendation
# ===========================================================================

class TestDryJhaduRecommendation:
    def test_jhadu_trigger_generates_rec(self):
        hh = _make_household(triggers=[HouseholdTrigger.DRY_JHADU])
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        ids = [r.id for r in recs]
        assert "rec_wet_mopping" in ids

    def test_no_jhadu_no_rec(self):
        hh = _make_household(triggers=[])
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        ids = [r.id for r in recs]
        assert "rec_wet_mopping" not in ids

    def test_ground_floor_jhadu_instruction_mentions_ground(self):
        hh = _make_household(triggers=[HouseholdTrigger.DRY_JHADU], elevation=FloorElevation.GROUND_1_2)
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        jhadu = next(r for r in recs if r.id == "rec_wet_mopping")
        assert "ground" in jhadu.personalized_instruction.lower() or "Ground" in jhadu.personalized_instruction


# ===========================================================================
# Agarbatti / mosquito coil recommendation
# ===========================================================================

class TestIncenseAndCoilRecommendation:
    def test_agarbatti_generates_rec(self):
        hh = _make_household(triggers=[HouseholdTrigger.AGARBATTI])
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        ids = [r.id for r in recs]
        assert "rec_incense_coils" in ids

    def test_mosquito_coil_generates_rec(self):
        hh = _make_household(triggers=[HouseholdTrigger.MOSQUITO_COILS])
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        ids = [r.id for r in recs]
        assert "rec_incense_coils" in ids

    def test_coil_title_mentions_mosquito(self):
        hh = _make_household(triggers=[HouseholdTrigger.MOSQUITO_COILS])
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        coil_rec = next(r for r in recs if r.id == "rec_incense_coils")
        assert "Mosquito" in coil_rec.title or "mosquito" in coil_rec.title.lower()

    def test_agarbatti_title_mentions_agarbatti(self):
        hh = _make_household(triggers=[HouseholdTrigger.AGARBATTI])
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        coil_rec = next(r for r in recs if r.id == "rec_incense_coils")
        assert "Agarbatti" in coil_rec.title or "Dhoop" in coil_rec.title

    def test_incense_priority_is_critical(self):
        hh = _make_household(triggers=[HouseholdTrigger.AGARBATTI])
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        coil_rec = next(r for r in recs if r.id == "rec_incense_coils")
        assert coil_rec.priority == RecommendationPriority.CRITICAL


# ===========================================================================
# Family member recommendations
# ===========================================================================

class TestTwoWheelerCommuterRec:
    def test_two_wheeler_generates_commute_rec(self):
        member = _make_member(id="biker", commute_mode=CommuteMode.TWO_WHEELER_AUTO)
        hh = _make_household(members=[member])
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        ids = [r.id for r in recs]
        assert "rec_commute_biker" in ids

    def test_metro_commuter_no_commute_rec(self):
        member = _make_member(id="metro", commute_mode=CommuteMode.METRO_TRAIN)
        hh = _make_household(members=[member])
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        ids = [r.id for r in recs]
        assert "rec_commute_metro" not in ids

    def test_two_wheeler_priority_is_critical(self):
        member = _make_member(id="biker", commute_mode=CommuteMode.TWO_WHEELER_AUTO)
        hh = _make_household(members=[member])
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        biker_rec = next(r for r in recs if r.id == "rec_commute_biker")
        assert biker_rec.priority == RecommendationPriority.CRITICAL

    def test_commute_rec_target_id_is_member_id(self):
        member = _make_member(id="biker42", commute_mode=CommuteMode.TWO_WHEELER_AUTO)
        hh = _make_household(members=[member])
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        biker_rec = next(r for r in recs if r.id == "rec_commute_biker42")
        assert biker_rec.target_id == "biker42"


class TestStudentRecommendation:
    def test_morning_student_generates_student_rec(self):
        student = _make_member(
            id="st1",
            occupation=OccupationType.STUDENT,
            peak_window=PeakOutdoorWindow.MORNING_7_10,
        )
        hh = _make_household(members=[student])
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        ids = [r.id for r in recs]
        assert "rec_student_st1" in ids

    def test_midday_student_no_student_rec(self):
        student = _make_member(
            id="st2",
            occupation=OccupationType.STUDENT,
            peak_window=PeakOutdoorWindow.MIDDAY_12_4,
        )
        hh = _make_household(members=[student])
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        ids = [r.id for r in recs]
        assert "rec_student_st2" not in ids

    def test_student_category_is_vulnerable_care(self):
        student = _make_member(id="st3", occupation=OccupationType.STUDENT)
        hh = _make_household(members=[student])
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        student_rec = next((r for r in recs if r.id == "rec_student_st3"), None)
        if student_rec:
            assert student_rec.category.value == "vulnerable_care"


class TestAsthmaticRecommendation:
    def test_asthmatic_generates_asthma_rec(self):
        member = _make_member(id="asth1", sensitivity=HealthSensitivity.ASTHMA_BRONCHITIS)
        hh = _make_household(members=[member])
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        ids = [r.id for r in recs]
        assert "rec_asthma_asth1" in ids

    def test_healthy_member_no_asthma_rec(self):
        member = _make_member(id="hlth1", sensitivity=HealthSensitivity.NONE)
        hh = _make_household(members=[member])
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        ids = [r.id for r in recs]
        assert "rec_asthma_hlth1" not in ids

    def test_asthma_priority_is_critical(self):
        member = _make_member(id="asth2", sensitivity=HealthSensitivity.ASTHMA_BRONCHITIS)
        hh = _make_household(members=[member])
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        asthma_rec = next(r for r in recs if r.id == "rec_asthma_asth2")
        assert asthma_rec.priority == RecommendationPriority.CRITICAL

    def test_asthma_category_is_vulnerable_care(self):
        member = _make_member(id="asth3", sensitivity=HealthSensitivity.ASTHMA_BRONCHITIS)
        hh = _make_household(members=[member])
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        asthma_rec = next(r for r in recs if r.id == "rec_asthma_asth3")
        assert asthma_rec.category.value == "vulnerable_care"


class TestSeniorRecommendation:
    def test_senior_generates_senior_rec(self):
        senior = _make_member(id="sr1", age_group=AgeGroup.SENIOR)
        hh = _make_household(members=[senior])
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        ids = [r.id for r in recs]
        assert "rec_senior_sr1" in ids

    def test_asthmatic_senior_no_duplicate_senior_rec(self):
        """Asthmatic senior should get asthma rec, not both asthma AND senior."""
        senior_asthmatic = _make_member(
            id="sa1",
            age_group=AgeGroup.SENIOR,
            sensitivity=HealthSensitivity.ASTHMA_BRONCHITIS,
        )
        hh = _make_household(members=[senior_asthmatic])
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        ids = [r.id for r in recs]
        # Should get asthma rec
        assert "rec_asthma_sa1" in ids
        # Should NOT get duplicate senior rec (is_asthmatic guard)
        assert "rec_senior_sa1" not in ids

    def test_senior_category_is_routine_timing(self):
        senior = _make_member(id="sr2", age_group=AgeGroup.SENIOR)
        hh = _make_household(members=[senior])
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        sr_rec = next(r for r in recs if r.id == "rec_senior_sr2")
        assert sr_rec.category.value == "routine_timing"


class TestClosedCarRecommendation:
    def test_car_commuter_generates_car_rec(self):
        member = _make_member(id="driver1", commute_mode=CommuteMode.CLOSED_CAR)
        hh = _make_household(members=[member])
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        ids = [r.id for r in recs]
        assert "rec_car_driver1" in ids

    def test_car_rec_priority_is_preventive(self):
        member = _make_member(id="driver2", commute_mode=CommuteMode.CLOSED_CAR)
        hh = _make_household(members=[member])
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        car_rec = next(r for r in recs if r.id == "rec_car_driver2")
        assert car_rec.priority == RecommendationPriority.PREVENTIVE

    def test_car_rec_co2_saved_field_present(self):
        member = _make_member(id="driver3", commute_mode=CommuteMode.CLOSED_CAR)
        hh = _make_household(members=[member])
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        car_rec = next(r for r in recs if r.id == "rec_car_driver3")
        assert car_rec.counterfactual.co2_saved_kg is not None


# ===========================================================================
# SHAP weight integrity
# ===========================================================================

class TestSHAPIntegrity:
    def test_shap_weights_sum_near_100_for_all_recs(self):
        hh = _make_household(
            triggers=list(HouseholdTrigger),
            members=[
                _make_member(id="m1", commute_mode=CommuteMode.TWO_WHEELER_AUTO),
                _make_member(id="m2", sensitivity=HealthSensitivity.ASTHMA_BRONCHITIS),
                _make_member(id="m3", age_group=AgeGroup.SENIOR),
                _make_member(id="m4", commute_mode=CommuteMode.CLOSED_CAR),
            ],
        )
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        for rec in recs:
            total = sum(a.weight_percent for a in rec.shap_attributions)
            assert 85 <= total <= 115, (
                f"SHAP weights sum {total:.1f}% outside ±15% for rec {rec.id}"
            )

    def test_shap_attributions_non_empty(self):
        hh = _make_household(triggers=[HouseholdTrigger.TADKA])
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        for rec in recs:
            assert len(rec.shap_attributions) > 0, f"Empty SHAP for {rec.id}"

    def test_shap_directions_valid(self):
        hh = _make_household(triggers=list(HouseholdTrigger))
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        valid_directions = {"amplifying", "mitigating"}
        for rec in recs:
            for attr in rec.shap_attributions:
                assert attr.direction in valid_directions

    def test_shap_weight_percent_in_valid_range(self):
        hh = _make_household(triggers=list(HouseholdTrigger))
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        for rec in recs:
            for attr in rec.shap_attributions:
                assert 0 <= attr.weight_percent <= 100


# ===========================================================================
# Counterfactual dose ordering
# ===========================================================================

class TestCounterfactualOrdering:
    def test_action_dose_lte_baseline_dose(self):
        hh = _make_household(
            triggers=list(HouseholdTrigger),
            members=[_make_member(id="m1", commute_mode=CommuteMode.TWO_WHEELER_AUTO)],
        )
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        for rec in recs:
            cf = rec.counterfactual
            assert cf.action_inhaled_dose_ugd <= cf.baseline_inhaled_dose_ugd, (
                f"Action dose {cf.action_inhaled_dose_ugd} > baseline {cf.baseline_inhaled_dose_ugd} for {rec.id}"
            )

    def test_dose_avoided_is_positive(self):
        hh = _make_household(triggers=[HouseholdTrigger.TADKA])
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        for rec in recs:
            assert rec.counterfactual.dose_avoided_ugd >= 0

    def test_exposure_reduction_percent_in_range(self):
        hh = _make_household(triggers=[HouseholdTrigger.TADKA])
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        for rec in recs:
            assert 0 <= rec.counterfactual.exposure_reduction_percent <= 100

    def test_cigarettes_avoided_non_negative(self):
        hh = _make_household(triggers=[HouseholdTrigger.AGARBATTI])
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        for rec in recs:
            assert rec.counterfactual.cigarettes_avoided >= 0


# ===========================================================================
# Scientific grounding fields
# ===========================================================================

class TestScientificGrounding:
    def test_cpcb_citation_non_empty(self):
        hh = _make_household(triggers=[HouseholdTrigger.TADKA])
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        for rec in recs:
            assert len(rec.scientific_grounding.cpcb_standard_citation) > 10

    def test_who_citation_non_empty(self):
        hh = _make_household(triggers=[HouseholdTrigger.TADKA])
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        for rec in recs:
            assert len(rec.scientific_grounding.who_standard_citation) > 10

    def test_mechanism_non_empty(self):
        hh = _make_household(triggers=[HouseholdTrigger.AGARBATTI])
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        for rec in recs:
            assert len(rec.scientific_grounding.mechanism) > 10

    def test_physiological_detail_non_empty(self):
        hh = _make_household(triggers=[HouseholdTrigger.DRY_JHADU])
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        for rec in recs:
            assert len(rec.scientific_grounding.physiological_detail) > 10


# ===========================================================================
# Multi-member accumulation and recommendation IDs uniqueness
# ===========================================================================

class TestMultiMemberHousehold:
    def test_multi_member_gives_more_recs_than_single(self):
        single_hh = _make_household(members=[_make_member(id="solo")])
        multi_hh = _make_household(members=[
            _make_member(id="m1", commute_mode=CommuteMode.TWO_WHEELER_AUTO),
            _make_member(id="m2", sensitivity=HealthSensitivity.ASTHMA_BRONCHITIS),
            _make_member(id="m3", age_group=AgeGroup.SENIOR),
        ])
        single_recs = generate_xai_recommendations(SEVERE_TELEMETRY, single_hh)
        multi_recs = generate_xai_recommendations(SEVERE_TELEMETRY, multi_hh)
        assert len(multi_recs) > len(single_recs)

    def test_all_recommendation_ids_unique(self):
        hh = _make_household(
            triggers=list(HouseholdTrigger),
            members=[
                _make_member(id="m1", commute_mode=CommuteMode.TWO_WHEELER_AUTO),
                _make_member(id="m2", sensitivity=HealthSensitivity.ASTHMA_BRONCHITIS),
                _make_member(id="m3", age_group=AgeGroup.SENIOR),
                _make_member(id="m4", commute_mode=CommuteMode.CLOSED_CAR),
            ],
        )
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        ids = [r.id for r in recs]
        assert len(ids) == len(set(ids)), f"Duplicate IDs found: {ids}"

    def test_confidence_scores_between_0_and_1(self):
        hh = _make_household(triggers=list(HouseholdTrigger))
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        for rec in recs:
            assert 0.0 <= rec.confidence_score <= 1.0

    def test_all_members_get_personalized_instructions(self):
        member_names = ["Priya", "Ramesh", "Dadi"]
        members = [
            _make_member(id=f"m{i}", name=name, commute_mode=CommuteMode.TWO_WHEELER_AUTO)
            for i, name in enumerate(member_names)
        ]
        hh = _make_household(members=members)
        recs = generate_xai_recommendations(SEVERE_TELEMETRY, hh)
        # Each biker member should have their name in a recommendation
        for name in member_names:
            matching = [r for r in recs if name in r.personalized_instruction]
            assert len(matching) > 0, f"No personalized rec found for {name}"
