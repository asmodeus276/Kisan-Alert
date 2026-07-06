import mockDistrictData from "../../mock-district-data.json";

export interface SampleCrop {
  id: string;
  name: string;
  cropType: string;
  symptomNotes: string;
  imageUrl: string; // SVG Data URI for perfect lightweight rendering
  presetDiagnosis: {
    disease_name: string;
    disease_name_local: string;
    confidence_score: number;
    severity: "Low" | "Medium" | "High";
    symptoms_observed: string[];
    treatment_en: string;
    treatment_local: string;
    escalate_to_rsk: boolean;
    case_id?: string;
  };
}

export const SAMPLE_CROPS: SampleCrop[] = [
  {
    id: "potato-late-blight",
    name: "Potato Leaf Spots",
    cropType: "Potato (आलू)",
    symptomNotes: "Dark brown patches spreading rapidly from leaf margins. White fuzzy mold underneath when humid.",
    imageUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23E2E8F0"/><circle cx="50" cy="50" r="35" fill="%23475569" opacity="0.1"/><path d="M50,15 C65,35 65,65 50,85 C35,65 35,35 50,15 Z" fill="%2365A30D"/><path d="M50,15 L50,85" stroke="%234D7C0F" stroke-width="1.5"/><circle cx="43" cy="38" r="8" fill="%2378350F" opacity="0.85"/><circle cx="56" cy="52" r="6" fill="%2378350F" opacity="0.85"/><circle cx="46" cy="65" r="9" fill="%2378350F" opacity="0.85"/><circle cx="53" cy="30" r="5" fill="%2378350F" opacity="0.7"/><path d="M50,30 L62,26" stroke="%234D7C0F" stroke-width="1.2"/><path d="M50,45 L38,40" stroke="%234D7C0F" stroke-width="1.2"/><path d="M50,60 L65,58" stroke="%234D7C0F" stroke-width="1.2"/></svg>`,
    presetDiagnosis: {
      disease_name: "Late Blight (Phytophthora infestans) in Potato",
      disease_name_local: "आलू का पछेती झुलसा रोग (Late Blight)",
      confidence_score: 94,
      severity: "High",
      symptoms_observed: [
        "Water-soaked dark brown spots appearing near leaf tips and margins",
        "Whitish fuzzy growth of mold visible on leaf undersides under humid conditions",
        "Rapid collapse and rot of leaf tissues spreading to stalks"
      ],
      treatment_en: "1. Immediately spray Metalaxyl 8% + Mancozeb 64% (e.g., Ridomil Gold) at 2g per liter of water.\n2. Ensure proper spacing between plants and destroy highly infected plants immediately.\n3. Avoid overhead sprinkler irrigation to lower foliage dampness.",
      treatment_local: "1. तुरंत मेटालैक्सिल 8% + मैंकोज़ेब 64% (जैसे रिडोमिल गोल्ड) का 2 ग्राम प्रति लीटर पानी में मिलाकर छिड़काव करें।\n2. पौधों के बीच उचित दूरी सुनिश्चित करें और संक्रमित पौधों को तुरंत नष्ट करें।\n3. सिंचाई नियंत्रित रखें और पत्तों पर पानी जमा न होने दें।",
      escalate_to_rsk: true
    }
  },
  {
    id: "rice-blast",
    name: "Paddy Yellowing & Lesions",
    cropType: "Rice / Paddy (धान)",
    symptomNotes: "Spindle-shaped spots on leaves with grey centers and brown borders. Lodging starting.",
    imageUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23E2E8F0"/><circle cx="50" cy="50" r="35" fill="%23475569" opacity="0.1"/><path d="M48,10 C54,35 54,70 50,90 C46,70 46,35 48,10 Z" fill="%2384CC16"/><path d="M48,10 L50,90" stroke="%234D7C0F" stroke-width="1"/><path d="M51,32 C56,32 58,35 55,38 C52,41 48,40 51,32 Z" fill="%23854D0E"/><path d="M46,55 C42,55 40,58 43,61 C46,64 50,62 46,55 Z" fill="%23854D0E"/><path d="M49,70 C52,70 54,72 52,75 C50,78 47,76 49,70 Z" fill="%23854D0E"/></svg>`,
    presetDiagnosis: {
      disease_name: "Rice Blast (Magnaporthe oryzae) in Paddy",
      disease_name_local: "धान का झोंका रोग (Rice Blast)",
      confidence_score: 88,
      severity: "Medium",
      symptoms_observed: [
        "Spindle-shaped (diamond-like) lesions on leaf blades with grey/whitish centers",
        "Brown or reddish-brown borders around dry lesions",
        "Slight collar rot starting near leaf sheaths"
      ],
      treatment_en: "1. Spray Tricyclazole 75% WP (e.g., Beam) at 0.6g per liter of water.\n2. Avoid applying excessive Nitrogen fertilizer, which increases disease susceptibility. Apply potash to strengthen plant immunity.\n3. Keep water levels optimal and ensure no water logging or dry stress.",
      treatment_local: "1. ट्राइसाइक्लाज़ोल 75% डब्ल्यूपी (जैसे बीम) का 0.6 ग्राम प्रति लीटर पानी में मिलाकर छिड़काव करें।\n2. नाइट्रोजन खाद का अत्यधिक उपयोग रोकें। पोटेशियम डालकर पौधों की रोग प्रतिरोधक क्षमता बढ़ाएं।\n3. खेतों में जल निकासी की उचित व्यवस्था रखें।",
      escalate_to_rsk: false
    }
  },
  {
    id: "cotton-healthy",
    name: "Healthy Cotton Foliage",
    cropType: "Cotton (कपास)",
    symptomNotes: "Vibrant green leaves, no spots, strong growth. Just checking to be sure.",
    imageUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23E2E8F0"/><circle cx="50" cy="50" r="35" fill="%23475569" opacity="0.1"/><path d="M50,20 C65,30 75,45 50,80 C25,45 35,30 50,20 Z" fill="%2322C55E"/><path d="M50,20 L50,80" stroke="%2315803D" stroke-width="1.5"/><path d="M50,40 L65,32" stroke="%2315803D" stroke-width="1"/><path d="M50,55 L32,48" stroke="%2315803D" stroke-width="1"/><circle cx="50" cy="50" r="22" fill="%2322C55E" opacity="0.5"/></svg>`,
    presetDiagnosis: {
      disease_name: "Healthy Cotton Crop",
      disease_name_local: "स्वस्थ कपास की फसल (Healthy Crop)",
      confidence_score: 97,
      severity: "Low",
      symptoms_observed: [
        "Leaf blades are uniform green without necrotic spots or insect damage",
        "Veins are healthy and turgid, showing no signs of mosaic or yellowing",
        "Stalk is robust, supporting proper foliage layout"
      ],
      treatment_en: "No disease detected. Maintain regular agronomic care. Ensure standard nitrogen-phosphorus-potassium (NPK) fertilization schedules and light irrigation according to rain forecasts. Keep checking leaves weekly.",
      treatment_local: "कोई बीमारी नहीं पाई गई। नियमित कृषि देखभाल जारी रखें। आवश्यकतानुसार एनपीके उर्वरक डालें और मौसम के अनुसार हल्की सिंचाई करें। पत्तों का साप्ताहिक निरीक्षण करते रहें।",
      escalate_to_rsk: false
    }
  }
];

