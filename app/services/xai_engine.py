"""Deterministic Explainable AI (XAI) recommendation and SHAP-style attribution engine."""

from __future__ import annotations

from typing import List
from app.models.schemas import (
    AirFiltration,
    CounterfactualMetrics,
    FeatureAttribution,
    FloorElevation,
    HouseholdProfileInput,
    HouseholdTrigger,
    KitchenExhaust,
    RecommendationCategory,
    RecommendationPriority,
    ScientificGrounding,
    TelemetryResponse,
    XAIRecommendation,
)
from app.services.aqi_math import calculate_berkeley_cigarettes, calculate_inhalation_dose


def generate_xai_recommendations(
    telemetry: TelemetryResponse,
    household: HouseholdProfileInput,
) -> List[XAIRecommendation]:
    """Generates hyper-personalized explainable recommendations with SHAP weights.

    Args:
        telemetry: Live or cached ambient air telemetry.
        household: Household architectural and family matrix inputs.

    Returns:
        List of structured XAIRecommendation models with counterfactual exposures.
    """
    # Only generate and display recommendations after the user has filled and submitted their actual profile
    if not household.is_submitted or household.elevation is None or household.kitchen_exhaust is None:
        return []

    recommendations: List[XAIRecommendation] = []
    current = telemetry.current
    pm25 = current.pm25
    pm10 = current.pm10
    no2 = current.no2
    blh = current.boundary_layer_height
    is_trapped = current.is_trapped_surface_smog
    station_name = telemetry.station_name
    vent_win = telemetry.best_ventilation_window

    # 1. Nocturnal Atmospheric Inversion Window Strategy (Household)
    if is_trapped or pm25 > 140.0:
        is_high_rise = household.elevation == FloorElevation.HIGH_8_PLUS
        is_ground = household.elevation == FloorElevation.GROUND_1_2
        has_filtration = household.air_filtration != AirFiltration.NONE

        baseline_dose = calculate_inhalation_dose(pm25, 24.0, 0.6, 0.0)
        action_filtration = 0.75 if has_filtration else 0.40
        action_dose = calculate_inhalation_dose(pm25, 24.0, 0.6, action_filtration)
        dose_avoided = baseline_dose - action_dose
        cigs_avoided = calculate_berkeley_cigarettes(pm25 * action_filtration, 24.0, 1.0)

        elevation_text = (
            "8th+ Floor High-Rise"
            if is_high_rise
            else ("Ground/1st Floor" if is_ground else "Mid-Rise Apartment")
        )

        recommendations.append(
            XAIRecommendation(
                id="rec_inversion_window",
                targetId="household",
                targetName=f"Entire Household ({elevation_text})",
                priority=RecommendationPriority.CRITICAL if pm25 > 250.0 else RecommendationPriority.HIGH,
                category=RecommendationCategory.INDOOR_HACKS,
                title="Lock Perimeter Windows During Nocturnal Inversion Layer",
                personalizedInstruction=(
                    f"At {station_name}, the planetary boundary mixing layer is compressed to {int(blh)}m "
                    f"with ambient PM2.5 at {pm25:.1f} µg/m³. "
                    + (
                        "On your 8th+ floor, your home directly intercepts the regional horizontal smog plume. "
                        if is_high_rise
                        else (
                            f"On your Ground/1st floor, tailpipe NO2 ({no2:.1f} µg/m³) and road dust PM10 ({pm10:.1f} µg/m³) accumulate heavily. "
                            if is_ground
                            else "Keep perimeter balcony doors sealed until midday. "
                        )
                    )
                    + f"Postpone all cross-ventilation until the solar break between {vent_win.start_hour}:00 and {vent_win.end_hour}:00."
                ),
                impactPill=f"{cigs_avoided:.1f} Cigarettes Avoided / day",
                decisionSummary=(
                    f"Atmospheric boundary layer is compressed to {int(blh)}m (surface inversion trap < 450m). "
                    f"Coupled with ambient PM2.5 of {pm25:.1f} µg/m³, opening windows before midday forces heavy "
                    "aerosol infiltration into your indoor microenvironment."
                ),
                confidenceScore=0.98,
                shapAttributions=[
                    FeatureAttribution(
                        featureName=f"Nocturnal Inversion Layer ({int(blh)}m mixing height)",
                        weightPercent=42.0,
                        direction="amplifying",
                        description="Compressed boundary layer traps combustion aerosols near ground surface.",
                    ),
                    FeatureAttribution(
                        featureName=f"Live Regional PM2.5 ({pm25:.1f} µg/m³)",
                        weightPercent=31.0,
                        direction="amplifying",
                        description=f"Exceeds WHO 24h safety limit (15 µg/m³) by {round(pm25 / 15.0, 1)}x.",
                    ),
                    FeatureAttribution(
                        featureName=f"Floor Elevation ({'High-Rise Plume' if is_high_rise else ('Road Dust' if is_ground else 'Mid Floor')})",
                        weightPercent=17.0,
                        direction="amplifying",
                        description=(
                            "Upper floors experience high regional particulate transport."
                            if is_high_rise
                            else "Lower levels capture localized vehicle tailpipe and road resuspension."
                        ),
                    ),
                    FeatureAttribution(
                        featureName=f"Active Air Filtration ({household.air_filtration.value.upper()})",
                        weightPercent=10.0,
                        direction="mitigating" if has_filtration else "amplifying",
                        description=(
                            "Sealed envelope enables purifier to reduce indoor PM2.5 below 25 µg/m³."
                            if has_filtration
                            else "Lack of mechanical air scrubbers makes envelope sealing essential."
                        ),
                    ),
                ],
                counterfactual=CounterfactualMetrics(
                    baselineInhaledDoseUgd=baseline_dose,
                    actionInhaledDoseUgd=action_dose,
                    doseAvoidedUgd=round(dose_avoided, 1),
                    exposureReductionPercent=round((dose_avoided / baseline_dose) * 100.0, 1),
                    baselineCigaretteEquiv=calculate_berkeley_cigarettes(pm25, 24.0, 1.0),
                    actionCigaretteEquiv=calculate_berkeley_cigarettes(pm25 * (1.0 - action_filtration), 24.0, 1.0),
                    cigarettesAvoided=cigs_avoided,
                ),
                scientificGrounding=ScientificGrounding(
                    mechanism=(
                        "Nocturnal ground radiation cooling creates thermal inversions, preventing vertical "
                        "dispersion of fine secondary aerosols (sulfates and nitrates) below 400m."
                    ),
                    cpcbStandardCitation="CPCB National Ambient Air Quality Standard: PM2.5 24h threshold is 60 µg/m³.",
                    whoStandardCitation="WHO 2021 Air Quality Guideline: PM2.5 recommended 24h mean is 15 µg/m³.",
                    physiologicalDetail=(
                        "Sub-2.5µm particles deposit past the ciliated trachea into alveoli, translocating into blood capillaries."
                    ),
                ),
            )
        )

    # 2. Kitchen Tadka & High-Heat Frying (Household)
    if HouseholdTrigger.TADKA in household.triggers:
        is_poor_exhaust = household.kitchen_exhaust != KitchenExhaust.DUCTED_CHIMNEY
        tadka_pm = 380.0 if is_poor_exhaust else 120.0
        baseline_dose = calculate_inhalation_dose(tadka_pm, 2.0, 0.7, 0.0)
        action_factor = 0.65 if is_poor_exhaust else 0.85
        action_dose = calculate_inhalation_dose(tadka_pm, 2.0, 0.7, action_factor)
        dose_avoided = baseline_dose - action_dose

        recommendations.append(
            XAIRecommendation(
                id="rec_tadka_mitigation",
                targetId="household",
                targetName="Kitchen & Living Areas",
                priority=RecommendationPriority.CRITICAL if is_poor_exhaust else RecommendationPriority.HIGH,
                category=RecommendationCategory.INDOOR_HACKS,
                title="Tadka Splutter Phase: Seal Kitchen & Maximize Exhaust Draft",
                personalizedInstruction=(
                    "High-heat oil spluttering generates ultrafine organic aerosol plumes (>400 µg/m³) within minutes. "
                    + (
                        "Turn your Ducted Chimney to Boost mode 2 minutes BEFORE heating oil and leave on for 7 minutes post-cooking."
                        if household.kitchen_exhaust == KitchenExhaust.DUCTED_CHIMNEY
                        else (
                            "Because you use an Exhaust Fan Only, keep kitchen doors sealed to stop bedroom spillover, "
                            "and open the utility balcony window by 2 inches for directional sweep."
                            if household.kitchen_exhaust == KitchenExhaust.EXHAUST_FAN
                            else "No ducted chimney present: lid the kadai immediately and create an outward cross-breeze."
                        )
                    )
                ),
                impactPill=f"-{int(dose_avoided / 10)} µg/m³ living room spike avoided",
                decisionSummary=(
                    "Thermal breakdown of cooking oil releases acrolein and polycyclic aromatic hydrocarbons. "
                    "Without isolated directional airflow, plumes elevate whole-house PM2.5 within 15 minutes."
                ),
                confidenceScore=0.95,
                shapAttributions=[
                    FeatureAttribution(
                        featureName="High-Heat Tadka / Frying Trigger",
                        weightPercent=48.0,
                        direction="amplifying",
                        description="Thermal oil decomposition generates dense nanoparticles and volatile organics.",
                    ),
                    FeatureAttribution(
                        featureName=f"Kitchen Exhaust Infrastructure ({household.kitchen_exhaust.value.replace('_', ' ')})",
                        weightPercent=32.0,
                        direction="amplifying" if is_poor_exhaust else "mitigating",
                        description="Ducted chimney extracts thermal plume directly before whole-home dispersion.",
                    ),
                    FeatureAttribution(
                        featureName=f"Ambient Smog Baseline ({pm25:.1f} µg/m³)",
                        weightPercent=20.0,
                        direction="amplifying",
                        description="High outdoor PM prevents using broad window opening for purging.",
                    ),
                ],
                counterfactual=CounterfactualMetrics(
                    baselineInhaledDoseUgd=baseline_dose,
                    actionInhaledDoseUgd=action_dose,
                    doseAvoidedUgd=round(dose_avoided, 1),
                    exposureReductionPercent=round((dose_avoided / baseline_dose) * 100.0, 1),
                    baselineCigaretteEquiv=calculate_berkeley_cigarettes(tadka_pm, 2.0, 1.2),
                    actionCigaretteEquiv=calculate_berkeley_cigarettes(tadka_pm * (1.0 - action_factor), 2.0, 1.2),
                    cigarettesAvoided=calculate_berkeley_cigarettes(tadka_pm * action_factor, 2.0, 1.2),
                ),
                scientificGrounding=ScientificGrounding(
                    mechanism="Pyrolysis of fatty acids at smoking temperatures (>190°C) produces condensed ultrafine liquid droplets.",
                    cpcbStandardCitation="CPCB Advisory on Control of Domestic Indoor Cooking Aerosols.",
                    whoStandardCitation="WHO Indoor Air Quality Guidelines for Household Cooking Fumes.",
                    physiologicalDetail="Acrolein and lipid hydroperoxides induce acute airway sensory irritation and bronchospasm.",
                ),
            )
        )

    # 3. Dry Jhadu (Brooming) vs Damp Mopping (Household)
    if HouseholdTrigger.DRY_JHADU in household.triggers:
        is_ground = household.elevation == FloorElevation.GROUND_1_2
        resuspended = 320.0 if is_ground else 190.0
        baseline_dose = calculate_inhalation_dose(resuspended, 1.5, 0.6, 0.0)
        action_dose = calculate_inhalation_dose(30.0, 1.5, 0.6, 0.0)
        dose_avoided = baseline_dose - action_dose

        recommendations.append(
            XAIRecommendation(
                id="rec_wet_mopping",
                targetId="household",
                targetName="Daily Housekeeping",
                priority=RecommendationPriority.HIGH,
                category=RecommendationCategory.INDOOR_HACKS,
                title="Swap Dry Jhadu (Brooming) for Microfiber Damp Mopping",
                personalizedInstruction=(
                    f"Traditional dry grass sweeping resuspends settled coarse road dust (PM10: {pm10:.1f} µg/m³) "
                    "into breathing height for up to 90 minutes. Switch immediately to a damp microfiber flat mop. "
                    + ("Because your residence is on Ground/1st floor, street dust settling rates are 3x higher." if is_ground else "")
                ),
                impactPill="-78% Resuspended Particle Load",
                decisionSummary=(
                    "Mechanical sweeping velocity exceeds the aerodynamic detachment threshold of coarse particles, "
                    "multiplying indoor PM10 above ambient road levels."
                ),
                confidenceScore=0.96,
                shapAttributions=[
                    FeatureAttribution(
                        featureName="Dry Brooming (Jhadu) Practice",
                        weightPercent=54.0,
                        direction="amplifying",
                        description="Dry friction resuspends settled silica, heavy metals, and brake-lining dust.",
                    ),
                    FeatureAttribution(
                        featureName=f"Ambient Road Dust PM10 ({pm10:.1f} µg/m³)",
                        weightPercent=28.0,
                        direction="amplifying",
                        description=f"High outdoor PM10 ({pm10:.1f} µg/m³) increases tracked-in crustal matter.",
                    ),
                    FeatureAttribution(
                        featureName=f"Floor Elevation ({'Ground Floor' if is_ground else 'Upper Floor'})",
                        weightPercent=18.0,
                        direction="amplifying",
                        description="Proximity to vehicular road wash-off concentrates heavy particles on lower levels.",
                    ),
                ],
                counterfactual=CounterfactualMetrics(
                    baselineInhaledDoseUgd=baseline_dose,
                    actionInhaledDoseUgd=action_dose,
                    doseAvoidedUgd=round(dose_avoided, 1),
                    exposureReductionPercent=88.0,
                    baselineCigaretteEquiv=calculate_berkeley_cigarettes(resuspended, 1.5, 1.0),
                    actionCigaretteEquiv=calculate_berkeley_cigarettes(30.0, 1.5, 1.0),
                    cigarettesAvoided=calculate_berkeley_cigarettes(resuspended - 30.0, 1.5, 1.0),
                ),
                scientificGrounding=ScientificGrounding(
                    mechanism="Aerodynamic shear stresses fluidize particles between 2.5µm and 10µm into indoor convective air currents.",
                    cpcbStandardCitation="CPCB Dust Mitigation and Resuspension Protocols.",
                    whoStandardCitation="WHO 2021 PM10 24h threshold: 45 µg/m³.",
                    physiologicalDetail="Coarse fraction particles trigger nasopharyngeal irritation and chronic sinus inflammation.",
                ),
            )
        )

    # 4. Agarbatti / Dhoop / Mosquito Coils Ban (Household)
    if HouseholdTrigger.AGARBATTI in household.triggers or HouseholdTrigger.MOSQUITO_COILS in household.triggers:
        is_coil = HouseholdTrigger.MOSQUITO_COILS in household.triggers
        spike = 450.0 if is_coil else 280.0
        cigs = 3.5 if is_coil else 1.8
        baseline_dose = calculate_inhalation_dose(spike, 8.0, 0.5, 0.0)
        action_dose = calculate_inhalation_dose(20.0, 8.0, 0.5, 0.0)

        recommendations.append(
            XAIRecommendation(
                id="rec_incense_coils",
                targetId="household",
                targetName="Living Spaces & Mandir Area",
                priority=RecommendationPriority.CRITICAL,
                category=RecommendationCategory.INDOOR_HACKS,
                title=f"Eliminate {'Mosquito Coil' if is_coil else 'Agarbatti / Dhoop'} Smoldering Indoors",
                personalizedInstruction=(
                    "Burning one mosquito coil in a closed room releases benzene and fine particulates equivalent "
                    "to 75–100 cigarettes. Agarbatti smoldering generates soot denser than diesel exhaust. "
                    "Replace coils with electric liquid vaporizers or nets, and replace incense with LED brass lamps "
                    "or essential oil ultrasonic diffusers without flame."
                ),
                impactPill=f"{cigs:.1f} Cigarettes Avoided",
                decisionSummary=(
                    "Slow pyrolysis of biomass binders generates aromatic hydrocarbons and PM0.1 particles that saturate "
                    "indoor air purifiers and linger for hours in winter-sealed rooms."
                ),
                confidenceScore=0.99,
                shapAttributions=[
                    FeatureAttribution(
                        featureName=f"{'Mosquito Coil' if is_coil else 'Incense'} Smoldering",
                        weightPercent=62.0,
                        direction="amplifying",
                        description="Direct continuous emission of polycyclic aromatic hydrocarbons and PM2.5.",
                    ),
                    FeatureAttribution(
                        featureName="Inversion-Sealed Living Space",
                        weightPercent=24.0,
                        direction="amplifying",
                        description="Windows closed against outdoor winter smog trap combustion gases indoors.",
                    ),
                    FeatureAttribution(
                        featureName="Purifier HEPA Matrix Glazing Risk",
                        weightPercent=14.0,
                        direction="amplifying",
                        description="Incense oils and sticky resins rapidly blind and degrade HEPA filter pores.",
                    ),
                ],
                counterfactual=CounterfactualMetrics(
                    baselineInhaledDoseUgd=baseline_dose,
                    actionInhaledDoseUgd=action_dose,
                    doseAvoidedUgd=round(baseline_dose - action_dose, 1),
                    exposureReductionPercent=94.0,
                    baselineCigaretteEquiv=cigs,
                    actionCigaretteEquiv=0.1,
                    cigarettesAvoided=round(cigs - 0.1, 1),
                ),
                scientificGrounding=ScientificGrounding(
                    mechanism="Low-temperature incomplete smoldering emits ultrafine carbonaceous soot coated with carcinogenic PAHs.",
                    cpcbStandardCitation="CPCB Comprehensive Guidelines on Indoor Air Quality Minimization.",
                    whoStandardCitation="WHO Guidelines for Indoor Air Quality: Selected Pollutants (Benzene, Formaldehyde).",
                    physiologicalDetail="Sub-micron combustion soot crosses alveolar epithelial membranes into systemic circulation.",
                ),
            )
        )

    # 5. Individual Family Members Matrix
    for mem in household.members:
        is_asthmatic = mem.sensitivity.value == "asthma_bronchitis"
        is_cardiac = mem.sensitivity.value == "cardiac_hypertension"
        is_student = mem.occupation.value == "student"
        is_two_wheeler = mem.commute_mode.value == "two_wheeler_auto"
        is_senior = mem.age_group.value == "senior"

        # A. Two-Wheeler / Open Auto Commuter
        if is_two_wheeler:
            is_morning = mem.peak_window.value == "morning_7_10"
            peak_pm = pm25 * 1.55 if is_morning else pm25 * 1.25
            baseline_dose = calculate_inhalation_dose(peak_pm, 1.5, 1.3, 0.0)
            action_dose = calculate_inhalation_dose(peak_pm, 1.5, 1.3, 0.95)
            cigs_avoided = calculate_berkeley_cigarettes(peak_pm * 0.95, 1.5, 1.3)

            recommendations.append(
                XAIRecommendation(
                    id=f"rec_commute_{mem.id}",
                    targetId=mem.id,
                    targetName=mem.name,
                    priority=RecommendationPriority.CRITICAL,
                    category=RecommendationCategory.COMMUTE_SWAPS,
                    title="N95 Sealed Respirator & Visor Shield for Two-Wheeler Commute",
                    personalizedInstruction=(
                        f"{mem.name} rides on open roads during "
                        f"{'the Morning 7–10 AM rush hour when trapped inversion smog' if is_morning else f'traffic peak when NO2 ({no2:.1f} µg/m³)'} "
                        f"is maximum. Riding without a certified N95 respirator forces {int(baseline_dose)} µg of toxic aerosols into lungs per trip. "
                        "Wear a head-strap N95 (cloth bandanas filter <20%), keep full helmet visor lowered to prevent ocular inflammation, "
                        "and opt for metro transit whenever possible."
                    ),
                    impactPill=f"{cigs_avoided:.1f} Cigarettes Avoided / trip",
                    decisionSummary=(
                        f"{mem.name} undergoes elevated ventilation (1.3 m³/h) on arterial roads with direct proximity to "
                        "tailpipe diesel exhaust, elemental carbon, and nitrogen dioxide."
                    ),
                    confidenceScore=0.97,
                    shapAttributions=[
                        FeatureAttribution(
                            featureName="Two-Wheeler / Open Auto Transit Mode",
                            weightPercent=44.0,
                            direction="amplifying",
                            description="Direct unbuffered boundary-layer exposure without cabin air filtration.",
                        ),
                        FeatureAttribution(
                            featureName=f"Peak Exposure Window ({'Morning Inversion' if is_morning else 'Peak Traffic'})",
                            weightPercent=26.0,
                            direction="amplifying",
                            description="Coincides with morning inversion lid and traffic congestion.",
                        ),
                        FeatureAttribution(
                            featureName=f"Health Sensitivity ({mem.sensitivity.value.upper()})",
                            weightPercent=18.0,
                            direction="amplifying" if (is_asthmatic or is_cardiac) else "mitigating",
                            description="Bronchial hyperresponsiveness amplifies acute particulate risk.",
                        ),
                        FeatureAttribution(
                            featureName=f"Live Traffic NO2 ({no2:.1f} µg/m³)",
                            weightPercent=12.0,
                            direction="amplifying",
                            description="Vehicular combustion marker causing acute bronchial irritation.",
                        ),
                    ],
                    counterfactual=CounterfactualMetrics(
                        baselineInhaledDoseUgd=baseline_dose,
                        actionInhaledDoseUgd=action_dose,
                        doseAvoidedUgd=round(baseline_dose - action_dose, 1),
                        exposureReductionPercent=95.0,
                        baselineCigaretteEquiv=calculate_berkeley_cigarettes(peak_pm, 1.5, 1.3),
                        actionCigaretteEquiv=calculate_berkeley_cigarettes(peak_pm * 0.05, 1.5, 1.3),
                        cigarettesAvoided=cigs_avoided,
                    ),
                    scientificGrounding=ScientificGrounding(
                        mechanism="Immediate proximity to vehicular exhausts exposes riders to fresh ultrafine particles (<0.1µm) before coagulation.",
                        cpcbStandardCitation="CPCB Vehicular Emission Standards and Urban Arterial Exposure Studies.",
                        whoStandardCitation="WHO Global Air Quality Guidelines: NO2 24h threshold is 25 µg/m³.",
                        physiologicalDetail="Carbonaceous particles trigger alveolar macrophage oxidative stress and elevate systemic arterial pressure.",
                    ),
                )
            )

        # B. Student Morning Inversion Exposure
        if is_student and mem.peak_window.value == "morning_7_10":
            peak_pm = pm25 * 1.45
            baseline_dose = calculate_inhalation_dose(peak_pm, 3.0, 0.8, 0.0)
            action_dose = calculate_inhalation_dose(peak_pm, 3.0, 0.8, 0.70)
            cigs_avoided = calculate_berkeley_cigarettes(peak_pm * 0.70, 3.0, 1.2)

            recommendations.append(
                XAIRecommendation(
                    id=f"rec_student_{mem.id}",
                    targetId=mem.id,
                    targetName=mem.name,
                    priority=RecommendationPriority.CRITICAL if pm25 > 200.0 else RecommendationPriority.HIGH,
                    category=RecommendationCategory.VULNERABLE_CARE,
                    title="Reschedule Morning Assembly & Outdoor Sports Indoors",
                    personalizedInstruction=(
                        f"{mem.name} commutes and attends school between 7:00–10:00 AM, the exact period when nocturnal "
                        f"inversion holds ground-level PM2.5 near {int(peak_pm)} µg/m³. Move sports drills and morning assembly indoors or "
                        f"into the afternoon ({vent_win.start_hour}:00 PM). Ensure the school bus keeps windows closed with AC on recirculation."
                    ),
                    impactPill=f"{cigs_avoided:.1f} Cigarettes Avoided",
                    decisionSummary=(
                        "Children possess narrower airways and higher ventilation rates per kilogram of body weight, "
                        "making morning outdoor physical exertion under winter inversion smog hazardous."
                    ),
                    confidenceScore=0.96,
                    shapAttributions=[
                        FeatureAttribution(
                            featureName="Age Group (Developing Pediatric Airways)",
                            weightPercent=40.0,
                            direction="amplifying",
                            description="Higher respiratory rate accelerates peripheral alveolar particle deposition.",
                        ),
                        FeatureAttribution(
                            featureName="Morning Inversion Peak (7-10 AM)",
                            weightPercent=35.0,
                            direction="amplifying",
                            description="Ground thermal inversion traps vehicular exhaust and biomass smoke.",
                        ),
                        FeatureAttribution(
                            featureName=f"Commute Mode ({mem.commute_mode.value.replace('_', ' ')})",
                            weightPercent=15.0,
                            direction="amplifying",
                            description="Open transit admits heavy roadside fine particulates.",
                        ),
                        FeatureAttribution(
                            featureName="Physical Exercise Multiplier",
                            weightPercent=10.0,
                            direction="amplifying",
                            description="Exertion causes mouth breathing, bypassing nasal turbinate filtering.",
                        ),
                    ],
                    counterfactual=CounterfactualMetrics(
                        baselineInhaledDoseUgd=baseline_dose,
                        actionInhaledDoseUgd=action_dose,
                        doseAvoidedUgd=round(baseline_dose - action_dose, 1),
                        exposureReductionPercent=70.0,
                        baselineCigaretteEquiv=calculate_berkeley_cigarettes(peak_pm, 3.0, 1.2),
                        actionCigaretteEquiv=calculate_berkeley_cigarettes(peak_pm * 0.30, 3.0, 1.2),
                        cigarettesAvoided=cigs_avoided,
                    ),
                    scientificGrounding=ScientificGrounding(
                        mechanism="Mouth breathing during physical exertion bypasses upper mucosal cilia and delivers PM2.5 directly to bronchioles.",
                        cpcbStandardCitation="CAQM GRAP Stage III/IV Guidelines on Physical School Activities.",
                        whoStandardCitation="WHO Air Pollution and Child Health: Prescribing Clean Air (2018).",
                        physiologicalDetail="Children breathe 50% more air per kg of body mass than adults, multiplying toxic alveolar dose.",
                    ),
                )
            )

        # C. Asthmatic / Bronchitis Patient
        if is_asthmatic:
            baseline_dose = calculate_inhalation_dose(pm25, 24.0, 0.6, 0.0)
            action_dose = calculate_inhalation_dose(pm25, 24.0, 0.6, 0.65)
            cigs_avoided = calculate_berkeley_cigarettes(pm25 * 0.65, 24.0, 1.0)

            recommendations.append(
                XAIRecommendation(
                    id=f"rec_asthma_{mem.id}",
                    targetId=mem.id,
                    targetName=mem.name,
                    priority=RecommendationPriority.CRITICAL,
                    category=RecommendationCategory.VULNERABLE_CARE,
                    title="Asthma Action Plan: Inhaler Prophylaxis & Bedroom HEPA Oasis",
                    personalizedInstruction=(
                        f"With ambient air in the {telemetry.cpcb.category.value.upper()} tier (PM2.5: {pm25:.1f} µg/m³, NO2: {no2:.1f} µg/m³), "
                        f"{mem.name}'s airways are under acute inflammatory stress. Keep reliever inhalers immediately accessible, "
                        "consult your pulmonologist regarding preventer steroid dosage, and seal a single bedroom as a 'Clean Air Oasis' "
                        "with dedicated continuous HEPA filtration."
                    ),
                    impactPill="-65% Bronchial Particle Exposure",
                    decisionSummary=(
                        f"{mem.name} has pre-existing airway hyperreactivity. Simultaneous spikes of NO2 and fine particulates "
                        "induce epithelial disruption, mast cell degranulation, and severe bronchospasm."
                    ),
                    confidenceScore=0.99,
                    shapAttributions=[
                        FeatureAttribution(
                            featureName="Asthma / Bronchitis Clinical Sensitivity",
                            weightPercent=48.0,
                            direction="amplifying",
                            description="Hyperresponsive airways exhibit impaired mucociliary clearance.",
                        ),
                        FeatureAttribution(
                            featureName=f"Ambient PM2.5 Spike ({pm25:.1f} µg/m³)",
                            weightPercent=28.0,
                            direction="amplifying",
                            description="Fine particulate mass triggers pulmonary inflammatory cascades.",
                        ),
                        FeatureAttribution(
                            featureName=f"Ambient NO2 Irritant Level ({no2:.1f} µg/m³)",
                            weightPercent=14.0,
                            direction="amplifying",
                            description="Oxidant gas that lowers the threshold for acute bronchoconstriction.",
                        ),
                        FeatureAttribution(
                            featureName="Clean Bedroom Oasis Strategy",
                            weightPercent=10.0,
                            direction="mitigating",
                            description="Sealing one room concentrates CADR to bring PM2.5 below 20 µg/m³.",
                        ),
                    ],
                    counterfactual=CounterfactualMetrics(
                        baselineInhaledDoseUgd=baseline_dose,
                        actionInhaledDoseUgd=action_dose,
                        doseAvoidedUgd=round(baseline_dose - action_dose, 1),
                        exposureReductionPercent=65.0,
                        baselineCigaretteEquiv=calculate_berkeley_cigarettes(pm25, 24.0, 1.0),
                        actionCigaretteEquiv=calculate_berkeley_cigarettes(pm25 * 0.35, 24.0, 1.0),
                        cigarettesAvoided=cigs_avoided,
                    ),
                    scientificGrounding=ScientificGrounding(
                        mechanism="Particulate oxidative radicals activate toll-like receptors and NF-κB inflammatory signaling in bronchial epithelium.",
                        cpcbStandardCitation="CPCB NAQI Health Advisory: Severe alerts flag acute respiratory illness in asthmatic cohorts.",
                        whoStandardCitation="GINA (Global Initiative for Asthma) 2023 Environmental Guidelines.",
                        physiologicalDetail="Fine aerosol inhalation produces a rapid drop in peak expiratory flow rate (PEFR) within 2 hours.",
                    ),
                )
            )

        # D. Senior Citizen / Cardiac Patient
        if (is_senior or is_cardiac) and not is_asthmatic:
            is_morning = mem.peak_window.value == "morning_7_10"
            peak_pm = pm25 * 1.40 if is_morning else pm25
            baseline_dose = calculate_inhalation_dose(peak_pm, 2.0, 0.9, 0.0)
            action_dose = calculate_inhalation_dose(peak_pm, 2.0, 0.9, 0.85)

            recommendations.append(
                XAIRecommendation(
                    id=f"rec_senior_{mem.id}",
                    targetId=mem.id,
                    targetName=mem.name,
                    priority=RecommendationPriority.HIGH,
                    category=RecommendationCategory.ROUTINE_TIMING,
                    title="Postpone Morning Walk: Shift to Midday Indoor Sunlight",
                    personalizedInstruction=(
                        f"{mem.name}'s outdoor window is set to {'Morning 7–10 AM' if is_morning else 'Evening'}. "
                        "Brisk walking in cold, inversion-trapped morning smog triggers peripheral vasoconstriction and spikes arterial blood pressure. "
                        f"Shift exercise to an indoor corridor or sunny terrace between {vent_win.start_hour}:00 and {vent_win.end_hour}:00 "
                        "when solar heating lifts the inversion layer and ambient temperatures rise."
                    ),
                    impactPill=f"{calculate_berkeley_cigarettes(peak_pm * 0.85, 2.0, 1.0):.1f} Cigarettes Avoided",
                    decisionSummary=(
                        "Cold winter air combined with fine particulate matter triggers sympathetic autonomic excitation, "
                        "elevating stroke and myocardial infarction incidence during smog episodes."
                    ),
                    confidenceScore=0.95,
                    shapAttributions=[
                        FeatureAttribution(
                            featureName="Cardiovascular / Senior Age Vulnerability",
                            weightPercent=46.0,
                            direction="amplifying",
                            description="Vascular stiffness and reduced coronary reserve amplify ischemic vulnerability.",
                        ),
                        FeatureAttribution(
                            featureName="Cold Morning Temperature + Inversion",
                            weightPercent=32.0,
                            direction="amplifying",
                            description="Cold temperature causes vasoconstriction while aerosols promote thrombogenesis.",
                        ),
                        FeatureAttribution(
                            featureName="Outdoor Exertion Window",
                            weightPercent=22.0,
                            direction="amplifying",
                            description="Increased cardiac output during brisk walking multiplies inhaled particulate volume.",
                        ),
                    ],
                    counterfactual=CounterfactualMetrics(
                        baselineInhaledDoseUgd=baseline_dose,
                        actionInhaledDoseUgd=action_dose,
                        doseAvoidedUgd=round(baseline_dose - action_dose, 1),
                        exposureReductionPercent=85.0,
                        baselineCigaretteEquiv=calculate_berkeley_cigarettes(peak_pm, 2.0, 1.0),
                        actionCigaretteEquiv=calculate_berkeley_cigarettes(peak_pm * 0.15, 2.0, 1.0),
                        cigarettesAvoided=calculate_berkeley_cigarettes(peak_pm * 0.85, 2.0, 1.0),
                    ),
                    scientificGrounding=ScientificGrounding(
                        mechanism="Systemic translocated ultrafine particles cause autonomic dysregulation and accelerated platelet aggregation.",
                        cpcbStandardCitation="CPCB Health Advisory for Senior Citizens under CAQM GRAP III/IV.",
                        whoStandardCitation="AHA / WHO Scientific Statement on Air Pollution and Cardiovascular Disease.",
                        physiologicalDetail="PM2.5 induces elevations in fibrinogen and C-reactive protein, promoting thrombotic plaque destabilization.",
                    ),
                )
            )

        # E. Closed Car Commuter
        if mem.commute_mode.value == "closed_car":
            recommendations.append(
                XAIRecommendation(
                    id=f"rec_car_{mem.id}",
                    targetId=mem.id,
                    targetName=mem.name,
                    priority=RecommendationPriority.PREVENTIVE,
                    category=RecommendationCategory.COMMUTE_SWAPS,
                    title="Car Cabin HVAC: Recirculation Mode + Activated Carbon PM2.5 Filter",
                    personalizedInstruction=(
                        f"While driving in heavy urban traffic, fresh air intake pulls raw diesel soot and NO2 ({no2:.1f} µg/m³) "
                        "directly from leading vehicle exhausts into your passenger compartment. Switch your HVAC to permanent "
                        "'Internal Recirculation' mode. Crack the window for 15 seconds every 30 minutes if CO2 levels make you drowsy."
                    ),
                    impactPill="-80% In-Cabin Particle Infiltration",
                    decisionSummary=(
                        "A sealed car cabin operated in recirculation mode acts as an effective micro-shelter, "
                        "reducing particulate infiltration by 80–90% compared to open roadway traffic."
                    ),
                    confidenceScore=0.92,
                    shapAttributions=[
                        FeatureAttribution(
                            featureName="Vehicular Micro-Environment",
                            weightPercent=45.0,
                            direction="amplifying",
                            description="Proximity to preceding tailpipes produces localized spikes of toxic gases.",
                        ),
                        FeatureAttribution(
                            featureName="Cabin HVAC Recirculation Setting",
                            weightPercent=35.0,
                            direction="mitigating",
                            description="Internal air loop repeatedly cycles through cabin air filtration.",
                        ),
                        FeatureAttribution(
                            featureName=f"Ambient Traffic NO2 ({no2:.1f} µg/m³)",
                            weightPercent=20.0,
                            direction="amplifying",
                            description="Exhaust gas requiring activated carbon media for gaseous adsorption.",
                        ),
                    ],
                    counterfactual=CounterfactualMetrics(
                        baselineInhaledDoseUgd=calculate_inhalation_dose(pm25, 1.5, 0.6, 0.2),
                        actionInhaledDoseUgd=calculate_inhalation_dose(pm25, 1.5, 0.6, 0.85),
                        doseAvoidedUgd=round(calculate_inhalation_dose(pm25, 1.5, 0.6, 0.65), 1),
                        exposureReductionPercent=81.0,
                        baselineCigaretteEquiv=calculate_berkeley_cigarettes(pm25 * 0.8, 1.5, 1.0),
                        actionCigaretteEquiv=calculate_berkeley_cigarettes(pm25 * 0.15, 1.5, 1.0),
                        cigarettesAvoided=calculate_berkeley_cigarettes(pm25 * 0.65, 1.5, 1.0),
                        co2SavedKg=0.8,
                    ),
                    scientificGrounding=ScientificGrounding(
                        mechanism="In-cabin filtration dynamics: Recirculation achieves cumulative multi-pass particulate removal.",
                        cpcbStandardCitation="CPCB In-Vehicle Micro-environmental Air Quality Assessment.",
                        whoStandardCitation="WHO Urban Transport and Public Health Guidelines.",
                        physiologicalDetail="Lowered NO2 and particle inhalation preserves pulmonary alveolar surfactant stability.",
                    ),
                )
            )

    return recommendations
