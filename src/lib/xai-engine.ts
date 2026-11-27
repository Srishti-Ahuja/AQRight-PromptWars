import type {
  HouseholdProfile,
  TelemetryData,
  XAIRecommendation,
} from '../types';
import { calculateBerkeleyCigarettes, calculateInhalationDose } from './aqi-math';

export function generateXAIRecommendations(
  telemetry: TelemetryData,
  household: HouseholdProfile
): XAIRecommendation[] {
  // Recommendations are generated strictly after the user fills and submits their actual profile
  if (!household.isSubmitted || !household.elevation || !household.kitchenExhaust) {
    return [];
  }

  const recommendations: XAIRecommendation[] = [];
  const { current, bestVentilationWindow, stationName } = telemetry;
  const pm25 = current.pm25;
  const pm10 = current.pm10;
  const no2 = current.no2;
  const blh = current.boundaryLayerHeight;
  const isTrapped = current.isTrappedSurfaceSmog;

  // 1. INVERSION-AWARE INDOOR VENTILATION PROTOCOL (HOUSEHOLD)
  if (isTrapped || pm25 > 150) {
    const isHighRise = household.elevation === 'high_8_plus';
    const isGround = household.elevation === 'ground_1_2';
    const hasFiltration = household.airFiltration !== 'none';

    const baselineDose = calculateInhalationDose(pm25, 24, 0.6, 0);
    const actionFiltrationFactor = hasFiltration ? 0.75 : 0.40;
    const actionDose = calculateInhalationDose(pm25, 24, 0.6, actionFiltrationFactor);
    const doseAvoided = baselineDose - actionDose;
    const cigsAvoided = calculateBerkeleyCigarettes(pm25 * actionFiltrationFactor, 24, 1.0);

    recommendations.push({
      id: 'rec_inversion_window',
      targetId: 'household',
      targetName: `Entire Household (${household.elevation === 'high_8_plus' ? '8th+ Floor High-Rise' : household.elevation === 'ground_1_2' ? 'Ground/1st Floor' : 'Mid-Rise Apartment'})`,
      priority: pm25 > 250 ? 'critical' : 'high',
      category: 'indoor_hacks',
      title: 'Lock Perimeter Windows During Nocturnal Inversion Layer',
      personalizedInstruction: `At ${stationName}, the boundary mixing layer is compressed down to ${blh}m with ambient PM2.5 at ${pm25} µg/m³. ${
        isHighRise
          ? 'On your 8th+ floor, your home sits directly in the regional horizontal smoke plume.'
          : isGround
          ? 'On your Ground/1st floor, tailpipe NO2 (' + no2 + ' µg/m³) and road dust PM10 (' + pm10 + ' µg/m³) accumulate heavily.'
          : 'Keep balcony doors sealed until midday.'
      } Postpone all cross-ventilation until the solar break between ${bestVentilationWindow.startHour}:00 - ${bestVentilationWindow.endHour}:00.`,
      impactPill: `${cigsAvoided.toFixed(1)} Cigarettes Avoided / day`,
      decisionSummary: `Atmospheric boundary layer is compressed to ${blh}m (severe surface trap < 450m). Combined with live PM2.5 of ${pm25} µg/m³, opening windows before midday forces dirty ambient air into your sealed living space.`,
      confidenceScore: 0.98,
      shapAttributions: [
        {
          featureName: `Nocturnal Inversion Layer (${blh}m mixing height)`,
          weightPercent: 42,
          direction: 'amplifying',
          description: 'Compressed atmospheric lid prevents vertical dispersion of fine aerosols.',
        },
        {
          featureName: `Live Regional PM2.5 (${pm25} µg/m³)`,
          weightPercent: 31,
          direction: 'amplifying',
          description: `Exceeds WHO 24h guideline (15 µg/m³) by ${(pm25 / 15).toFixed(1)}x.`,
        },
        {
          featureName: `Floor Elevation (${isHighRise ? 'High-Rise Plume' : isGround ? 'Road Surface' : 'Mid Floor'})`,
          weightPercent: 17,
          direction: 'amplifying',
          description: isHighRise
            ? 'High-rise floors intercept regional aerosol transport plumes.'
            : 'Ground level experiences localized vehicular exhaust re-entrainment.',
        },
        {
          featureName: `Active Filtration Setup (${(household.airFiltration || 'none').toUpperCase()})`,
          weightPercent: 10,
          direction: hasFiltration ? 'mitigating' : 'amplifying',
          description: hasFiltration ? 'Sealing envelope allows purifier to scrub indoor air down to <25 µg/m³.' : 'Lack of active filtration makes passive sealing vital.',
        },
      ],
      counterfactual: {
        baselineInhaledDoseUgd: baselineDose,
        actionInhaledDoseUgd: actionDose,
        doseAvoidedUgd: doseAvoided,
        exposureReductionPercent: Math.round((doseAvoided / baselineDose) * 100),
        baselineCigaretteEquiv: calculateBerkeleyCigarettes(pm25, 24, 1.0),
        actionCigaretteEquiv: calculateBerkeleyCigarettes(pm25 * (1 - actionFiltrationFactor), 24, 1.0),
        cigarettesAvoided: cigsAvoided,
      },
      scientificGrounding: {
        mechanism: 'Nocturnal radiative ground cooling creates an inversion boundary trapping secondary inorganic aerosols in the lowest 200–450m of the urban troposphere.',
        cpcbStandardCitation: 'CPCB National Ambient Air Quality Standard: PM2.5 24h threshold is 60 µg/m³; current level triggers emergency mitigation.',
        whoStandardCitation: 'WHO 2021 Air Quality Guideline: PM2.5 recommended annual mean is 5 µg/m³, 24-hour mean is 15 µg/m³.',
        physiologicalDetail: 'Sub-2.5µm particles bypass upper airway mucosal cilia and penetrate terminal alveoli, causing systemic endothelial inflammation.',
      },
    });
  }

  // 2. KITCHEN TADKA & INDOOR COMBUSTION (HOUSEHOLD)
  if (household.triggers.includes('tadka')) {
    const isExhaustPoor = household.kitchenExhaust !== 'ducted_chimney';
    const tadkaPmSpike = isExhaustPoor ? 380 : 120;
    const baselineDose = calculateInhalationDose(tadkaPmSpike, 2, 0.7, 0);
    const actionDose = calculateInhalationDose(tadkaPmSpike, 2, 0.7, isExhaustPoor ? 0.65 : 0.85);

    recommendations.push({
      id: 'rec_tadka_mitigation',
      targetId: 'household',
      targetName: 'Kitchen & Living Areas',
      priority: isExhaustPoor ? 'critical' : 'high',
      category: 'indoor_hacks',
      title: 'Tadka Splutter Phase: Seal Kitchen & Maximize Exhaust Draft',
      personalizedInstruction: `High-heat mustard oil tadka / deep frying generates ultrafine aerosol spikes (>400 µg/m³) within 6 minutes. Since your kitchen uses ${
        household.kitchenExhaust === 'ducted_chimney'
          ? 'a Ducted Chimney, turn it to Boost mode 2 minutes BEFORE heating oil and keep running for 7 minutes post-cooking.'
          : household.kitchenExhaust === 'exhaust_fan'
          ? 'an Exhaust Fan Only, keep the kitchen door shut to prevent indoor spillover to bedrooms and crack the service balcony window by 2 inches for directional airflow.'
          : 'No Ducted Chimney, lid the kadai immediately and run a cross-draft towards the exterior window while keeping interior doors closed.'
      }`,
      impactPill: `-${Math.round((baselineDose - actionDose) / 10)} µg/m³ living room spike avoided`,
      decisionSummary: `High-heat oil aerosolization releases polycyclic aromatic hydrocarbons (PAHs) and acrolein. Without sealed isolation, cooking plumes elevate whole-house PM2.5 to hazardous levels in under 15 minutes.`,
      confidenceScore: 0.95,
      shapAttributions: [
        {
          featureName: 'High-Heat Tadka / Frying Trigger',
          weightPercent: 48,
          direction: 'amplifying',
          description: 'Thermal decomposition of cooking oils produces high concentrations of PM0.1 and PM2.5.',
        },
        {
          featureName: `Kitchen Exhaust Architecture (${household.kitchenExhaust.replace('_', ' ')})`,
          weightPercent: 32,
          direction: isExhaustPoor ? 'amplifying' : 'mitigating',
          description: isExhaustPoor ? 'Inadequate capture velocity allows volatile organic aerosol migration.' : 'Ducted hood captures thermal plume at source.',
        },
        {
          featureName: `Ambient PM2.5 Infiltration (${pm25} µg/m³)`,
          weightPercent: 20,
          direction: 'amplifying',
          description: 'Outdoor smog prevents using full open windows for kitchen purging.',
        },
      ],
      counterfactual: {
        baselineInhaledDoseUgd: baselineDose,
        actionInhaledDoseUgd: actionDose,
        doseAvoidedUgd: baselineDose - actionDose,
        exposureReductionPercent: Math.round(((baselineDose - actionDose) / baselineDose) * 100),
        baselineCigaretteEquiv: calculateBerkeleyCigarettes(tadkaPmSpike, 2, 1.2),
        actionCigaretteEquiv: calculateBerkeleyCigarettes(tadkaPmSpike * (1 - (isExhaustPoor ? 0.65 : 0.85)), 2, 1.2),
        cigarettesAvoided: calculateBerkeleyCigarettes(tadkaPmSpike * (isExhaustPoor ? 0.65 : 0.85), 2, 1.2),
      },
      scientificGrounding: {
        mechanism: 'Thermal oxidation of fatty acids at smoking point (>190°C) generates dense condensed nano-droplets and ultrafine volatile organic compounds.',
        cpcbStandardCitation: 'CPCB Indoor Air Quality Advisory on Domestic Cooking Emissions.',
        whoStandardCitation: 'WHO Indoor Air Quality Guidelines for Household Fuel Combustion and Cooking Fumes.',
        physiologicalDetail: 'Acrolein and lipid peroxides cause transient airway hyperreactivity, bronchial constriction, and lacrimation.',
      },
    });
  }

  // 3. DRY JHADU (SWEEPING) VS WET MOPPING (HOUSEHOLD)
  if (household.triggers.includes('dry_jhadu')) {
    const floorElevation = household.elevation;
    const isGround = floorElevation === 'ground_1_2';
    const resuspendedPm10 = isGround ? 320 : 190;
    const baselineDose = calculateInhalationDose(resuspendedPm10, 1.5, 0.6, 0);
    const actionDose = calculateInhalationDose(30, 1.5, 0.6, 0);

    recommendations.push({
      id: 'rec_wet_mopping',
      targetId: 'household',
      targetName: 'Daily Housekeeping',
      priority: 'high',
      category: 'indoor_hacks',
      title: 'Swap Dry Jhadu (Brooming) for Microfiber Damp Mopping',
      personalizedInstruction: `Dry grass broom (phool/seekh jhadu) resuspends settled coarse road dust (PM10: ${pm10} µg/m³) into your breathing zone for up to 90 minutes. Switch immediately to a damp microfiber mop with water or vinegar solution. ${
        isGround ? 'Because you reside on Ground/1st floor, street dust settling rates are 3x higher than upper floors.' : ''
      }`,
      impactPill: '-78% Resuspended Particle Load',
      decisionSummary: `Mechanical shearing from traditional dry brooming aerosolizes settled PM10 and heavy-metal laden road dust, spiking indoor concentration far above the outdoor baseline.`,
      confidenceScore: 0.96,
      shapAttributions: [
        {
          featureName: 'Dry Brooming (Jhadu) Practice',
          weightPercent: 54,
          direction: 'amplifying',
          description: 'Dry friction fluidizes settled crustal matter and brake-wear dust.',
        },
        {
          featureName: `Ambient Coarse Dust PM10 (${pm10} µg/m³)`,
          weightPercent: 28,
          direction: 'amplifying',
          description: `Live outdoor PM10 is ${pm10} µg/m³; unsealed thresholds allow heavy deposition.`,
        },
        {
          featureName: `Floor Elevation (${household.elevation === 'ground_1_2' ? 'Ground/1st' : 'Higher'})`,
          weightPercent: 18,
          direction: 'amplifying',
          description: 'Proximity to vehicular road wash-off concentrates heavy particles on lower floors.',
        },
      ],
      counterfactual: {
        baselineInhaledDoseUgd: baselineDose,
        actionInhaledDoseUgd: actionDose,
        doseAvoidedUgd: baselineDose - actionDose,
        exposureReductionPercent: 88,
        baselineCigaretteEquiv: calculateBerkeleyCigarettes(resuspendedPm10, 1.5, 1.0),
        actionCigaretteEquiv: calculateBerkeleyCigarettes(30, 1.5, 1.0),
        cigarettesAvoided: calculateBerkeleyCigarettes(resuspendedPm10 - 30, 1.5, 1.0),
      },
      scientificGrounding: {
        mechanism: 'Particle resuspension kinetics: Dry sweeping exceeds aerodynamic detachment velocity for 2.5–10µm particles, sustaining suspension via indoor micro-convection currents.',
        cpcbStandardCitation: 'CPCB Guidelines on Control of Road & Construction Dust Resuspension.',
        whoStandardCitation: 'WHO 2021 PM10 24-hour limit: 45 µg/m³.',
        physiologicalDetail: 'Coarse particles deposit in the nasopharyngeal and tracheobronchial tree, exacerbating allergic rhinitis and chronic bronchitis.',
      },
    });
  }

  // 4. AGARBATTI / DHOOP / MOSQUITO COIL BAN (HOUSEHOLD)
  if (household.triggers.includes('agarbatti') || household.triggers.includes('mosquito_coils')) {
    const isCoil = household.triggers.includes('mosquito_coils');
    const toxicType = isCoil ? 'Mosquito Coil' : 'Agarbatti / Dhoop / Camphor';
    const spike = isCoil ? 450 : 280;
    const cigEquiv = isCoil ? 3.5 : 1.8;

    recommendations.push({
      id: 'rec_incense_coils',
      targetId: 'household',
      targetName: 'Living Spaces & Mandir Area',
      priority: 'critical',
      category: 'indoor_hacks',
      title: `Eliminate ${toxicType} Smoldering Indoors`,
      personalizedInstruction: `Burning one mosquito coil is toxicologically equivalent to smoking 75–100 cigarettes in an enclosed room, emitting heavy benzene and formaldehyde. Burning agarbatti emits particulate matter denser than diesel exhaust. Replace mosquito coils with liquid vaporizers/nets, and switch to LED brass diya or essential oil diffusers without combustion.`,
      impactPill: `${cigEquiv.toFixed(1)} Cigarettes Equivalent Avoided`,
      decisionSummary: `Incomplete biomass combustion in a sealed room creates acute toxic peaks of benzene, toluene, xylenes (BTX) and PM2.5 that nullify indoor air purifiers.`,
      confidenceScore: 0.99,
      shapAttributions: [
        {
          featureName: `${toxicType} Smoldering`,
          weightPercent: 62,
          direction: 'amplifying',
          description: 'Direct emission of aromatic hydrocarbons, polycyclic organics, and PM0.1.',
        },
        {
          featureName: `Sealed Room Inversion Trapping`,
          weightPercent: 24,
          direction: 'amplifying',
          description: 'Because windows are sealed against winter smog, combustion products linger indefinitely.',
        },
        {
          featureName: 'Air Purifier Filter Saturation Risk',
          weightPercent: 14,
          direction: 'amplifying',
          description: 'Incense resins and oily soot rapidly glaze and clog HEPA / carbon matrix fibers.',
        },
      ],
      counterfactual: {
        baselineInhaledDoseUgd: calculateInhalationDose(spike, 8, 0.5, 0),
        actionInhaledDoseUgd: calculateInhalationDose(20, 8, 0.5, 0),
        doseAvoidedUgd: calculateInhalationDose(spike - 20, 8, 0.5, 0),
        exposureReductionPercent: 93,
        baselineCigaretteEquiv: cigEquiv,
        actionCigaretteEquiv: 0.1,
        cigarettesAvoided: cigEquiv - 0.1,
      },
      scientificGrounding: {
        mechanism: 'Low-temperature pyrolysis of binders emits ultrafine soot particles coated with mutagenic polycyclic aromatic hydrocarbons (PAHs).',
        cpcbStandardCitation: 'CPCB Comprehensive Guidelines on Indoor Air Pollutant Minimization.',
        whoStandardCitation: 'WHO Guidelines for Indoor Air Quality: Selected Pollutants (Benzene & Formaldehyde).',
        physiologicalDetail: 'Combustion aerosols penetrate deep alveolar walls and cross the blood-air barrier, entering systemic circulation.',
      },
    });
  }

  // 5. INDIVIDUAL FAMILY MEMBER RECOMMENDATIONS
  for (const member of household.members) {
    const isAsthmatic = member.sensitivity === 'asthma_bronchitis';
    const isCardiac = member.sensitivity === 'cardiac_hypertension';
    const isPregnant = member.sensitivity === 'pregnant';
    const isVulnerable = isAsthmatic || isCardiac || isPregnant || member.ageGroup === 'child' || member.ageGroup === 'senior';

    // A. Two-Wheeler Commuter / Open Auto
    if (member.commuteMode === 'two_wheeler_auto') {
      const isMorning = member.peakWindow === 'morning_7_10';
      const peakPm = isMorning ? pm25 * 1.55 : pm25 * 1.25;
      const baselineDose = calculateInhalationDose(peakPm, 1.5, 1.3, 0);
      const actionDose = calculateInhalationDose(peakPm, 1.5, 1.3, 0.95);
      const cigsAvoided = calculateBerkeleyCigarettes(peakPm * 0.95, 1.5, 1.3);

      recommendations.push({
        id: `rec_commute_${member.id}`,
        targetId: member.id,
        targetName: member.name,
        priority: 'critical',
        category: 'commute_swaps',
        title: `N95 Sealed Respirator & Visor Shield for Two-Wheeler Commute`,
        personalizedInstruction: `${member.name} rides on open roads during ${
          isMorning ? 'the Morning 7–10 AM rush hour when trapped inversion smog' : 'the peak traffic window when NO2 (' + no2 + ' µg/m³)'
        } is maximum. Riding without a certified N95 respirator forces ${Math.round(baselineDose)} µg of toxic aerosols into lungs per commute. Wear a tight head-strap N95 (cloth masks/handkerchiefs filter <20%), use a closed full-face helmet visor to protect ocular membranes, and switch to interior metro or bus routes whenever possible.`,
        impactPill: `${cigsAvoided.toFixed(1)} Cigarettes Avoided per Trip`,
        decisionSummary: `${member.name} undergoes elevated physical ventilation (1.3 m³/h) on arterial roads with direct proximity to tailpipe diesel exhaust, black carbon, and unburned hydrocarbons.`,
        confidenceScore: 0.97,
        shapAttributions: [
          {
            featureName: 'Two-Wheeler / Open Auto Transit Mode',
            weightPercent: 44,
            direction: 'amplifying',
            description: 'Direct unprotected boundary layer exposure without vehicular cabin filtration.',
          },
          {
            featureName: `Peak Exposure Time (${member.peakWindow === 'morning_7_10' ? 'Morning 7-10 AM' : member.peakWindow})`,
            weightPercent: 26,
            direction: 'amplifying',
            description: isMorning ? 'Coincides with morning inversion lid and traffic congestion.' : 'Elevated nitrogen dioxide concentrations.',
          },
          {
            featureName: `Health Sensitivity (${member.sensitivity.replace('_', ' ').toUpperCase()})`,
            weightPercent: 18,
            direction: isVulnerable ? 'amplifying' : 'mitigating',
            description: isAsthmatic ? 'Airway hyperresponsiveness amplifies bronchospasm risk.' : 'Elevated pulse rate on open roads.',
          },
          {
            featureName: `Live NO2 Level (${no2} µg/m³)`,
            weightPercent: 12,
            direction: 'amplifying',
            description: 'Vehicular combustion marker causing acute bronchial irritation.',
          },
        ],
        counterfactual: {
          baselineInhaledDoseUgd: baselineDose,
          actionInhaledDoseUgd: actionDose,
          doseAvoidedUgd: baselineDose - actionDose,
          exposureReductionPercent: 95,
          baselineCigaretteEquiv: calculateBerkeleyCigarettes(peakPm, 1.5, 1.3),
          actionCigaretteEquiv: calculateBerkeleyCigarettes(peakPm * 0.05, 1.5, 1.3),
          cigarettesAvoided: cigsAvoided,
        },
        scientificGrounding: {
          mechanism: 'Proximity to vehicular tailpipes exposes riders to un-agglomerated ultrafine particles (<0.1µm) and nitrogen dioxide before atmospheric dilution can occur.',
          cpcbStandardCitation: 'CPCB Vehicular Emission Standards and Urban Arterial Exposure Studies.',
          whoStandardCitation: 'WHO Global Air Quality Guidelines: NO2 24h threshold is 25 µg/m³.',
          physiologicalDetail: 'Inhaled fine carbonaceous particles induce alveolar macrophage oxidative stress and elevate systemic blood pressure.',
        },
      });
    }

    // B. School / College Student with Morning Outdoor Exposure
    if (member.occupation === 'student' && member.peakWindow === 'morning_7_10') {
      const peakPm = pm25 * 1.45;
      const baselineDose = calculateInhalationDose(peakPm, 3, 0.8, 0);
      const actionDose = calculateInhalationDose(peakPm, 3, 0.8, 0.70);
      const cigsAvoided = calculateBerkeleyCigarettes(peakPm * 0.7, 3, 1.2);

      recommendations.push({
        id: `rec_student_${member.id}`,
        targetId: member.id,
        targetName: member.name,
        priority: pm25 > 200 ? 'critical' : 'high',
        category: 'vulnerable_care',
        title: `Reschedule Morning Assembly & Outdoor Sports Indoors`,
        personalizedInstruction: `${member.name} commutes and attends school between 7:00–10:00 AM, the exact period when nocturnal inversion holds ground-level PM2.5 near ${Math.round(peakPm)} µg/m³. Ensure school administration moves morning physical assembly and sports drills indoors or into the afternoon (${bestVentilationWindow.startHour}:00 PM). Ensure the school bus keeps windows closed with AC in recirculation mode.`,
        impactPill: `${cigsAvoided.toFixed(1)} Cigarettes Avoided`,
        decisionSummary: `Children have higher ventilation rates per kilogram of body weight and developing pulmonary alveolar architecture, making morning outdoor sports under inversion smog hazardous.`,
        confidenceScore: 0.96,
        shapAttributions: [
          {
            featureName: 'Age Group (Child/Student Developing Lungs)',
            weightPercent: 40,
            direction: 'amplifying',
            description: 'Higher respiratory frequency and narrower airways accelerate deep particle deposition.',
          },
          {
            featureName: 'Morning Inversion Peak (7-10 AM)',
            weightPercent: 35,
            direction: 'amplifying',
            description: 'Morning temperature inversion prevents dispersion of overnight stubble/vehicular emissions.',
          },
          {
            featureName: `Commute Mode (${member.commuteMode.replace('_', ' ')})`,
            weightPercent: 15,
            direction: 'amplifying',
            description: 'Open windows in school vans/buses admit high roadside particle concentrations.',
          },
          {
            featureName: 'Sports / Outdoor Activity Multiplier',
            weightPercent: 10,
            direction: 'amplifying',
            description: 'Physical exertion switches breathing from nasal filtration to oral inhalation.',
          },
        ],
        counterfactual: {
          baselineInhaledDoseUgd: baselineDose,
          actionInhaledDoseUgd: actionDose,
          doseAvoidedUgd: baselineDose - actionDose,
          exposureReductionPercent: 70,
          baselineCigaretteEquiv: calculateBerkeleyCigarettes(peakPm, 3, 1.2),
          actionCigaretteEquiv: calculateBerkeleyCigarettes(peakPm * 0.3, 3, 1.2),
          cigarettesAvoided: cigsAvoided,
        },
        scientificGrounding: {
          mechanism: 'Exercise induces mouth-breathing, bypassing nasal turbinate aerodynamic particle impaction and directly transporting PM2.5 to peripheral bronchioles.',
          cpcbStandardCitation: 'CAQM (Commission for Air Quality Management) GRAP Stage III/IV School Closure Guidelines.',
          whoStandardCitation: 'WHO Air Pollution and Child Health: Prescribing Clean Air (2018).',
          physiologicalDetail: 'Children breathe 50% more air per pound of body weight than adults, causing disproportionately high alveolar toxicity.',
        },
      });
    }

    // C. Asthmatic / Bronchitis Patient Care
    if (isAsthmatic) {
      const baselineDose = calculateInhalationDose(pm25, 24, 0.6, 0);
      const actionDose = calculateInhalationDose(pm25, 24, 0.6, 0.65);
      const cigsAvoided = calculateBerkeleyCigarettes(pm25 * 0.65, 24, 1.0);

      recommendations.push({
        id: `rec_asthma_${member.id}`,
        targetId: member.id,
        targetName: member.name,
        priority: 'critical',
        category: 'vulnerable_care',
        title: `Asthma Action Plan: Inhaler Prophylaxis & Bedroom HEPA Oasis`,
        personalizedInstruction: `With live AQI in the ${telemetry.cpcb.category.toUpperCase()} range (PM2.5: ${pm25} µg/m³, NO2: ${no2} µg/m³), ${member.name}'s bronchial tissue is at acute risk of eosinophilic bronchospasm. Keep emergency reliever inhalers accessible, verify preventer dosage with your pulmonologist, and create a single sealed "Clean Air Oasis" bedroom with continuous HEPA filtration rather than straining to clean the whole home.`,
        impactPill: '-65% Bronchial Particle Exposure',
        decisionSummary: `${member.name} has pre-existing airway hyperreactivity. Even brief spikes of NO2 (>80 µg/m³) and PM2.5 cause epithelial sloughing and acute asthma exacerbations requiring nebulization.`,
        confidenceScore: 0.99,
        shapAttributions: [
          {
            featureName: 'Asthma / Bronchitis Clinical Sensitivity',
            weightPercent: 48,
            direction: 'amplifying',
            description: 'Bronchial hyperreactivity reduces airway clearance and triggers reactive smooth-muscle spasm.',
          },
          {
            featureName: `Ambient PM2.5 Spike (${pm25} µg/m³)`,
            weightPercent: 28,
            direction: 'amplifying',
            description: 'Ultra-fine aerosols penetrate directly into inflamed terminal bronchioles.',
          },
          {
            featureName: `Ambient NO2 Irritant Level (${no2} µg/m³)`,
            weightPercent: 14,
            direction: 'amplifying',
            description: 'Potent gaseous oxidant that lowers the threshold for allergen bronchoconstriction.',
          },
          {
            featureName: 'Air Oasis Containment Strategy',
            weightPercent: 10,
            direction: 'mitigating',
            description: 'Sealing one single bedroom concentrates CADR to bring bedroom PM2.5 below 20 µg/m³.',
          },
        ],
        counterfactual: {
          baselineInhaledDoseUgd: baselineDose,
          actionInhaledDoseUgd: actionDose,
          doseAvoidedUgd: baselineDose - actionDose,
          exposureReductionPercent: 65,
          baselineCigaretteEquiv: calculateBerkeleyCigarettes(pm25, 24, 1.0),
          actionCigaretteEquiv: calculateBerkeleyCigarettes(pm25 * 0.35, 24, 1.0),
          cigarettesAvoided: cigsAvoided,
        },
        scientificGrounding: {
          mechanism: 'Inhaled particulate free radicals trigger toll-like receptors and activate NF-κB inflammatory signaling in bronchial epithelial cells.',
          cpcbStandardCitation: 'CPCB NAQI Health Advisory: "Severe" warning flags acute respiratory illness in asthmatic cohorts.',
          whoStandardCitation: 'GINA (Global Initiative for Asthma) 2023 Environmental Trigger Recommendations.',
          physiologicalDetail: 'Particulate air pollution causes immediate decline in peak expiratory flow rate (PEFR) and increases airway resistance within 2 hours.',
        },
      });
    }

    // D. Senior Citizen / Cardiac Patient
    if ((member.ageGroup === 'senior' || isCardiac) && !isAsthmatic) {
      const peakPm = member.peakWindow === 'morning_7_10' ? pm25 * 1.4 : pm25;
      const baselineDose = calculateInhalationDose(peakPm, 2, 0.9, 0);
      const actionDose = calculateInhalationDose(peakPm, 2, 0.9, 0.85);

      recommendations.push({
        id: `rec_senior_${member.id}`,
        targetId: member.id,
        targetName: member.name,
        priority: 'high',
        category: 'routine_timing',
        title: `Postpone Morning Walk: Shift to Midday Indoor Sunlight`,
        personalizedInstruction: `${member.name} has outdoor window set to ${
          member.peakWindow === 'morning_7_10' ? 'Morning 7–10 AM' : 'Evening 6–9 PM'
        }. Morning brisk walking in cold, inversion-trapped smog triggers acute peripheral vasoconstriction and spikes arterial blood pressure. Shift exercise to an indoor hallway or well-ventilated balcony between ${bestVentilationWindow.startHour}:00 - ${bestVentilationWindow.endHour}:00 when temperature is warm and PM2.5 drops.`,
        impactPill: `${calculateBerkeleyCigarettes(peakPm * 0.85, 2, 1.0).toFixed(1)} Cigarettes Avoided`,
        decisionSummary: `Cold morning air combined with fine particulate matter induces systemic sympathetic autonomic excitation, elevating stroke and myocardial infarction incidence during winter smog episodes.`,
        confidenceScore: 0.95,
        shapAttributions: [
          {
            featureName: isCardiac ? 'Cardiovascular / Hypertension Risk' : 'Senior Age Vulnerability (60+)',
            weightPercent: 46,
            direction: 'amplifying',
            description: 'Vascular stiffness and compromised coronary reserve amplify susceptibility to ischemic events.',
          },
          {
            featureName: 'Cold Morning Ambient Temperature + Inversion',
            weightPercent: 32,
            direction: 'amplifying',
            description: 'Nocturnal chill triggers peripheral vasoconstriction while aerosols promote thrombogenesis.',
          },
          {
            featureName: 'Physical Exertion Exposure Window',
            weightPercent: 22,
            direction: 'amplifying',
            description: 'Elevated cardiac output during brisk morning walks multiplies particle inhalation rate.',
          },
        ],
        counterfactual: {
          baselineInhaledDoseUgd: baselineDose,
          actionInhaledDoseUgd: actionDose,
          doseAvoidedUgd: baselineDose - actionDose,
          exposureReductionPercent: 85,
          baselineCigaretteEquiv: calculateBerkeleyCigarettes(peakPm, 2, 1.0),
          actionCigaretteEquiv: calculateBerkeleyCigarettes(peakPm * 0.15, 2, 1.0),
          cigarettesAvoided: calculateBerkeleyCigarettes(peakPm * 0.85, 2, 1.0),
        },
        scientificGrounding: {
          mechanism: 'Systemic translocation of ultrafine particulate constituents causes acute autonomic imbalance, increased platelet aggregation, and vascular endothelial dysfunction.',
          cpcbStandardCitation: 'CPCB Health Advisory for Senior Citizens under CAQM GRAP III/IV.',
          whoStandardCitation: 'American Heart Association / WHO Scientific Statement on Air Pollution and Cardiovascular Disease.',
          physiologicalDetail: 'PM2.5 exposure is associated with immediate elevations in fibrinogen and C-reactive protein (CRP), promoting acute thrombotic plaque rupture.',
        },
      });
    }

    // E. Metro / Car Commuter Swap Advice
    if (member.commuteMode === 'closed_car') {
      recommendations.push({
        id: `rec_car_recirc_${member.id}`,
        targetId: member.id,
        targetName: member.name,
        priority: 'preventive',
        category: 'commute_swaps',
        title: `Car Cabin AC: Recirculation Mode + HEPA Cabin Filter`,
        personalizedInstruction: `While driving in heavy urban traffic, external air mode pulls in raw diesel soot and NO2 (${no2} µg/m³) from preceding vehicle exhausts. Switch your car HVAC to permanent 'Internal Recirculation' mode. Every 30 minutes, crack a window for 15 seconds if CO2 levels cause drowsiness. Upgrade your cabin filter to an activated carbon PM2.5 filter.`,
        impactPill: '-80% In-Cabin Particle Infiltration',
        decisionSummary: `A closed car cabin in recirculation mode creates an effective buffer, reducing PM2.5 infiltration by 80–90% compared to open traffic.`,
        confidenceScore: 0.92,
        shapAttributions: [
          {
            featureName: 'Vehicular Micro-Environment',
            weightPercent: 45,
            direction: 'amplifying',
            description: 'Direct proximity to tailpipes creates high localized NO2 and particulate spikes.',
          },
          {
            featureName: 'Cabin HVAC Recirculation Setting',
            weightPercent: 35,
            direction: 'mitigating',
            description: 'Recirculation isolates cabin volume and forces air through cabin filter repeatedly.',
          },
          {
            featureName: `Ambient Traffic NO2 (${no2} µg/m³)`,
            weightPercent: 20,
            direction: 'amplifying',
            description: 'Fresh air intake admits heavy concentrations of engine exhaust gases.',
          },
        ],
        counterfactual: {
          baselineInhaledDoseUgd: calculateInhalationDose(pm25, 1.5, 0.6, 0.2),
          actionInhaledDoseUgd: calculateInhalationDose(pm25, 1.5, 0.6, 0.85),
          doseAvoidedUgd: calculateInhalationDose(pm25, 1.5, 0.6, 0.65),
          exposureReductionPercent: 81,
          baselineCigaretteEquiv: calculateBerkeleyCigarettes(pm25 * 0.8, 1.5, 1.0),
          actionCigaretteEquiv: calculateBerkeleyCigarettes(pm25 * 0.15, 1.5, 1.0),
          cigarettesAvoided: calculateBerkeleyCigarettes(pm25 * 0.65, 1.5, 1.0),
          co2SavedKg: 0.8,
        },
        scientificGrounding: {
          mechanism: 'In-cabin aerosol dynamics: Standard cabin paper filters have low single-pass efficiency for PM0.1; recirculation mode achieves cumulative multi-pass filtration.',
          cpcbStandardCitation: 'CPCB In-Vehicle Micro-environmental Air Quality Assessment.',
          whoStandardCitation: 'WHO Urban Transport and Health Guidelines.',
          physiologicalDetail: 'Reduced NO2 inhalation prevents bronchial oxidative damage and preserves pulmonary surfactant integrity.',
        },
      });
    }
  }

  return recommendations;
}
