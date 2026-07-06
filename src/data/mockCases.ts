import { EscalatedCase } from "../types";

export const INITIAL_ESCALATED_CASES: EscalatedCase[] = [
  {
    id: "RSK-CASE-8842",
    districtId: "warangal",
    farmerName: "Mallesham Venkataiah",
    village: "Geesugonda",
    cropName: "Cotton",
    photoThumbnail: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23ECFDF5"/><circle cx="50" cy="50" r="35" fill="%23059669" opacity="0.1"/><path d="M30,50 Q50,20 70,50 T100,50" stroke="%23059669" stroke-width="2" fill="none"/><circle cx="50" cy="40" r="4" fill="%23DC2626"/><circle cx="65" cy="45" r="3" fill="%23DC2626"/><circle cx="40" cy="55" r="5" fill="%23DC2626"/><text x="10" y="20" fill="%23047857" font-size="10" font-family="monospace">COTTON</text></svg>`,
    diagnosis: {
      disease_name: "Severe Pink Bollworm Infestation",
      disease_name_local: "गुलाबी सुंडी का गंभीर प्रकोप (पिंक बॉलवॉर्म)",
      confidence_score: 62,
      severity: "High",
      treatment_en: "Install 5-10 pheromone traps per acre. Handpick and destroy affected bolls immediately. Spray Neem Oil 1500 ppm at 5ml per liter.",
      treatment_local: "प्रति एकड़ ५-१० फेरोमोन ट्रैप लगाएं। प्रभावित बोगियों को तुरंत हाथ से तोड़कर नष्ट कर दें। नीम का तेल १५०० पीपीएम ५ मिली प्रति लीटर की दर से छिड़काव करें।",
      symptoms_observed: [
        "Infested bolls fail to open",
        "Larval entry holes sealed with excreta",
        "Discolored fibers inside boll interiors"
      ]
    },
    symptomDescription: "Pink worms found burrowed deep inside my young cotton bolls. Some bolls are rotting and falling early.",
    voiceTranscript: "My cotton crop is being destroyed by pink worms. The bolls are not opening properly and turning brown. Please help me with some urgent chemical or biological solution.",
    submissionTime: "2026-07-04T09:15:00Z", // Older than 24 hours (SLA Breach)
    status: "Open",
    advisoryResponse: ""
  },
  {
    id: "RSK-CASE-3120",
    districtId: "warangal",
    farmerName: "Anmula Srinivas",
    village: "Nallabelly",
    cropName: "Rice",
    photoThumbnail: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23EFF6FF"/><path d="M50,10 C30,40 30,70 50,90 C70,70 70,40 50,10" fill="%233B82F6" opacity="0.1" stroke="%232563EB" stroke-width="2"/><circle cx="45" cy="45" r="4" fill="%23D97706"/><circle cx="52" cy="60" r="5" fill="%23D97706"/><text x="10" y="20" fill="%231E40AF" font-size="10" font-family="monospace">RICE</text></svg>`,
    diagnosis: {
      disease_name: "Rice Blast (Magnaporthe oryzae)",
      disease_name_local: "धान का झोंका रोग (ब्लास्ट)",
      confidence_score: 85,
      severity: "Medium",
      treatment_en: "Avoid excess Nitrogen fertilizer application. Spray Tricyclazole 75 WP at 0.6g per liter of water. Ensure continuous thin layer of water in the field.",
      treatment_local: "अत्यधिक नाइट्रोजन उर्वरक के प्रयोग से बचें। ट्राइसाइक्लाजोल ७५ डब्ल्यूपी का ०.६ ग्राम प्रति लीटर पानी में मिलाकर छिड़काव करें।",
      symptoms_observed: [
        "Spindle-shaped lesions with grayish centers on leaves",
        "Brown or purple borders around lesions",
        "Partial drying of leaf blades"
      ]
    },
    symptomDescription: "Diamond shaped spots on rice leaves. The tips of the leaves are completely drying up.",
    submissionTime: "2026-07-05T14:40:00Z", // Safe (less than 24 hours from July 6)
    status: "In Review",
    advisoryResponse: "We have reviewed your blast infection symptoms. Please ensure you suspend any further urea top-dressing for 7 days to halt rapid fungal spread. Plan a Tricyclazole spray in clear weather tomorrow morning."
  },
  {
    id: "RSK-CASE-7402",
    districtId: "nizamabad",
    farmerName: "Bhookya Ramulu",
    village: "Channaram",
    cropName: "Turmeric",
    photoThumbnail: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23FEF3C7"/><path d="M50,5 L30,50 L50,95 L70,50 Z" fill="%23F59E0B" opacity="0.2" stroke="%23D97706" stroke-width="1.5"/><circle cx="50" cy="35" r="6" fill="%23B45309"/><circle cx="45" cy="65" r="4" fill="%23B45309"/><text x="10" y="20" fill="%2392400E" font-size="10" font-family="monospace">TURMERIC</text></svg>`,
    diagnosis: {
      disease_name: "Turmeric Leaf Spot (Colletotrichum)",
      disease_name_local: "हल्दी के पत्तों का धब्बा रोग",
      confidence_score: 68,
      severity: "Medium",
      treatment_en: "Spray Carbendazim + Mancozeb co-formulation (e.g. Saaf) at 2g per liter. Remove highly affected lower leaves to improve aeration.",
      treatment_local: "कार्बेंडाजिम + मैंकोजेब (जैसे साफ़) २ ग्राम प्रति लीटर की दर से छिड़काव करें। हवा के संचार को बढ़ाने के लिए अत्यधिक प्रभावित निचली पत्तियों को हटा दें।",
      symptoms_observed: [
        "Elliptical spots on leaf surfaces",
        "Concentric rings visible on spots",
        "Yellow halo surrounding brown lesions"
      ]
    },
    symptomDescription: "Large oblong brown spots with yellow halos on the turmeric leaves. Crop is 90 days old.",
    submissionTime: "2026-07-03T11:20:00Z", // Older than 24 hours (SLA breach)
    status: "Open",
    advisoryResponse: ""
  },
  {
    id: "RSK-CASE-5103",
    districtId: "nizamabad",
    farmerName: "Gangadhar Reddy",
    village: "Armoor",
    cropName: "Tomato",
    photoThumbnail: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23FEE2E2"/><circle cx="50" cy="50" r="30" fill="%23EF4444" opacity="0.2" stroke="%23DC2626" stroke-width="2"/><circle cx="55" cy="45" r="5" fill="%237F1D1D"/><circle cx="40" cy="60" r="4" fill="%237F1D1D"/><text x="10" y="20" fill="%23991B1B" font-size="10" font-family="monospace">TOMATO</text></svg>`,
    diagnosis: {
      disease_name: "Tomato Early Blight",
      disease_name_local: "टमाटर का अगेती झुलसा रोग",
      confidence_score: 92,
      severity: "Low",
      treatment_en: "Prune lower leaves to enhance ventilation. Spray Mancozeb 75 WP at 2.5g per liter if symptoms continue to spread upward.",
      treatment_local: "हवा का संचार बढ़ाने के लिए निचली पत्तियों की छंटाई करें। यदि लक्षण ऊपर की ओर फैलते हैं, तो मैंकोजेब ७५ डब्ल्यूपी का २.५ ग्राम प्रति लीटर की दर से छिड़काव करें।",
      symptoms_observed: [
        "Concentric rings (target board pattern) on older leaves",
        "Gradual yellowing of affected foliage"
      ]
    },
    symptomDescription: "Dark rings on lower tomato leaves. Some are turning yellow and falling down.",
    submissionTime: "2026-07-06T00:10:00Z", // Recent
    status: "Closed",
    advisoryResponse: "This is classic Early Blight. Prune lower foliage up to 1 foot height and spray Mancozeb. Keep irrigation focused on roots, avoiding overhead sprinkling."
  },
  {
    id: "RSK-CASE-1104",
    districtId: "muzaffarnagar",
    farmerName: "Sohan Singh",
    village: "Sisauli",
    cropName: "Sugarcane",
    photoThumbnail: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23F0FDF4"/><line x1="30" y1="10" x2="30" y2="90" stroke="%2316A34A" stroke-width="4"/><line x1="50" y1="10" x2="50" y2="90" stroke="%2316A34A" stroke-width="4"/><line x1="70" y1="10" x2="70" y2="90" stroke="%2316A34A" stroke-width="4"/><path d="M30,30 L50,45 M50,60 L70,75" stroke="%23B45309" stroke-width="2"/><text x="10" y="20" fill="%2315803D" font-size="9" font-family="monospace">CANE</text></svg>`,
    diagnosis: {
      disease_name: "Red Rot of Sugarcane",
      disease_name_local: "गन्ने का लाल सड़न रोग (रेड रॉट)",
      confidence_score: 55,
      severity: "High",
      treatment_en: "Uproot infected clumps and burn immediately. Avoid ratoon crop in infected plots. Apply Trichoderma formulation enriched in FYM to soil.",
      treatment_local: "संक्रमित थान को उखाड़कर तुरंत जला दें। संक्रमित खेतों में पेड़ी की फसल न लें। सड़ी हुई गोबर की खाद में मिलाया हुआ ट्राइकोडर्मा मिट्टी में मिलाएं।",
      symptoms_observed: [
        "Reddening of internal pith tissue with white cross-wise bands",
        "Sour alcoholic odor when split open",
        "Withered crown leaves drying downwards"
      ]
    },
    symptomDescription: "Sugarcane stems are drying up and turning reddish inside with a heavy sour smell.",
    submissionTime: "2026-07-05T08:30:00Z", // Safe (less than 24 hours, but close)
    status: "Open",
    advisoryResponse: ""
  },
  {
    id: "RSK-CASE-4921",
    districtId: "nashik",
    farmerName: "Dnyaneshwar Patil",
    village: "Pimpalgaon",
    cropName: "Grapes",
    photoThumbnail: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23FAF5FF"/><circle cx="40" cy="50" r="8" fill="%238B5CF6" opacity="0.6"/><circle cx="55" cy="45" r="9" fill="%238B5CF6" opacity="0.6"/><circle cx="50" cy="62" r="8" fill="%238B5CF6" opacity="0.6"/><circle cx="45" cy="40" r="3" fill="%23F59E0B"/><text x="10" y="20" fill="%236D28D9" font-size="10" font-family="monospace">GRAPES</text></svg>`,
    diagnosis: {
      disease_name: "Grape Downy Mildew (Plasmopara viticola)",
      disease_name_local: "अंगूर का केवड़ा रोग (डाउन मिलड्यू)",
      confidence_score: 65,
      severity: "High",
      treatment_en: "Spray Metalaxyl 8% + Mancozeb 64% WP at 2g per liter. Avoid dense foliage wrapping by periodic thinning to enable dry breeze.",
      treatment_local: "मेटालैक्सिल ८% + मैंकोजेब ६४% डब्ल्यूपी का २ ग्राम प्रति लीटर की दर से छिड़काव करें। शुष्क हवा के संचार के लिए छंटाई करें।",
      symptoms_observed: [
        "Translucent yellowish oily spots on leaf upper surfaces",
        "White downy fungal growth on lower leaf surfaces under high humidity",
        "Withering of young shoot tips"
      ]
    },
    symptomDescription: "White cottony growth on the underside of grape leaves. Some berries are turning brown and drying up.",
    submissionTime: "2026-07-04T12:00:00Z", // Older than 24 hours (SLA breach)
    status: "Open",
    advisoryResponse: ""
  }
];
