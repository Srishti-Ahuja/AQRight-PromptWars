// AQRight Strict TypeScript Interfaces

export type FloorElevation = 'ground_1_2' | 'mid_3_7' | 'high_8_plus';

export type KitchenExhaust = 'ducted_chimney' | 'exhaust_fan' | 'open_window_none';

export type AirFiltration = 'hepa' | 'diy_corsi_rosenthal' | 'none';

export type HouseholdTrigger = 'tadka' | 'agarbatti' | 'mosquito_coils' | 'dry_jhadu';

export type AgeGroup = 'child' | 'adult' | 'senior';

export type HealthSensitivity = 'none' | 'asthma_bronchitis' | 'cardiac_hypertension' | 'pregnant';

export type OccupationType =
  | 'student'
  | 'office_hybrid'
  | 'two_wheeler_field'
  | 'homemaker_wfh'
  | 'retired';

export type CommuteMode =
  | 'metro_train'
  | 'closed_car'
  | 'two_wheeler_auto'
  | 'walk_bus'
  | 'none';

export type PeakOutdoorWindow =
  | 'morning_7_10'
  | 'midday_12_4'
  | 'evening_6_9';

export interface FamilyMember {
  id: string;
  name: string;
  ageGroup: AgeGroup;
  sensitivity: HealthSensitivity;
  occupation: OccupationType;
  commuteMode: CommuteMode;
  peakWindow: PeakOutdoorWindow;
}

export interface HouseholdProfile {
  elevation?: FloorElevation;
  kitchenExhaust?: KitchenExhaust;
  airFiltration?: AirFiltration;
  triggers: HouseholdTrigger[];
  members: FamilyMember[];
  isSubmitted: boolean;
}

export type NAQICategory =
  | 'Good'
  | 'Satisfactory'
  | 'Moderate'
  | 'Poor'
  | 'Very Poor'
  | 'Severe';

export type GrapStage =
  | 'None'
  | 'Stage I (Poor)'
  | 'Stage II (Very Poor)'
  | 'Stage III (Severe)'
  | 'Stage IV (Severe+)';

export interface CPCBBreakdown {
  aqi: number;
  category: NAQICategory;
  grapStage: GrapStage;
  dominantPollutant: 'PM2.5' | 'PM10' | 'NO2';
  subIndices: {
    pm25: number;
    pm10: number;
    no2: number;
  };
  colorHex: string;
  badgeBg: string;
  badgeText: string;
}

export interface HourlyTelemetryPoint {
  time: string; // ISO or '14:00'
  hour: number; // 0-23
  pm25: number; // µg/m³
  pm10: number; // µg/m³
  no2: number; // µg/m³
  boundaryLayerHeight: number; // meters
  windSpeed: number; // km/h
  temperature: number; // °C
  relativeHumidity: number; // %
}

export interface TelemetryData {
  stationName: string;
  locality: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  lastUpdated: string;
  current: {
    pm25: number;
    pm10: number;
    no2: number;
    co: number; // mg/m³
    o3: number; // µg/m³
    boundaryLayerHeight: number; // meters
    windSpeed: number; // km/h
    temperature: number; // °C
    relativeHumidity: number; // %
    isTrappedSurfaceSmog: boolean; // boundary_layer_height < 450m
  };
  hourly: HourlyTelemetryPoint[];
  cpcb: CPCBBreakdown;
  bestVentilationWindow: {
    startHour: number;
    endHour: number;
    avgPm25: number;
    avgMixingHeight: number;
    recommendationText: string;
  };
}

export interface FeatureAttribution {
  featureName: string;
  weightPercent: number; // 0 - 100
  direction: 'amplifying' | 'mitigating';
  description: string;
}

export interface CounterfactualMetrics {
  baselineInhaledDoseUgd: number; // µg of PM2.5 per day
  actionInhaledDoseUgd: number; // µg of PM2.5 per day
  doseAvoidedUgd: number;
  exposureReductionPercent: number;
  baselineCigaretteEquiv: number; // Berkeley Earth metric
  actionCigaretteEquiv: number;
  cigarettesAvoided: number;
  co2SavedKg?: number;
}

export type RecommendationPriority = 'critical' | 'high' | 'preventive';

export type RecommendationCategory =
  | 'indoor_hacks'
  | 'commute_swaps'
  | 'routine_timing'
  | 'vulnerable_care';

export interface XAIRecommendation {
  id: string;
  targetId: string; // 'household' or family member ID
  targetName: string;
  priority: RecommendationPriority;
  category: RecommendationCategory;
  title: string;
  personalizedInstruction: string;
  impactPill: string; // e.g. "-54 µg/m³ peak dose"
  decisionSummary: string;
  confidenceScore: number; // 0.85 - 0.99
  shapAttributions: FeatureAttribution[];
  counterfactual: CounterfactualMetrics;
  scientificGrounding: {
    mechanism: string;
    cpcbStandardCitation: string;
    whoStandardCitation: string;
    physiologicalDetail: string;
  };
}

export interface CityPreset {
  id: string;
  name: string;
  locality: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  monitoringAgency: string;
}
