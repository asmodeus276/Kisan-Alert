export interface DiagnosisResult {
  disease_name: string;
  disease_name_local: string;
  confidence_score: number;
  severity: "Low" | "Medium" | "High";
  symptoms_observed: string[];
  treatment_en: string;
  treatment_local: string;
  escalate_to_rsk: boolean;
  case_id?: string;
}

export interface DistrictAlert {
  id: string;
  type: "dry_spell" | "frost" | "flood" | "pest_risk";
  severity: "Low" | "Medium" | "High";
  affectedCrop: string;
  messageEn: string;
  recommendedAction: string;
}

export interface RegionAdvisory {
  district: string;
  state: string;
  title: string;
  severity: "Low" | "Medium" | "High";
  summary: string;
  action: string;
  date: string;
}

export interface WeatherMetrics {
  temperature: string;
  rainChance: string;
  humidity: string;
  soilMoisture: string;
}

export interface AdvisoryFeedItem {
  id: string;
  district: string;
  state: string;
  title: string;
  severity: "Critical" | "Advisory" | "Normal";
  timeframe: string;
  guidance: string;
}

export interface EscalatedCase {
  id: string;
  districtId: string;
  farmerName: string;
  village: string;
  cropName: string;
  photoThumbnail: string;
  diagnosis: {
    disease_name: string;
    disease_name_local: string;
    confidence_score: number;
    severity: "Low" | "Medium" | "High";
    treatment_en: string;
    treatment_local: string;
    symptoms_observed: string[];
  };
  symptomDescription: string;
  voiceTranscript?: string;
  submissionTime: string;
  status: "Open" | "In Review" | "Responded" | "Closed";
  advisoryResponse: string;
}