export const DISTRICTS = [
  {
    id: "muzaffarnagar",
    name: "Muzaffarnagar",
    state: "Uttar Pradesh",
    helpline: "1800-180-1551",
    centerName: "Muzaffarnagar Krishi Vigyan Kendra",
    weather: {
      temperature: "31°C",
      rainChance: "78%",
      humidity: "64%",
      soilMoisture: "42%"
    },
    tickerAdvisories: [
      "MUZAFFARNAGAR: Heavy rain expected in 18 hrs. Delay urea spraying to avoid runoff.",
      "MUZAFFARNAGAR: Maintain clear drainage in low-lying sugarcane fields."
    ],
    alerts: [
      {
        id: "mzn-alert-1",
        type: "pest_risk",
        severity: "Medium",
        affectedCrop: "Sugarcane",
        messageEn: "High humidity and warm temperatures may trigger early shoot borer in sugarcane fields.",
        recommendedAction: "Release Trichogramma chilonis parasite cards at 50,000 per hectare."
      },
      {
        id: "mzn-alert-2",
        type: "flood",
        severity: "High",
        affectedCrop: "Rice/Paddy",
        messageEn: "Heavy upstream rainfall predicted; high risk of temporary flooding in low-lying fields.",
        recommendedAction: "Check drainage channels and construct temporary bunds around paddy fields."
      }
    ]
  },
  {
    id: "nizamabad",
    name: "Nizamabad",
    state: "Telangana",
    helpline: "1800-599-6363",
    centerName: "Rythu Seva Kendra, Nizamabad South",
    weather: {
      temperature: "34°C",
      rainChance: "15%",
      humidity: "52%",
      soilMoisture: "31%"
    },
    tickerAdvisories: [
      "NIZAMABAD: High temperature alert. Irrigate paddy nurseries in the evening hours.",
      "NIZAMABAD: Incidence of Stem Borer reported in late sown rice crops."
    ],
    alerts: [
      {
        id: "nzb-alert-1",
        type: "dry_spell",
        severity: "High",
        affectedCrop: "Paddy",
        messageEn: "No rainfall predicted for the next 10 days. Soil moisture is dropping rapidly below the safe threshold.",
        recommendedAction: "Irrigate paddy fields immediately. Apply alternate wetting and drying methods."
      },
      {
        id: "nzb-alert-2",
        type: "pest_risk",
        severity: "Medium",
        affectedCrop: "Maize",
        messageEn: "Infestation risk of Fall Armyworm detected in nearby villages due to warm dry winds.",
        recommendedAction: "Scout fields daily and spray Chlorantraniliprole 18.5% SC if infestation exceeds 10%."
      }
    ]
  },
  {
    id: "guntur",
    name: "Guntur",
    state: "Andhra Pradesh",
    helpline: "1800-425-1102",
    centerName: "Guntur District Rythu Bharosa Kendra",
    weather: {
      temperature: "35°C",
      rainChance: "8%",
      humidity: "58%",
      soilMoisture: "28%"
    },
    tickerAdvisories: [
      "GUNTUR: dry spell predicted. Light irrigation recommended for chili nurseries.",
      "GUNTUR: Scout for Sucking pests in early-stage Cotton crops."
    ],
    alerts: [
      {
        id: "gtr-alert-1",
        type: "dry_spell",
        severity: "High",
        affectedCrop: "Chili",
        messageEn: "Severe dry spell and 0% rain forecast for the next 8 days threatening early flower drop.",
        recommendedAction: "Irrigate chili nurseries within 2 days; use organic straw mulch to conserve moisture."
      },
      {
        id: "gtr-alert-2",
        type: "pest_risk",
        severity: "Low",
        affectedCrop: "Cotton",
        messageEn: "Mild risk of sucking pests (thrips, aphids) due to warm, stagnant dry weather.",
        recommendedAction: "Install yellow sticky traps at 15 per acre to monitor insect population."
      }
    ]
  },
  {
    id: "nashik",
    name: "Nashik",
    state: "Maharashtra",
    helpline: "1800-233-4000",
    centerName: "Nashik Regional Agricultural Service Desk",
    weather: {
      temperature: "29°C",
      rainChance: "45%",
      humidity: "71%",
      soilMoisture: "48%"
    },
    tickerAdvisories: [
      "NASHIK: Cloud cover may trigger Downy Mildew in grape vineyards. Check canopy aeration.",
      "NASHIK: Onion storing sheds should be kept completely ventilated."
    ],
    alerts: [
      {
        id: "nsk-alert-1",
        type: "frost",
        severity: "Medium",
        affectedCrop: "Grapes",
        messageEn: "Night temperatures expected to drop below 8°C, risking cold shock and fruit split in vineyards.",
        recommendedAction: "Irrigate vineyards during late evening hours to maintain soil temperature."
      },
      {
        id: "nsk-alert-2",
        type: "pest_risk",
        severity: "High",
        affectedCrop: "Onion",
        messageEn: "High ambient humidity and foggy morning air are highly conducive for Purple Blotch disease.",
        recommendedAction: "Spray Mancozeb 75% WP at 2.5g per liter of water immediately."
      }
    ]
  },
  {
    id: "bhatinda",
    name: "Bhatinda",
    state: "Punjab",
    helpline: "1800-180-2112",
    centerName: "Bhatinda District Farmer Advisory Center",
    weather: {
      temperature: "38°C",
      rainChance: "5%",
      humidity: "40%",
      soilMoisture: "22%"
    },
    tickerAdvisories: [
      "BHATINDA: Hot dry winds. Irrigate cotton crops to prevent early square drop.",
      "BHATINDA: Whitefly counts are currently below economic threshold level."
    ],
    alerts: [
      {
        id: "btd-alert-1",
        type: "dry_spell",
        severity: "High",
        affectedCrop: "Cotton",
        messageEn: "Intense hot winds and near-zero rain chances are causing severe moisture depletion.",
        recommendedAction: "Irrigate cotton fields immediately to prevent early flower square and boll drop."
      },
      {
        id: "btd-alert-2",
        type: "pest_risk",
        severity: "Medium",
        affectedCrop: "Wheat",
        messageEn: "Favorable dry weather for early Aphids in young wheat tillers.",
        recommendedAction: "Spray Imidacloprid 17.8% SL at 1ml per 3 liters of water if threshold is exceeded."
      }
    ]
  },
  {
    id: "warangal",
    name: mockDistrictData.district,
    state: mockDistrictData.state,
    helpline: "1800-425-1111",
    centerName: "Warangal Krishi Vigyan Kendra (KVK)",
    weather: {
      temperature: `${mockDistrictData.weather_forecast_7day[0]?.temp_c || 34}°C`,
      rainChance: `${(mockDistrictData.weather_forecast_7day[0]?.rain_mm || 0) > 0 ? 60 : 0}%`,
      humidity: `${mockDistrictData.weather_forecast_7day[0]?.humidity_pct || 58}%`,
      soilMoisture: "35%"
    },
    tickerAdvisories: mockDistrictData.active_alerts.map((a: any) =>
      `${mockDistrictData.district.toUpperCase()}: ${a.message_en}`
    ),
    alerts: mockDistrictData.active_alerts.map((a: any) => ({
      id: a.id,
      type: a.alert_type as any,
      severity: a.severity as any,
      affectedCrop: a.crop_name.charAt(0).toUpperCase() + a.crop_name.slice(1),
      messageEn: a.message_en,
      recommendedAction: a.action_required
    })),
    premiumMetrics: {
      season: mockDistrictData.season,
      ndvi: mockDistrictData.ndvi,
      soil: mockDistrictData.soil,
      groundwater_depth_m: mockDistrictData.groundwater_depth_m,
      weather_forecast_7day: mockDistrictData.weather_forecast_7day
    }
  }
];
