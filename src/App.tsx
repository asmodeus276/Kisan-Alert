import React, { useState, useRef } from "react";
import { 
  Camera, 
  Upload, 
  AlertTriangle, 
  CheckCircle, 
  ShieldAlert, 
  TrendingUp, 
  Info, 
  MapPin, 
  PhoneCall, 
  BookOpen, 
  RotateCcw, 
  Sparkles, 
  Thermometer, 
  CloudRain, 
  Droplet, 
  Sprout, 
  Volume2,
  VolumeX,
  FileText,
  AlertCircle,
  Snowflake,
  Send,
  Loader2,
  Users,
  Clock,
  ClipboardList,
  Search,
  Check,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Database
} from "lucide-react";
import { SAMPLE_CROPS, DISTRICTS, SampleCrop } from "./data/samples";
import { INITIAL_ESCALATED_CASES } from "./data/mockCases";
import { EscalatedCase } from "./types";
import VoiceInput from "./components/VoiceInput";
import { DiagnosisResult } from "./types";
import { supabase } from "./lib/supabaseClient.ts";

// Get backend base URL from environment variables for Netlify/external deployments, avoiding misconfigured Supabase URLs
const rawBackendUrl = import.meta.env.VITE_BACKEND_URL || "";
const BACKEND_URL = rawBackendUrl.includes("supabase.co") ? "" : rawBackendUrl;


// Helper to retrieve premium climate & soil telemetry, matching mock-district-data.json
const getDistrictPremiumMetrics = (district: any) => {
  if (district.premiumMetrics) {
    return district.premiumMetrics;
  }
  // Generate high-fidelity fallbacks dynamically
  const name = district.name || "Nizamabad";
  const hash = name.length;
  const ph = (6.0 + (hash % 8) / 10).toFixed(1);
  const ndviVal = (0.38 + (hash % 5) * 0.08).toFixed(2);
  const ndviLabel = Number(ndviVal) > 0.6 ? "Dense Vegetation" : Number(ndviVal) > 0.4 ? "Moderate Stress" : "Severe Stress";
  const soilType = hash % 2 === 0 ? "Black Cotton Clay" : "Alluvial Loam";
  const gDepth = (6.8 + (hash % 7) * 0.9).toFixed(1);

  return {
    season: "Kharif",
    ndvi: { value: Number(ndviVal), label: ndviLabel, source: "ISRO Bhuvan (mock)", last_updated: "2026-07-05" },
    soil: { 
      type: soilType, 
      ph: Number(ph), 
      n_level: hash % 3 === 0 ? "Low" : "Medium", 
      p_level: hash % 3 === 1 ? "Low" : "Medium", 
      k_level: hash % 2 === 0 ? "High" : "Medium" 
    },
    groundwater_depth_m: Number(gDepth),
    weather_forecast_7day: [
      { date: "2026-07-06", rain_mm: hash % 3 === 0 ? 0 : 4, temp_c: 32, humidity_pct: 60 },
      { date: "2026-07-07", rain_mm: hash % 3 === 1 ? 2 : 0, temp_c: 33, humidity_pct: 58 },
      { date: "2026-07-08", rain_mm: hash % 4 === 0 ? 12 : 0, temp_c: 31, humidity_pct: 65 },
      { date: "2026-07-09", rain_mm: 0, temp_c: 34, humidity_pct: 55 },
      { date: "2026-07-10", rain_mm: 0, temp_c: 35, humidity_pct: 50 },
      { date: "2026-07-11", rain_mm: 0, temp_c: 36, humidity_pct: 48 },
      { date: "2026-07-12", rain_mm: 0, temp_c: 36, humidity_pct: 46 }
    ]
  };
};

const compressImage = (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const maxDim = 1024;
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(base64Str);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.8);
      resolve(compressedDataUrl);
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
};

export default function App() {
  // Selected state for district
  const [selectedDistrictId, setSelectedDistrictId] = useState(DISTRICTS[0].id);
  const activeDistrict = DISTRICTS.find(d => d.id === selectedDistrictId) || DISTRICTS[0];

  // Live Weather forecast state
  const [liveWeatherForecast, setLiveWeatherForecast] = useState<any[] | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);

  React.useEffect(() => {
    let active = true;
    const fetchWeather = async (retries = 3, delay = 1500) => {
      setIsWeatherLoading(true);
      for (let i = 0; i < retries; i++) {
        try {
          const res = await fetch(`${BACKEND_URL}/api/weather?districtId=${selectedDistrictId}`);
          if (res.ok && active) {
            const data = await res.json();
            if (data.success && data.weather_forecast_7day) {
              setLiveWeatherForecast(data.weather_forecast_7day);
              setIsWeatherLoading(false);
              return;
            }
          }
        } catch (err) {
          console.warn(`Attempt ${i + 1} to fetch weather failed:`, err);
          if (i < retries - 1 && active) {
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }
      if (active) {
        setLiveWeatherForecast(null);
        setIsWeatherLoading(false);
      }
    };

    fetchWeather();
    return () => {
      active = false;
    };
  }, [selectedDistrictId]);

  // Upload/Input states
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [symptomDescription, setSymptomDescription] = useState("");
  const [selectedCropType, setSelectedCropType] = useState<string>("Rice");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  
  // Results states
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [activeTab, setActiveTab] = useState<"scan" | "alerts" | "about" | "rsk" | "recommend">("scan");

  // Crop Recommendation States
  interface CropRecommendation {
    name: string;
    local_name: string;
    yield_per_acre: string;
    water_need_mm: number;
    sowing_window: string;
    income_estimate_inr: number;
    risk_level: "Low" | "Medium" | "High";
    explanation_en: string;
    explanation_local: string;
  }
  const [recommendations, setRecommendations] = useState<CropRecommendation[]>([]);
  const [recDistrictData, setRecDistrictData] = useState<any>(null);
  const [isRecLoading, setIsRecLoading] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const [recIsCached, setRecIsCached] = useState<boolean>(false);
  const [recIsFallback, setRecIsFallback] = useState<boolean>(false);
  const [selectedCompareCrops, setSelectedCompareCrops] = useState<string[]>([]);
  const [isDistrictDetailsExpanded, setIsDistrictDetailsExpanded] = useState(false);

  // Authentication States
  const [user, setUser] = useState<{ uid: string; email?: string; displayName?: string; photoURL?: string | null } | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // RSK Agent Dashboard states
  const [escalatedCases, setEscalatedCases] = useState<EscalatedCase[]>(() => {
    const stored = localStorage.getItem("rsk_escalated_cases");
    return stored ? JSON.parse(stored) : INITIAL_ESCALATED_CASES;
  });
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [agentSearchQuery, setAgentSearchQuery] = useState("");
  const [agentStatusFilter, setAgentStatusFilter] = useState<string>("ALL");
  const [callingFarmer, setCallingFarmer] = useState<EscalatedCase | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [callTimer, setCallTimer] = useState<NodeJS.Timeout | null>(null);
  const [agentSuccessMessage, setAgentSuccessMessage] = useState<string | null>(null);
  const [supabaseTablesNotCreated, setSupabaseTablesNotCreated] = useState<boolean>(false);
  
  // Alerts delivery and phone state tracking
  const [phoneNumbers, setPhoneNumbers] = useState<Record<string, string>>({});
  const [deliveryStatuses, setDeliveryStatuses] = useState<Record<string, { status: "idle" | "sending" | "sent" | "error"; message?: string; details?: string }>>({});
  
  // Audio guidance read-aloud state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(typeof window !== 'undefined' ? window.speechSynthesis : null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync escalated cases to localStorage
  React.useEffect(() => {
    localStorage.setItem("rsk_escalated_cases", JSON.stringify(escalatedCases));
  }, [escalatedCases]);

  // Track Supabase Auth session and synchronize with database
  React.useEffect(() => {
    if (!supabase) {
      console.warn("Supabase client is not initialized yet. Check your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY variables.");
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && session.user) {
        const u = session.user;
        const mappedUser = {
          uid: u.id,
          email: u.email,
          displayName: u.user_metadata?.full_name || u.user_metadata?.name || u.email,
          photoURL: u.user_metadata?.avatar_url || null,
        };
        setUser(mappedUser);
        setAuthToken(session.access_token);

        // Sync with backend database
        fetch(`${BACKEND_URL}/api/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`
          }
        }).catch(err => console.error("Failed to register session with backend:", err));
      } else {
        setUser(null);
        setAuthToken(null);
      }
    }).catch(err => {
      console.error("Error retrieving Supabase session on startup:", err);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && session.user) {
        const u = session.user;
        const mappedUser = {
          uid: u.id,
          email: u.email,
          displayName: u.user_metadata?.full_name || u.user_metadata?.name || u.email,
          photoURL: u.user_metadata?.avatar_url || null,
        };
        setUser(mappedUser);
        setAuthToken(session.access_token);

        try {
          await fetch(`${BACKEND_URL}/api/register`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session.access_token}`
            }
          });
          console.log("Session successfully verified and synchronized to database.");
        } catch (err) {
          console.error("Failed to register session with backend:", err);
        }
      } else {
        setUser(null);
        setAuthToken(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Handle Google Sign-In with Supabase, or mock user sign-in when not configured
  const handleSignIn = async () => {
    setAuthError(null);
    if (!supabase) {
      // Log in with a demo expert user instantly so they can view and manage escalated farmer cases!
      const mockUser = {
        uid: "demo-expert-user-uid",
        email: "demo-expert@example.com",
        displayName: "Demo Expert (Govt Advisor)",
        photoURL: null,
      };
      setUser(mockUser);
      setAuthToken("demo-mock-token");
      console.log("Logged in with Demo Expert User (Local Mode)");
      return;
    }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      console.error("Supabase Sign-In Error:", err);
      setAuthError(err.message || "An unexpected error occurred during Google Sign-In.");
    }
  };

  // Handle Sign-Out with Supabase
  const handleSignOut = async () => {
    if (!supabase) {
      setUser(null);
      setAuthToken(null);
      return;
    }
    try {
      await supabase.auth.signOut();
      setUser(null);
      setAuthToken(null);
    } catch (err) {
      console.error("Failed to sign out:", err);
    }
  };

  // Fetch initial escalated cases from Cloud SQL database on mount
  React.useEffect(() => {
    let active = true;
    const loadCasesFromCloud = async (retries = 3, delay = 1500) => {
      for (let i = 0; i < retries; i++) {
        try {
          const res = await fetch(`${BACKEND_URL}/api/cases`);
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          const data = await res.json();
          if (active && data.success) {
            if (data.cases && data.cases.length > 0) {
              // Sync state with database truths
              setEscalatedCases(data.cases);
            }
            if (data.tablesNotCreated) {
              setSupabaseTablesNotCreated(true);
            } else {
              setSupabaseTablesNotCreated(false);
            }
            return; // Success!
          }
        } catch (err) {
          console.warn(`Attempt ${i + 1} to load cases failed:`, err);
          if (i < retries - 1 && active) {
            await new Promise((resolve) => setTimeout(resolve, delay));
          } else {
            console.error("Failed to fetch escalated cases from Cloud SQL after retries:", err);
          }
        }
      }
    };
    loadCasesFromCloud();
    return () => {
      active = false;
    };
  }, []);

  // Auto-escalation trigger: adds cases from the diagnosis flow to the RSK Agent Dashboard
  React.useEffect(() => {
    if (diagnosis) {
      const isEscalated = diagnosis.escalate_to_rsk || 
        (typeof diagnosis.confidence_score === 'number' && diagnosis.confidence_score < 70) || 
        (typeof diagnosis.severity === 'string' && diagnosis.severity.toLowerCase() === 'high');

      if (isEscalated) {
        const caseId = diagnosis.case_id || `RSK-CASE-${Math.floor(1000 + Math.random() * 9000)}`;
        setEscalatedCases((prev) => {
          const exists = prev.some((c) => c.id === caseId);
          if (exists) return prev;

          // Deduce crop name using keywords from diagnosis or description
          const deduceCropName = (disName: string, desc: string): string => {
            if (selectedCropType) return selectedCropType;
            const text = `${disName} ${desc}`.toLowerCase();
            if (text.includes("potato")) return "Potato";
            if (text.includes("tomato")) return "Tomato";
            if (text.includes("rice") || text.includes("paddy")) return "Rice";
            if (text.includes("cotton")) return "Cotton";
            if (text.includes("turmeric")) return "Turmeric";
            if (text.includes("sugarcane") || text.includes("cane")) return "Sugarcane";
            if (text.includes("grape")) return "Grapes";
            if (text.includes("wheat")) return "Wheat";
            return "Pigeon Pea";
          };

          const crop = deduceCropName(diagnosis.disease_name, symptomDescription);

          const newCase: EscalatedCase = {
            id: caseId,
            districtId: selectedDistrictId,
            farmerName: "Rajender Prasad",
            village: selectedDistrictId === "warangal" ? "Geesugonda" : "Channaram",
            cropName: crop,
            photoThumbnail: selectedImage || `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23FEF3C7"/><text x="10" y="50" fill="%23D97706" font-size="10">SPECIMEN</text></svg>`,
            diagnosis: {
              disease_name: diagnosis.disease_name,
              disease_name_local: diagnosis.disease_name_local,
              confidence_score: diagnosis.confidence_score,
              severity: diagnosis.severity || "Medium",
              treatment_en: diagnosis.treatment_en,
              treatment_local: diagnosis.treatment_local,
              symptoms_observed: diagnosis.symptoms_observed || []
            },
            symptomDescription: symptomDescription || "Observed discoloration and spots on leaves.",
            submissionTime: new Date().toISOString(),
            status: "Open",
            advisoryResponse: ""
          };

          // Sync new escalated case to Cloud SQL
          fetch(`${BACKEND_URL}/api/cases`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              ...newCase,
              userUid: user?.uid || null
            })
          }).catch(err => console.error("Cloud SQL case auto-escalation sync failed:", err));

          return [newCase, ...prev];
        });
      }
    }
  }, [diagnosis, selectedDistrictId, selectedImage, symptomDescription]);

  // Quick district changer handler
  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDistrictId(e.target.value);
  };

  // Preset Sample loader
  const handleLoadSample = (sample: SampleCrop) => {
    setSelectedImage(sample.imageUrl);
    setSymptomDescription(sample.symptomNotes);
    setDiagnosis(sample.presetDiagnosis);
    setAnalysisError(null);
    stopSpeaking();

    const ct = sample.cropType.toLowerCase();
    if (ct.includes("rice") || ct.includes("paddy")) setSelectedCropType("Rice");
    else if (ct.includes("potato")) setSelectedCropType("Potato");
    else if (ct.includes("cotton")) setSelectedCropType("Cotton");
    else if (ct.includes("tomato")) setSelectedCropType("Tomato");
    else if (ct.includes("wheat")) setSelectedCropType("Wheat");
    else if (ct.includes("sugarcane")) setSelectedCropType("Sugarcane");
    else if (ct.includes("turmeric")) setSelectedCropType("Turmeric");
    else if (ct.includes("grapes") || ct.includes("grape")) setSelectedCropType("Grapes");
    else if (ct.includes("pigeon pea")) setSelectedCropType("Pigeon Pea");
  };

  // File conversion to base64 for API
  const handleImageFileChange = (file: File) => {
    if (!file) return;
    
    // Check size (limit to 5MB on client side)
    if (file.size > 5 * 1024 * 1024) {
      alert("File is too large. Please upload an image under 5MB.");
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
      // Reset past diagnosis so user can run fresh scan
      setDiagnosis(null);
    };
    reader.readAsDataURL(file);
  };

  // RSK Farmer Calling Logic
  const handleStartCall = (c: EscalatedCase) => {
    setCallingFarmer(c);
    setCallDuration(0);
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    setCallTimer(timer);
  };

  const handleEndCall = () => {
    if (callTimer) {
      clearInterval(callTimer);
    }
    setCallTimer(null);
    setCallingFarmer(null);
    setCallDuration(0);
  };

  React.useEffect(() => {
    return () => {
      if (callTimer) clearInterval(callTimer);
    };
  }, [callTimer]);

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageFileChange(e.target.files[0]);
    }
  };

  // Drag and Drop support
  const [dragActive, setDragActive] = useState(false);
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFileChange(e.dataTransfer.files[0]);
    }
  };

  // Trigger file selection
  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Call Server API endpoint
  const handleAnalyzeCrop = async () => {
    if (!selectedImage) {
      setAnalysisError("Please capture/upload an image or select a quick sample crop first.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setDiagnosis(null);
    stopSpeaking();

    try {
      const isSvg = selectedImage.startsWith("data:image/svg+xml") || selectedImage.includes("<svg");
      let imageToSend = selectedImage;
      if (!isSvg) {
        try {
          imageToSend = await compressImage(selectedImage);
        } catch (err) {
          console.error("Error compressing image, using original:", err);
        }
      }

      const response = await fetch(`${BACKEND_URL}/api/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: imageToSend,
          textDescription: symptomDescription,
          cropType: selectedCropType,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Analysis failed on server.");
      }

      const result: DiagnosisResult = await response.json();
      setDiagnosis(result);
    } catch (err: any) {
      console.error(err);
      setAnalysisError(
        err.message || "Unable to reach the Agri-Pathologist API. Please verify configuration or try again."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Audio Read-aloud of Treatment plan
  const startSpeaking = (text: string) => {
    if (!synthRef.current) return;
    stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(text);
    // Prefer Indian English voice or Hindi voice if accessible
    const voices = synthRef.current.getVoices();
    const targetVoice = voices.find(v => v.lang.includes("IN") || v.lang.includes("hi-IN"));
    if (targetVoice) utterance.voice = targetVoice;
    
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    utteranceRef.current = utterance;
    setIsSpeaking(true);
    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsSpeaking(false);
  };

  const toggleAudioDiagnosis = () => {
    if (!diagnosis) return;
    if (isSpeaking) {
      stopSpeaking();
    } else {
      const speechText = `Diagnosis is ${diagnosis.disease_name}, known locally as ${diagnosis.disease_name_local}. The threat level is ${diagnosis.severity} with ${diagnosis.confidence_score} percent confidence. Recommended treatment: ${diagnosis.treatment_en}`;
      startSpeaking(speechText);
    }
  };

  // Direct reset
  const handleReset = () => {
    setSelectedImage(null);
    setImageFile(null);
    setSymptomDescription("");
    setDiagnosis(null);
    setAnalysisError(null);
    stopSpeaking();
  };

  // Fetch crop recommendations
  const fetchRecommendations = async () => {
    setIsRecLoading(true);
    setRecError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/crop-recommendations?districtId=${selectedDistrictId}`);
      if (!res.ok) {
        throw new Error("Failed to load crop recommendations.");
      }
      const data = await res.json();
      setRecommendations(data.recommendations || []);
      setRecDistrictData(data.districtData);
      setRecIsCached(!!data.isCached);
      setRecIsFallback(!!data.isFallback);
    } catch (err: any) {
      setRecError(err.message || "An unexpected error occurred.");
    } finally {
      setIsRecLoading(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === "recommend") {
      fetchRecommendations();
    }
  }, [activeTab, selectedDistrictId]);

  // Send active district hazard alert via Fast2SMS SMS API
  const handleSendSMSAlert = async (alert: any) => {
    const phone = phoneNumbers[alert.id] || "";
    const cleanedPhone = phone.replace(/\D/g, "");
    
    if (!cleanedPhone || cleanedPhone.length < 10) {
      setDeliveryStatuses(prev => ({
        ...prev,
        [alert.id]: { 
          status: "error", 
          message: "Valid 10-digit number is required." 
        }
      }));
      return;
    }

    setDeliveryStatuses(prev => ({
      ...prev,
      [alert.id]: { status: "sending" }
    }));

    try {
      const response = await fetch(`${BACKEND_URL}/api/send-alert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          phoneNumber: cleanedPhone,
          alert: alert
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle the specific 412 code or custom missing key warning gracefully
        const errorMsg = data.error || "Failed to send SMS.";
        let errorDetails = "";
        if (data.details) {
          if (typeof data.details === "string") {
            errorDetails = ` (${data.details})`;
          } else if (typeof data.details === "object" && data.details !== null) {
            try {
              const innerMsg = data.details.message || data.details.error || JSON.stringify(data.details);
              errorDetails = ` (${innerMsg})`;
            } catch (e) {
              errorDetails = ` (${String(data.details)})`;
            }
          } else {
            errorDetails = ` (${String(data.details)})`;
          }
        }
        throw new Error(`${errorMsg}${errorDetails}`);
      }

      setDeliveryStatuses(prev => ({
        ...prev,
        [alert.id]: { 
          status: "sent", 
          message: data.message || "SMS alert sent successfully!",
          details: data.details,
          isSimulated: !!data.isSimulated
        }
      }));
    } catch (err: any) {
      console.error("SMS sending failed:", err);
      setDeliveryStatuses(prev => ({
        ...prev,
        [alert.id]: { 
          status: "error", 
          message: err.message || "Failed to dispatch SMS." 
        }
      }));
    }
  };

  const handlePhoneChange = (alertId: string, value: string) => {
    setPhoneNumbers(prev => ({
      ...prev,
      [alertId]: value
    }));
  };

  // Determine threat indicators
  const isEscalated = diagnosis && (
    diagnosis.escalate_to_rsk || 
    (typeof diagnosis.confidence_score === 'number' && diagnosis.confidence_score < 70) || 
    (typeof diagnosis.severity === 'string' && diagnosis.severity.toLowerCase() === 'high')
  );

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans flex flex-col antialiased">
      
      {/* 1. GOVERNMENT-STYLE ALERTS TICKER HEADER */}
      <div className="bg-brand-navy text-brand-amber overflow-hidden white-space-nowrap py-2 font-mono text-xs border-b border-stone-800/20 select-none">
        <div className="relative w-full flex overflow-x-hidden">
          <div className="animate-ticker whitespace-nowrap flex gap-8">
            {activeDistrict.tickerAdvisories.map((adv, idx) => (
              <span key={idx} className="flex items-center gap-2 px-4 border-r border-slate-700">
                <span className="w-1.5 h-1.5 bg-brand-gold rounded-full animate-ping"></span>
                {adv}
              </span>
            ))}
            {/* Duplicate for seamless infinite scrolling loop */}
            {activeDistrict.tickerAdvisories.map((adv, idx) => (
              <span key={`dup-${idx}`} className="flex items-center gap-2 px-4 border-r border-slate-700">
                <span className="w-1.5 h-1.5 bg-brand-gold rounded-full animate-ping"></span>
                {adv}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 2. MAIN APP BAR */}
      <header className="bg-white border-b border-stone-200 px-6 py-4 shadow-sm" id="app-header">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-800 flex items-center justify-center shadow-md">
              <Sprout className="h-6 w-6 text-brand-cream" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tighter text-emerald-950 uppercase">Kisan Alert</h1>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Rythu Assistant
                </span>
              </div>
              <p className="text-xs text-stone-500 font-medium uppercase tracking-widest">
                AI Plant Pathologist &amp; Regional Advisory Feed
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto" id="header-right-controls">
            {/* District Selector widget */}
            <div className="flex items-center bg-stone-50 border border-stone-200 rounded-full px-3 py-1.5 text-xs font-bold gap-2 text-stone-700 w-full sm:w-auto">
              <MapPin className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
              <span className="hidden sm:inline text-stone-400 uppercase font-mono">Region:</span>
              <select 
                value={selectedDistrictId} 
                onChange={handleDistrictChange}
                className="bg-transparent border-none outline-none font-sans text-stone-900 cursor-pointer pr-1 focus:ring-0"
                id="district-dropdown-selector"
              >
                {DISTRICTS.map((dist) => (
                  <option key={dist.id} value={dist.id}>
                    {dist.name}, {dist.state}
                  </option>
                ))}
              </select>
            </div>

            {/* Google Authentication & Cloud Sync Widget */}
            {user ? (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-full pl-1.5 pr-3 py-1 text-xs font-bold text-emerald-900 shadow-sm shrink-0" id="auth-user-badge">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || "User"} className="w-5 h-5 rounded-full shadow-inner border border-emerald-200" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-emerald-800 text-white flex items-center justify-center text-[10px] font-black uppercase shadow-sm">
                    {user.email ? user.email[0] : "U"}
                  </div>
                )}
                <span className="hidden sm:inline truncate max-w-[120px] font-sans font-medium text-emerald-800">
                  {user.displayName || user.email}
                </span>
                <span className="h-3 w-px bg-emerald-200 hidden sm:inline"></span>
                <button
                  onClick={handleSignOut}
                  className="text-[10px] uppercase font-mono font-black text-emerald-600 hover:text-emerald-950 transition-colors cursor-pointer"
                  id="auth-logout-btn"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                className="flex items-center gap-1.5 bg-emerald-950 text-white hover:bg-emerald-900 border border-transparent rounded-full px-3.5 py-1.5 text-xs font-black transition-all shadow-sm cursor-pointer hover:shadow-md shrink-0 touch-target"
                id="auth-login-btn"
              >
                <Users className="h-3.5 w-3.5 text-brand-gold animate-pulse" />
                <span>Sign In with Google</span>
              </button>
            )}

             <div className="flex gap-1 bg-stone-100 p-1 rounded-full text-xs font-bold w-full sm:w-auto justify-center" id="nav-tabs">
              <button
                onClick={() => setActiveTab("scan")}
                className={`px-4 py-1.5 rounded-full transition-all duration-150 cursor-pointer ${
                  activeTab === "scan" 
                    ? "bg-white text-emerald-950 shadow-sm" 
                    : "text-stone-500 hover:text-stone-800"
                }`}
                id="tab-btn-scan"
              >
                Diagnostic Lab
              </button>
              <button
                onClick={() => setActiveTab("alerts")}
                className={`px-4 py-1.5 rounded-full transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "alerts" 
                    ? "bg-white text-emerald-950 shadow-sm" 
                    : "text-stone-500 hover:text-stone-800"
                }`}
                id="tab-btn-alerts"
              >
                Dry-Spell Alerts
                {activeDistrict.alerts && activeDistrict.alerts.length > 0 && (
                  <span className="bg-rose-600 text-white text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold tracking-normal scale-90 animate-pulse shrink-0">
                    {activeDistrict.alerts.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("recommend")}
                className={`px-4 py-1.5 rounded-full transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "recommend" 
                    ? "bg-white text-emerald-950 shadow-sm" 
                    : "text-stone-500 hover:text-stone-800"
                }`}
                id="tab-btn-recommend"
              >
                <Sprout className="h-3.5 w-3.5" />
                <span>Crop Advisor</span>
              </button>
              <button
                onClick={() => setActiveTab("about")}
                className={`px-4 py-1.5 rounded-full transition-all duration-150 cursor-pointer ${
                  activeTab === "about" 
                    ? "bg-white text-emerald-950 shadow-sm" 
                    : "text-stone-500 hover:text-stone-800"
                }`}
                id="tab-btn-about"
              >
                Helpline Info
              </button>
              <button
                onClick={() => setActiveTab("rsk")}
                className={`px-4 py-1.5 rounded-full transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "rsk" 
                    ? "bg-emerald-900 text-brand-cream shadow-sm" 
                    : "text-emerald-800/80 hover:text-emerald-950 hover:bg-emerald-50/50"
                }`}
                id="tab-btn-rsk"
              >
                <Users className="h-3.5 w-3.5" />
                <span>RSK Panel</span>
                {escalatedCases.filter(c => c.districtId === selectedDistrictId && c.status === "Open").length > 0 && (
                  <span className="bg-amber-500 text-slate-950 text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-black tracking-normal scale-90 shrink-0">
                    {escalatedCases.filter(c => c.districtId === selectedDistrictId && c.status === "Open").length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Auth error notification banner */}
      {authError && (
        <div className="bg-rose-50 border-b border-rose-200 px-6 py-4 animate-fade-in shrink-0" id="auth-error-banner">
          <div className="max-w-7xl mx-auto flex gap-3 items-start">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-rose-950 font-sans">Google Sign-In Alert</h4>
              <p className="text-xs text-rose-800 mt-1 font-medium leading-relaxed">{authError}</p>
            </div>
            <button 
              onClick={() => setAuthError(null)}
              className="text-xs font-mono font-bold text-rose-600 hover:text-rose-950 px-2.5 py-1 rounded border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer shrink-0"
              id="dismiss-auth-error-btn"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* 3. BENTO MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6" id="main-content-layout">

        {activeTab === "rsk" ? (
          /* RSK AGENT DASHBOARD */
          <div className="space-y-6 animate-fade-in" id="rsk-tab-grid">
            
            {/* AGENT DASHBOARD BANNER HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-4">
              <div>
                <span className="text-xs font-black text-emerald-800 tracking-widest uppercase mb-1 block font-mono">
                  Official RSK Agent Portal
                </span>
                <h2 className="text-3xl font-black text-stone-900 leading-tight">District Agronomist Dashboard</h2>
                <p className="text-stone-500 mt-1 text-sm">
                  Reviewing crop escalation tickets, diagnosing complex outbreaks, and dispatching expert treatment advisories to <strong className="text-emerald-950">{activeDistrict.name} District</strong>.
                </p>
              </div>
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-4 py-2 rounded-2xl border border-emerald-100 font-mono text-xs font-bold uppercase shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
                <span>Active Duty: Agent-72</span>
              </div>
            </div>

            {(() => {
              const districtCases = escalatedCases.filter(c => c.districtId === selectedDistrictId);
              
              // Filter based on search query and status tab
              const filteredCases = districtCases.filter(c => {
                const query = agentSearchQuery.toLowerCase().trim();
                const matchesSearch = !query ||
                  c.farmerName.toLowerCase().includes(query) ||
                  c.id.toLowerCase().includes(query) ||
                  c.village.toLowerCase().includes(query) ||
                  c.cropName.toLowerCase().includes(query) ||
                  c.diagnosis.disease_name.toLowerCase().includes(query);
                
                const matchesStatus = agentStatusFilter === "ALL" || c.status.toUpperCase() === agentStatusFilter.toUpperCase();
                return matchesSearch && matchesStatus;
              });

              // Select the first case if current selectedCaseId is not valid or null
              const activeCase = filteredCases.find(c => c.id === selectedCaseId) || filteredCases[0] || null;

              // Compute stats
              const totalCases = districtCases.length;
              const openCasesCount = districtCases.filter(c => c.status === "Open").length;
              const reviewCasesCount = districtCases.filter(c => c.status === "In Review").length;
              const closedCasesCount = districtCases.filter(c => c.status === "Closed" || c.status === "Responded").length;

              const highSeverityCount = districtCases.filter(c => c.diagnosis.severity === "High").length;
              const medSeverityCount = districtCases.filter(c => c.diagnosis.severity === "Medium").length;
              const lowSeverityCount = districtCases.filter(c => c.diagnosis.severity === "Low").length;

              // Top concern
              const counts: Record<string, number> = {};
              districtCases.forEach(c => {
                const name = c.diagnosis.disease_name;
                counts[name] = (counts[name] || 0) + 1;
              });
              let mostCommon = "No escalated cases";
              let max = 0;
              Object.entries(counts).forEach(([name, val]) => {
                if (val > max) {
                  max = val;
                  mostCommon = name;
                }
              });

              return (
                <div className="space-y-6">
                  {/* SUCCESS MESSAGES */}
                  {agentSuccessMessage && (
                    <div className="bg-emerald-600 text-white p-4 rounded-2xl flex items-center gap-3 shadow-md border border-emerald-500 animate-bounce" id="agent-success-banner">
                      <CheckCircle className="h-5 w-5 shrink-0" />
                      <div className="text-sm font-bold">{agentSuccessMessage}</div>
                      <button onClick={() => setAgentSuccessMessage(null)} className="ml-auto text-white hover:text-emerald-200 font-bold text-xs px-2 py-1 bg-white/10 rounded-lg">Dismiss</button>
                    </div>
                  )}

                  {/* SUPABASE CONFIGURATION HELPER BANNER */}
                  {supabaseTablesNotCreated && (
                    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-blue-200 rounded-2xl p-5 shadow-sm space-y-4 animate-fade-in" id="supabase-setup-helper-banner">
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 bg-blue-600 text-white rounded-xl shrink-0">
                          <Database className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">🔌 Supabase Connected! SQL Setup Required</h4>
                          <p className="text-xs text-slate-600 mt-1">
                            Your Kisan Alert application is connected to Supabase project <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px] font-bold text-indigo-700">ocempzeupuhgtqwhjmtx</code>! However, the database tables do not exist yet. Please run this SQL script in your Supabase SQL Editor.
                          </p>
                        </div>
                      </div>
                      
                      <div className="bg-slate-950 rounded-xl p-4 relative font-mono text-xs text-emerald-400 overflow-x-auto max-h-60 shadow-inner">
                        <div className="absolute top-3 right-3 flex items-center gap-2">
                          <button
                            onClick={() => {
                              const sql = `-- Create users table\nCREATE TABLE IF NOT EXISTS users (\n  id SERIAL PRIMARY KEY,\n  uid TEXT NOT NULL UNIQUE,\n  email TEXT NOT NULL,\n  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n);\n\n-- Create escalated_cases table\nCREATE TABLE IF NOT EXISTS escalated_cases (\n  id TEXT PRIMARY KEY,\n  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,\n  district_id TEXT NOT NULL,\n  farmer_name TEXT NOT NULL,\n  village TEXT NOT NULL,\n  crop_name TEXT NOT NULL,\n  photo_thumbnail TEXT NOT NULL,\n  diagnosis JSONB NOT NULL,\n  symptom_description TEXT NOT NULL,\n  voice_transcript TEXT,\n  submission_time TEXT NOT NULL,\n  status TEXT NOT NULL DEFAULT 'Open',\n  advisory_response TEXT NOT NULL DEFAULT '',\n  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n);`;
                              navigator.clipboard.writeText(sql);
                              alert("SQL Schema copied to clipboard!");
                            }}
                            className="bg-white/10 hover:bg-white/20 text-white rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <span>Copy SQL Schema</span>
                          </button>
                        </div>
                        <pre className="text-[11px] leading-relaxed text-left">
{`-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create escalated_cases table
CREATE TABLE IF NOT EXISTS escalated_cases (
  id TEXT PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  district_id TEXT NOT NULL,
  farmer_name TEXT NOT NULL,
  village TEXT NOT NULL,
  crop_name TEXT NOT NULL,
  photo_thumbnail TEXT NOT NULL,
  diagnosis JSONB NOT NULL,
  symptom_description TEXT NOT NULL,
  voice_transcript TEXT,
  submission_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Open',
  advisory_response TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`}
                        </pre>
                      </div>
                      <div className="text-[11px] text-slate-500 italic">
                        Once you run this query in your Supabase Dashboard, refresh this page to instantly synchronize real-time diagnostics!
                      </div>
                    </div>
                  )}

                  {/* THREE ANALYTICS CARDS */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="rsk-analytics-grid">
                    {/* CARD 1: TOTAL CASES */}
                    <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm flex items-start gap-4">
                      <div className="p-3 bg-emerald-50 rounded-xl text-emerald-800 border border-emerald-100 shrink-0">
                        <ClipboardList className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-mono font-black text-stone-400 uppercase tracking-widest">District Caseload</p>
                        <h4 className="text-2xl font-black text-stone-800 mt-1">{totalCases} Escalated Case{totalCases === 1 ? "" : "s"}</h4>
                        <div className="flex gap-2 text-[11px] font-semibold text-stone-500 mt-1">
                          <span className="text-red-600">{openCasesCount} Open</span>
                          <span>•</span>
                          <span className="text-amber-600">{reviewCasesCount} In Review</span>
                          <span>•</span>
                          <span className="text-emerald-700">{closedCasesCount} Resolved</span>
                        </div>
                      </div>
                    </div>

                    {/* CARD 2: SEVERITY COUNTS */}
                    <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm flex items-start gap-4">
                      <div className="p-3 bg-red-50 rounded-xl text-red-700 border border-red-100 shrink-0">
                        <AlertTriangle className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-mono font-black text-stone-400 uppercase tracking-widest">Outbreak Severity</p>
                        <h4 className="text-2xl font-black text-stone-800 mt-1">Threat Metrics</h4>
                        <div className="flex items-center gap-3 text-xs mt-1.5">
                          <div className="flex items-center gap-1 bg-red-50 text-red-800 px-1.5 py-0.5 rounded font-bold text-[10px]">
                            High: {highSeverityCount}
                          </div>
                          <div className="flex items-center gap-1 bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded font-bold text-[10px]">
                            Med: {medSeverityCount}
                          </div>
                          <div className="flex items-center gap-1 bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded font-bold text-[10px]">
                            Low: {lowSeverityCount}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CARD 3: MOST COMMON DIAGNOSIS */}
                    <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm flex items-start gap-4">
                      <div className="p-3 bg-amber-50 rounded-xl text-amber-800 border border-amber-100 shrink-0">
                        <TrendingUp className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-mono font-black text-stone-400 uppercase tracking-widest">Top Outbreak Hazard</p>
                        <h4 className="text-base font-black text-stone-800 mt-1.5 line-clamp-1 uppercase tracking-tight">{mostCommon}</h4>
                        <p className="text-xs text-stone-500 mt-0.5">
                          {max > 0 ? `${max} active report${max === 1 ? "" : "s"} in the region` : "No current threat outbreaks"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* TWO PANEL SPLIT LAYOUT (LIST & DETAIL) */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="rsk-dashboard-main-split">
                    
                    {/* LEFT COLUMN: ACTIVE CASES LIST (5/12 span) */}
                    <div className="lg:col-span-5 bg-stone-100 rounded-3xl border border-stone-200 p-4 shadow-sm space-y-4 max-h-[820px] overflow-y-auto flex flex-col" id="rsk-cases-list-panel">
                      
                      {/* Search and Filters inside List Panel */}
                      <div className="space-y-3 bg-white p-3.5 rounded-2xl border border-stone-200/60 shadow-xs shrink-0">
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                          <input
                            type="text"
                            placeholder="Search by farmer name, case ID, crop or disease..."
                            value={agentSearchQuery}
                            onChange={(e) => setAgentSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:ring-1 focus:ring-emerald-800 focus:outline-none"
                            id="agent-search-input"
                          />
                        </div>

                        {/* Status Filter Tabs */}
                        <div className="flex flex-wrap gap-1 bg-stone-100 p-1 rounded-lg text-[10px] font-bold">
                          {["ALL", "OPEN", "IN REVIEW", "RESPONDED", "CLOSED"].map((filter) => (
                            <button
                              key={filter}
                              onClick={() => setAgentStatusFilter(filter)}
                              className={`flex-1 py-1 rounded text-center cursor-pointer uppercase transition-all ${
                                agentStatusFilter === filter
                                  ? "bg-emerald-950 text-white shadow-xs"
                                  : "text-stone-500 hover:text-stone-800"
                              }`}
                            >
                              {filter}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Case Cards List */}
                      <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                        {filteredCases.length === 0 ? (
                          <div className="text-center py-12 bg-white rounded-2xl border border-stone-200 p-6">
                            <ClipboardList className="h-10 w-10 text-stone-300 mx-auto mb-2" />
                            <h5 className="font-bold text-stone-700 text-sm">No Tickets Found</h5>
                            <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto">
                              No cases matching "{agentSearchQuery}" or "{agentStatusFilter}" exist in this district.
                            </p>
                          </div>
                        ) : (
                          filteredCases.map((c) => {
                            const isSelected = activeCase && activeCase.id === c.id;
                            
                            // Check if SLA is breached (Open & > 24 hours)
                            const timeDiffMs = new Date().getTime() - new Date(c.submissionTime).getTime();
                            const hrsDiff = timeDiffMs / (1000 * 60 * 60);
                            const isSlaBreached = c.status === "Open" && hrsDiff > 24;

                            // Formatted time ago
                            const formatTime = (isoStr: string) => {
                              const d = new Date(isoStr);
                              return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" }) + ", " + 
                                     d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
                            };

                            return (
                              <div
                                key={c.id}
                                onClick={() => setSelectedCaseId(c.id)}
                                className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                                  isSelected 
                                    ? "bg-emerald-50 border-emerald-600 shadow-md ring-1 ring-emerald-600/30" 
                                    : "bg-white border-stone-200 hover:border-stone-400 shadow-xs"
                                }`}
                              >
                                {isSlaBreached && (
                                  <span className="absolute top-3 right-3 bg-red-600 text-white font-mono font-black text-[9px] px-2 py-0.5 rounded uppercase tracking-widest animate-pulse border border-red-500 shadow-xs" id={`sla-tag-${c.id}`}>
                                    {"⚠️ SLA Breach (>24h)"}
                                  </span>
                                )}

                                <div className="flex items-start gap-3">
                                  {/* Small Image Thumbnail */}
                                  <img 
                                    src={c.photoThumbnail} 
                                    alt={c.cropName} 
                                    className="w-12 h-12 rounded-xl object-cover shrink-0 border border-stone-200" 
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono text-[10px] text-stone-400 font-bold uppercase">{c.id}</span>
                                      <span className="text-stone-300">•</span>
                                      <span className="text-xs text-stone-500 font-bold">{c.village}</span>
                                    </div>
                                    <h4 className="font-black text-sm text-stone-900 mt-0.5 truncate leading-tight">
                                      {c.farmerName}
                                    </h4>
                                    
                                    <div className="flex items-center gap-1.5 mt-1">
                                      {/* Crop Name Badge */}
                                      <span className="bg-stone-100 text-stone-700 text-[9px] font-black uppercase px-2 py-0.5 rounded">
                                        {c.cropName}
                                      </span>
                                      
                                      {/* Severity badge */}
                                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                                        c.diagnosis.severity === "High" 
                                          ? "bg-red-500/10 text-red-700" 
                                          : c.diagnosis.severity === "Medium"
                                            ? "bg-amber-500/10 text-amber-700"
                                            : "bg-emerald-500/10 text-emerald-700"
                                      }`}>
                                        {c.diagnosis.severity}
                                      </span>

                                      {/* Status Badge */}
                                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                                        c.status === "Open" 
                                          ? "bg-rose-100 text-rose-700 border border-rose-200" 
                                          : c.status === "In Review"
                                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                                            : c.status === "Responded"
                                              ? "bg-blue-100 text-blue-700 border border-blue-200"
                                              : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                      }`}>
                                        {c.status}
                                      </span>
                                    </div>

                                    {/* Brief AI Disease preview */}
                                    <p className="text-xs font-medium text-stone-700 mt-2 line-clamp-1 italic bg-stone-50 p-1.5 rounded border border-stone-100">
                                      {c.diagnosis.disease_name}
                                    </p>

                                    {/* Submission time */}
                                    <div className="flex items-center gap-1 text-[10px] text-stone-400 mt-2 font-mono">
                                      <Clock className="h-3 w-3 shrink-0" />
                                      <span>Submitted: {formatTime(c.submissionTime)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* RIGHT COLUMN: DETAILED CASE PANEL (7/12 span) */}
                    <div className="lg:col-span-7 bg-white rounded-3xl border border-stone-200 p-6 shadow-sm min-h-[500px]" id="rsk-case-detail-panel">
                      {!activeCase ? (
                        <div className="flex flex-col items-center justify-center text-center h-full py-16">
                          <div className="p-4 bg-stone-50 rounded-full border border-stone-100 mb-3 text-stone-300">
                            <ClipboardList className="h-12 w-12" />
                          </div>
                          <h4 className="font-black text-stone-800 text-lg uppercase tracking-tight">No Ticket Selected</h4>
                          <p className="text-stone-400 text-xs mt-1 max-w-sm">
                            Please select an escalated ticket from the left panel to inspect diagnosis parameters, listen to recorded audio files, and write agronomist prescription replies.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          
                          {/* DETAIL HEADER */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-5">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-mono font-bold text-stone-400 tracking-wider uppercase bg-stone-100 px-2.5 py-0.5 rounded">
                                  {activeCase.id}
                                </span>
                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                  activeCase.diagnosis.severity === "High" 
                                    ? "bg-red-500/10 text-red-700 border border-red-200" 
                                    : "bg-amber-500/10 text-amber-700 border border-amber-200"
                                }`}>
                                  {activeCase.diagnosis.severity} Severity
                                </span>
                              </div>
                              <h3 className="text-2xl font-black text-stone-900 mt-1 uppercase tracking-tight">
                                {activeCase.farmerName}
                              </h3>
                              <p className="text-xs text-stone-500 font-mono">
                                Location: {activeCase.village} village, {activeDistrict.name} District
                              </p>
                            </div>

                            {/* Status controls */}
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-mono font-bold text-stone-400 uppercase">Case Status</label>
                              <select
                                value={activeCase.status}
                                onChange={(e) => {
                                  const val = e.target.value as any;
                                  const updatedCase = { ...activeCase, status: val };
                                  setEscalatedCases(prev => prev.map(c => c.id === activeCase.id ? updatedCase : c));
                                  fetch(`${BACKEND_URL}/api/cases`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify(updatedCase)
                                  }).catch(err => console.error("Cloud SQL status update failed:", err));
                                }}
                                className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-bold font-sans text-stone-800 focus:ring-1 focus:ring-emerald-800 focus:outline-none"
                                id={`status-selector-${activeCase.id}`}
                              >
                                <option value="Open">🔴 Open (Awaiting response)</option>
                                <option value="In Review">🟡 In Review</option>
                                <option value="Responded">🔵 Responded</option>
                                <option value="Closed">🟢 Closed (Resolved)</option>
                              </select>
                            </div>
                          </div>

                          {/* ACTION BUTTON PANEL (e.g. Call Farmer) */}
                          <div className="bg-stone-50 rounded-2xl border border-stone-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-emerald-800 flex items-center justify-center text-white shrink-0 shadow-sm">
                                <Users className="h-4.5 w-4.5" />
                              </div>
                              <div>
                                <h5 className="font-bold text-stone-800 text-xs">Direct Farmer Communication Channel</h5>
                                <p className="text-[11px] text-stone-500">Call farmer immediately or dispatch text messages directly.</p>
                              </div>
                            </div>
                            
                            <button
                              onClick={() => handleStartCall(activeCase)}
                              className="px-4 py-2 bg-emerald-900 text-brand-cream hover:bg-emerald-800 text-xs font-black rounded-xl shadow-xs hover:shadow transition-all flex items-center gap-1.5 shrink-0 touch-target font-sans"
                            >
                              <PhoneCall className="h-4 w-4" />
                              <span>Call {activeCase.farmerName.split(" ")[0]}</span>
                            </button>
                          </div>

                          {/* FARMER SUBMISSION BODY (Image & text notes) */}
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 bg-stone-50/50 p-4 rounded-3xl border border-stone-100">
                            
                            {/* Photo specimen */}
                            <div className="col-span-12 md:col-span-5">
                              <span className="text-[10px] font-mono font-black text-stone-400 uppercase tracking-widest block mb-1.5">Submitted Specimen</span>
                              <div className="relative rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 group shadow-inner">
                                <img 
                                  src={activeCase.photoThumbnail} 
                                  alt="Specimen" 
                                  className="w-full h-40 object-cover" 
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-x-0 bottom-0 bg-stone-900/80 p-2 text-[9px] font-mono text-center text-stone-300 font-bold uppercase tracking-wider">
                                  Captured on Android Device
                                </div>
                              </div>
                            </div>

                            {/* Farmer's written description & voice transcript */}
                            <div className="col-span-12 md:col-span-7 flex flex-col justify-between">
                              <div className="space-y-3">
                                <div>
                                  <span className="text-[10px] font-mono font-black text-stone-400 uppercase tracking-widest block">Farmer Description</span>
                                  <p className="text-xs text-stone-700 leading-relaxed font-semibold mt-1 bg-white p-2.5 rounded-xl border border-stone-200 shadow-2xs">
                                    "{activeCase.symptomDescription}"
                                  </p>
                                </div>

                                {activeCase.voiceTranscript && (
                                  <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-2xl">
                                    <div className="flex items-center gap-1 text-amber-900 font-black text-[9px] uppercase tracking-wider">
                                      <Volume2 className="h-3.5 w-3.5 text-amber-700 animate-pulse shrink-0" />
                                      <span>Recorded Voice Note Transcript</span>
                                    </div>
                                    <p className="text-xs text-stone-700 leading-relaxed italic mt-1 font-medium">
                                      "{activeCase.voiceTranscript}"
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* AI DIAGNOSIS METRICS */}
                          <div className="bg-emerald-50/20 rounded-3xl border border-emerald-100 p-5 space-y-4">
                            <span className="text-[10px] font-mono font-black text-emerald-800 uppercase tracking-widest block">AI Pathologist Diagnosis Parameters</span>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-xs text-stone-400 font-mono uppercase tracking-wider">Disease Name</h4>
                                <p className="font-black text-emerald-950 text-base mt-0.5">{activeCase.diagnosis.disease_name}</p>
                                <p className="text-xs text-emerald-800/80 font-bold font-sans mt-0.5">{activeCase.diagnosis.disease_name_local}</p>
                              </div>
                              
                              <div>
                                <h4 className="text-xs text-stone-400 font-mono uppercase tracking-wider">Model Confidence</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="h-3 bg-stone-100 rounded-full flex-1 overflow-hidden border border-stone-200">
                                    <div 
                                      className={`h-full rounded-full ${
                                        activeCase.diagnosis.confidence_score >= 80 
                                          ? "bg-emerald-600" 
                                          : activeCase.diagnosis.confidence_score >= 60
                                            ? "bg-amber-500"
                                            : "bg-orange-500"
                                      }`}
                                      style={{ width: `${activeCase.diagnosis.confidence_score}%` }}
                                    ></div>
                                  </div>
                                  <span className="font-mono text-xs font-black text-stone-800 shrink-0">{activeCase.diagnosis.confidence_score}%</span>
                                </div>
                              </div>
                            </div>

                            {activeCase.diagnosis.symptoms_observed && activeCase.diagnosis.symptoms_observed.length > 0 && (
                              <div className="pt-2 border-t border-emerald-100/50">
                                <h5 className="text-[10px] font-mono font-bold text-stone-400 uppercase tracking-wider">Observed Symptoms Checklist</h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2">
                                  {activeCase.diagnosis.symptoms_observed.map((sym, i) => (
                                    <div key={i} className="flex items-center gap-1.5 text-xs text-stone-700">
                                      <Check className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                                      <span>{sym}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* EXPERT PRESCRIPTION REPLY EDITOR */}
                          <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono font-black text-stone-400 uppercase tracking-widest block">Write Official Agronomist Advisory</span>
                              <span className="text-[10px] font-mono text-stone-400">Sent to farmer's mobile via local SMS</span>
                            </div>

                            <textarea
                              className="w-full p-4 border border-stone-200 rounded-2xl text-xs font-medium focus:ring-1 focus:ring-emerald-800 focus:outline-none bg-stone-50 min-h-[100px] leading-relaxed"
                              placeholder="Describe the official agronomist recommendation, chemical prescription (e.g. Copper Oxychloride, Carbendazim, Neem Kernel sprays), watering frequencies, or physical removal instructions..."
                              value={activeCase.advisoryResponse}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEscalatedCases(prev => prev.map(c => c.id === activeCase.id ? { ...c, advisoryResponse: val } : c));
                              }}
                              id={`advisory-text-editor-${activeCase.id}`}
                            />

                            <div className="flex justify-end gap-3">
                              <button
                                onClick={() => {
                                  const updatedCase = {
                                    ...activeCase,
                                    status: "Responded" as const,
                                    advisoryResponse: activeCase.advisoryResponse || "Please follow standard localized treatment guidelines."
                                  };
                                  setEscalatedCases(prev => prev.map(c => c.id === activeCase.id ? updatedCase : c));
                                  
                                  fetch(`${BACKEND_URL}/api/cases`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify(updatedCase)
                                  }).catch(err => console.error("Cloud SQL advisory dispatch sync failed:", err));

                                  setAgentSuccessMessage(`Official treatment advisory dispatched successfully to ${activeCase.farmerName} via automated SMS broadcast.`);
                                  setTimeout(() => setAgentSuccessMessage(null), 5000);
                                }}
                                className="px-5 py-2.5 bg-emerald-950 text-white hover:bg-emerald-900 text-xs font-black rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer touch-target"
                              >
                                <Send className="h-4 w-4" />
                                <span>Dispatch Official Advisory Response</span>
                              </button>
                            </div>
                          </div>

                        </div>
                      )}
                    </div>

                  </div>
                </div>
              );
            })()}
          </div>
        ) : activeTab === "about" ? (
          /* HELPLINE INFO & ADVISORY VIEW */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6" id="about-tab-grid">
            <div className="col-span-12 md:col-span-8 bg-white rounded-3xl border border-stone-200 p-6 md:p-8 shadow-sm space-y-6">
              <div>
                <span className="text-xs font-black text-emerald-800 tracking-widest uppercase mb-2 block">Krishi Help Desks</span>
                <h2 className="text-3xl font-black text-stone-900 leading-tight">National &amp; Regional Support</h2>
                <p className="text-stone-500 mt-2 text-sm leading-relaxed">
                  Indian farmers can get immediate human help by reaching out directly to regional scientific research centers, Rythu Seva Kendras (RSK), and state department helplines.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-emerald-900 text-sm">District Expert Center</h4>
                    <p className="text-xs text-stone-600 mt-1 font-mono">{activeDistrict.centerName}</p>
                    <p className="text-xs text-emerald-800 mt-1">Active District: {activeDistrict.name}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-emerald-100 flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-stone-700">{activeDistrict.helpline}</span>
                    <a 
                      href={`tel:${activeDistrict.helpline}`}
                      className="bg-emerald-800 text-white p-2 rounded-full hover:bg-emerald-700 transition-colors"
                      title="Call Helpline"
                    >
                      <PhoneCall className="h-4.5 w-4.5" />
                    </a>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-amber-900 text-sm">National Kisan Call Center (KCC)</h4>
                    <p className="text-xs text-stone-600 mt-1">Toll-free agricultural query resolution service, operated by the Ministry of Agriculture.</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-amber-200 flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-stone-700">1800-180-1551</span>
                    <a 
                      href="tel:18001801551"
                      className="bg-amber-700 text-white p-2 rounded-full hover:bg-amber-600 transition-colors"
                      title="Call KCC Helpline"
                    >
                      <PhoneCall className="h-4.5 w-4.5" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-stone-200">
                <h3 className="font-bold text-stone-900 mb-3 text-base">Tips for Crop Protection during Adverse Weather</h3>
                <ul className="space-y-3.5 text-sm text-stone-600">
                  <li className="flex gap-2 items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-2 shrink-0" />
                    <span><strong>Post-rain Scouting:</strong> Inspect crop foliage 24 to 48 hours after heavy rainfall. High moisture on leaves is the prime catalyst for spore germination in Rice Blast and Late Blight.</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-2 shrink-0" />
                    <span><strong>Balanced Nitrogen Usage:</strong> Avoid overuse of nitrogenous fertilizers (like urea) during warm humid weather, as succulent rapid growth is highly susceptible to pests.</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-2 shrink-0" />
                    <span><strong>Neem Seed Kernel Extract (NSKE):</strong> Apply 5% NSKE spray as an effective organic preventative measure against early sucking insects in cotton and vegetable crops.</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="col-span-12 md:col-span-4 space-y-6">
              {/* Regional Weather Widget (Part of Bento) */}
              <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm">
                <span className="text-xs font-mono font-bold text-stone-400 uppercase tracking-widest block mb-4">District Metrics</span>
                <h3 className="font-black text-emerald-950 text-xl font-serif mb-4">Today in {activeDistrict.name}</h3>
                
                <div className="grid grid-cols-2 gap-3" id="weather-metrics-bento">
                  <div className="bg-stone-50 rounded-2xl p-4.5 border border-stone-100 flex flex-col">
                    <Thermometer className="h-5 w-5 text-rose-500 mb-2" />
                    <span className="text-2xl font-black text-stone-800">
                      {liveWeatherForecast && liveWeatherForecast[0]
                        ? `${liveWeatherForecast[0].temp_c}°C`
                        : activeDistrict.weather.temperature}
                    </span>
                    <span className="text-[11px] text-stone-500 uppercase tracking-wider font-semibold font-mono mt-0.5">Air Temp</span>
                  </div>

                  <div className="bg-stone-50 rounded-2xl p-4.5 border border-stone-100 flex flex-col">
                    <CloudRain className="h-5 w-5 text-emerald-600 mb-2" />
                    <span className="text-2xl font-black text-stone-800">
                      {liveWeatherForecast && liveWeatherForecast[0]
                        ? (liveWeatherForecast[0].rain_mm > 0 ? `${liveWeatherForecast[0].rain_mm} mm` : "0%")
                        : activeDistrict.weather.rainChance}
                    </span>
                    <span className="text-[11px] text-stone-500 uppercase tracking-wider font-semibold font-mono mt-0.5">Rain Prob</span>
                  </div>

                  <div className="bg-stone-50 rounded-2xl p-4.5 border border-stone-100 flex flex-col">
                    <Droplet className="h-5 w-5 text-blue-500 mb-2" />
                    <span className="text-2xl font-black text-stone-800">
                      {liveWeatherForecast && liveWeatherForecast[0]
                        ? `${liveWeatherForecast[0].humidity_pct}%`
                        : activeDistrict.weather.humidity}
                    </span>
                    <span className="text-[11px] text-stone-500 uppercase tracking-wider font-semibold font-mono mt-0.5">Humidity</span>
                  </div>

                  <div className="bg-stone-50 rounded-2xl p-4.5 border border-stone-100 flex flex-col">
                    <Sprout className="h-5 w-5 text-emerald-700 mb-2" />
                    <span className="text-2xl font-black text-stone-800">{activeDistrict.weather.soilMoisture}</span>
                    <span className="text-[11px] text-stone-500 uppercase tracking-wider font-semibold font-mono mt-0.5">Soil Moist</span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs text-emerald-900 leading-relaxed">
                  <strong>IMD Weather Warning:</strong> Standard moisture levels are perfect for paddy fields, but keep drainage clear if rain threshold exceeds 50mm.
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === "alerts" ? (
          /* DRY-SPELL ALERTS VIEW */
          <div className="space-y-6 animate-fade-in" id="alerts-tab-grid">
            <div className="bg-white rounded-3xl border border-stone-200 p-6 md:p-8 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-6 mb-6">
                <div>
                  <span className="text-xs font-black text-rose-700 tracking-widest uppercase mb-1 block font-mono">District Risk Monitoring</span>
                  <h2 className="text-3xl font-black text-stone-900 leading-tight">Active Hazards &amp; Warnings</h2>
                  <p className="text-stone-500 mt-1 text-sm leading-relaxed">
                    Showing local crop, climate, and pest threat advisories active in <strong className="text-stone-800">{activeDistrict.name}, {activeDistrict.state}</strong>.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs bg-rose-50 text-rose-800 px-4 py-2.5 rounded-2xl border border-rose-100 font-semibold font-mono uppercase shrink-0">
                  <AlertTriangle className="h-4.5 w-4.5 text-rose-700 shrink-0 animate-pulse" />
                  <span>{activeDistrict.alerts?.length || 0} Critical Bulletin{activeDistrict.alerts?.length === 1 ? "" : "s"}</span>
                </div>
              </div>

              {/* Premium Climate, Soil & Satellite Telemetry Dashboard */}
              {(() => {
                const metrics = getDistrictPremiumMetrics(activeDistrict);
                if (liveWeatherForecast) {
                  metrics.weather_forecast_7day = liveWeatherForecast;
                }
                return (
                  <div className="mb-6 space-y-6" id="premium-telemetry-container">
                    
                    {/* Collapsible District Data Section */}
                    <div className="border border-stone-200 rounded-3xl p-5 bg-stone-50/40 animate-fade-in" id="collapsible-district-data">
                      <div 
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none"
                        onClick={() => setIsDistrictDetailsExpanded(!isDistrictDetailsExpanded)}
                        id="toggle-district-details"
                      >
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-emerald-800 tracking-widest uppercase font-mono block">Telemetry Data</span>
                          <h4 className="text-sm font-black text-stone-900 uppercase tracking-tight flex items-center gap-2">
                            🛰️ District Agro-Environmental Profile
                          </h4>
                          <p className="text-xs text-stone-500 font-semibold font-mono flex items-center gap-1.5 flex-wrap">
                            <span>{metrics.ndvi.label}</span>
                            <span className="text-stone-300">•</span>
                            <span>{metrics.soil.type}</span>
                            <span className="text-stone-300">•</span>
                            <span>Water table {metrics.groundwater_depth_m}m</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs bg-white text-stone-700 px-4 py-2 rounded-2xl border border-stone-200 font-black uppercase shrink-0 transition-all hover:bg-stone-50">
                          <span>{isDistrictDetailsExpanded ? "Hide details" : "View details"}</span>
                          {isDistrictDetailsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>

                      {isDistrictDetailsExpanded && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-5 pt-5 border-t border-stone-200/60 animate-fade-in" id="premium-telemetry-dashboard">
                          {/* NDVI Satellite Card */}
                          <div className="bg-white border border-stone-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                  <div className="p-2 bg-emerald-100 text-emerald-850 rounded-xl">
                                    <Sprout className="h-4 w-4" />
                                  </div>
                                  <span className="text-[11px] font-black uppercase tracking-wider text-stone-600 font-mono">Vegetation Health (NDVI)</span>
                                </div>
                                <span className="text-[9px] font-mono text-stone-400 font-semibold">{metrics.ndvi.source}</span>
                              </div>
                              <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-4xl font-black text-stone-900 tracking-tight">{metrics.ndvi.value}</span>
                                <span className="text-xs font-mono font-bold text-stone-500 uppercase">Index Score</span>
                              </div>
                              <div className="mb-4">
                                <div className="flex items-center justify-between text-[11px] mb-1 font-semibold">
                                  <span className="text-stone-500">Status: <strong className="text-stone-850">{metrics.ndvi.label}</strong></span>
                                  <span className="text-stone-400">Updated: {metrics.ndvi.last_updated}</span>
                                </div>
                                {/* Beautiful gauge progress bar */}
                                <div className="w-full h-2.5 bg-stone-200 rounded-full overflow-hidden flex">
                                  <div className="h-full bg-rose-500" style={{ width: "20%" }} title="Severe Stress (<0.2)" />
                                  <div className="h-full bg-amber-400 relative" style={{ width: "30%" }} title="Moderate Stress (0.2-0.5)">
                                    {metrics.ndvi.value <= 0.5 && metrics.ndvi.value >= 0.2 && (
                                      <div className="absolute right-0 top-0 bottom-0 w-1 bg-stone-950 animate-pulse" />
                                    )}
                                  </div>
                                  <div className="h-full bg-emerald-500 relative" style={{ width: "50%" }} title="Healthy Dense Veg (>0.5)">
                                    {metrics.ndvi.value > 0.5 && (
                                      <div className="absolute right-1/2 top-0 bottom-0 w-1 bg-stone-950 animate-pulse" />
                                    )}
                                  </div>
                                </div>
                                <div className="flex justify-between text-[8px] font-mono font-bold text-stone-400 mt-1">
                                  <span>0.0 (SOIL)</span>
                                  <span>0.5 (STRESS)</span>
                                  <span>1.0 (DENSE)</span>
                                </div>
                              </div>
                            </div>
                            <p className="text-[11px] text-stone-500 leading-normal">
                              Satellite sensor data signals active foliage stress. Values below 0.5 warn of drying leaf cells.
                            </p>
                          </div>

                          {/* Soil Health Card */}
                          <div className="bg-white border border-stone-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-4">
                                <div className="p-2 bg-amber-100 text-amber-855 rounded-xl">
                                  <Info className="h-4 w-4" />
                                </div>
                                <span className="text-[11px] font-black uppercase tracking-wider text-stone-600 font-mono">Soil Chemistry profile</span>
                              </div>
                              <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="bg-white border border-stone-200/60 rounded-2xl p-2.5 shadow-xs">
                                  <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider font-mono block">Soil Classification</span>
                                  <span className="text-xs font-black text-stone-850 block truncate">{metrics.soil.type}</span>
                                </div>
                                <div className="bg-white border border-stone-200/60 rounded-2xl p-2.5 shadow-xs">
                                  <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider font-mono block">pH Scale (Acidity)</span>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-xs font-black text-stone-800">{metrics.soil.ph}</span>
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-100 uppercase scale-90">
                                      {metrics.soil.ph < 6.0 ? "Acidic" : metrics.soil.ph > 7.2 ? "Alkaline" : "Neutral"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Nutrient matrix NPK */}
                              <div>
                                <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest font-mono block mb-2">Macro-Nutrient Index (NPK)</span>
                                <div className="grid grid-cols-3 gap-2">
                                  <div className="bg-white border border-stone-200/60 rounded-xl p-2 text-center shadow-xs">
                                    <span className="text-[9px] font-bold text-stone-400 block font-mono">Nitrogen (N)</span>
                                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full mt-1 inline-block ${metrics.soil.n_level === "High" ? "bg-emerald-50 text-emerald-800 border border-emerald-100" : metrics.soil.n_level === "Medium" ? "bg-amber-50 text-amber-800 border border-amber-100" : "bg-rose-50 text-rose-800 border border-rose-100"}`}>
                                      {metrics.soil.n_level}
                                    </span>
                                  </div>
                                  <div className="bg-white border border-stone-200/60 rounded-xl p-2 text-center shadow-xs">
                                    <span className="text-[9px] font-bold text-stone-400 block font-mono">Phosphorus (P)</span>
                                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full mt-1 inline-block ${metrics.soil.p_level === "High" ? "bg-emerald-50 text-emerald-800 border border-emerald-100" : metrics.soil.p_level === "Medium" ? "bg-amber-50 text-amber-800 border border-amber-100" : "bg-rose-50 text-rose-800 border border-rose-100"}`}>
                                      {metrics.soil.p_level}
                                    </span>
                                  </div>
                                  <div className="bg-white border border-stone-200/60 rounded-xl p-2 text-center shadow-xs">
                                    <span className="text-[9px] font-bold text-stone-400 block font-mono">Potassium (K)</span>
                                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full mt-1 inline-block ${metrics.soil.k_level === "High" ? "bg-emerald-50 text-emerald-800 border border-emerald-100" : metrics.soil.k_level === "Medium" ? "bg-amber-50 text-amber-800 border border-amber-100" : "bg-rose-50 text-rose-800 border border-rose-100"}`}>
                                      {metrics.soil.k_level}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <p className="text-[11px] text-stone-500 leading-normal mt-3">
                              Soil nutrient profile guides fertilization. Crop health heavily correlates with balanced pH levels.
                            </p>
                          </div>

                          {/* Hydrology & Aquifer Depth Card */}
                          <div className="bg-white border border-stone-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-4">
                                <div className="p-2 bg-blue-100 text-blue-800 rounded-xl">
                                  <Droplet className="h-4 w-4" />
                                </div>
                                <span className="text-[11px] font-black uppercase tracking-wider text-stone-600 font-mono">Sub-Surface Hydrology</span>
                              </div>
                              <div className="flex items-baseline gap-1.5 mb-2">
                                <span className="text-4xl font-black text-stone-900 tracking-tight">{metrics.groundwater_depth_m}m</span>
                                <span className="text-xs font-mono font-bold text-stone-500 uppercase">Water-Table Depth</span>
                              </div>
                              <div className="bg-stone-50 border border-stone-150 rounded-2xl p-3 mb-3">
                                <div className="flex justify-between items-center text-[10px] mb-2 font-semibold">
                                  <span className="text-stone-500">Crop Season: <strong className="text-stone-850">{metrics.season} (Rain-fed)</strong></span>
                                  <span className="text-stone-400">Safe Limit: &lt;10m</span>
                                </div>
                                {/* Hydro depth graphic representation */}
                                <div className="relative w-full h-12 bg-stone-100 rounded-xl overflow-hidden border border-stone-200 flex flex-col justify-end">
                                  <div className="absolute top-0 left-0 right-0 h-4 bg-amber-500/10 border-b border-stone-200 flex items-center justify-center text-[8px] font-mono text-stone-400 font-bold">
                                    Dry Soil Zone
                                  </div>
                                  <div 
                                    className="bg-blue-100 border-t border-blue-400 w-full transition-all duration-300"
                                    style={{ height: `${Math.max(10, 100 - (metrics.groundwater_depth_m * 9))}%` }}
                                  >
                                    <div className="h-full w-full bg-blue-500/10 flex items-center justify-center text-[8px] font-mono text-blue-800 font-extrabold animate-pulse">
                                      Aquifer Table
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <p className="text-[11px] text-stone-500 leading-normal">
                              Groundwater depth below 8m indicates rising irrigation dependency. Maintain micro-drip networks.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 7-Day Micro-climate Weather Forecast */}
                    <div className="bg-stone-50 border border-stone-200 rounded-3xl p-4 shadow-inner" id="seven-day-forecast-strip">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-blue-100 text-blue-800 rounded-lg">
                            <CloudRain className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-xs font-black uppercase tracking-wider text-stone-600 font-mono">7-Day Local Weather Forecast</span>
                        </div>
                        {liveWeatherForecast && (
                          <span className="text-[9px] font-black uppercase font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 animate-pulse">
                            ● Live API
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                        {metrics.weather_forecast_7day.map((day: any) => {
                          const dateObj = new Date(day.date);
                          const weekdayStr = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                          const isRainy = day.rain_mm > 0;

                          return (
                            <div 
                              key={day.date} 
                              className={`bg-white border rounded-2xl p-2.5 text-center flex flex-col justify-center items-center shadow-xs transition-all duration-150 ${isRainy ? "border-blue-200 bg-blue-50/5" : "border-stone-200"}`}
                            >
                              <span className="text-[10px] font-black text-stone-500 uppercase tracking-wider font-mono">{weekdayStr}</span>
                              
                              <div className="flex items-center gap-1 my-1">
                                {isRainy ? (
                                  <div className="text-blue-600 flex items-center gap-0.5" title={`${day.rain_mm} mm rain`}>
                                    <Droplet className="h-3.5 w-3.5 fill-blue-500 text-blue-500" />
                                    <span className="text-[9px] font-black font-mono">{day.rain_mm}mm</span>
                                  </div>
                                ) : (
                                  <div className="text-amber-500 flex items-center justify-center">
                                    <Thermometer className="h-3.5 w-3.5" />
                                  </div>
                                )}
                              </div>

                              <span className="text-xs font-black text-stone-800 font-mono">{day.temp_c}°C</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="mb-4">
                <h3 className="text-sm font-black text-stone-800 uppercase tracking-wider font-mono flex items-center gap-2">
                  <span>⚠️</span> Priority Advisories &amp; Hazard Bulletins
                </h3>
              </div>

              {!activeDistrict.alerts || activeDistrict.alerts.length === 0 ? (
                <div className="text-center py-12 px-4 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                  <CheckCircle className="h-10 w-10 text-emerald-600 mx-auto mb-3" />
                  <h3 className="font-bold text-stone-850 text-base">All Clear in {activeDistrict.name}</h3>
                  <p className="text-stone-500 text-xs mt-1 max-w-md mx-auto">
                    No active dry spells, frost, floods, or high-risk pest infestations are currently flagged for this district by our Krishi offices.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="district-hazard-bulletins">
                  {activeDistrict.alerts.map((alert: any) => {
                    const isHigh = alert.severity === "High";
                    const isMedium = alert.severity === "Medium";
                    
                    let bgClass = "bg-emerald-50/20 border-emerald-100 text-emerald-900";
                    let badgeClass = "bg-emerald-100 text-emerald-850 border-emerald-200";
                    let actionBg = "bg-emerald-50/50 border-emerald-150";
                    let iconColor = "text-emerald-700";

                    if (isHigh) {
                      bgClass = "bg-rose-50/30 border-rose-150";
                      badgeClass = "bg-rose-100 text-rose-850 border-rose-200";
                      actionBg = "bg-rose-50/60 border-rose-150";
                      iconColor = "text-rose-700";
                    } else if (isMedium) {
                      bgClass = "bg-amber-50/30 border-amber-150";
                      badgeClass = "bg-amber-105 text-amber-850 border-amber-200";
                      actionBg = "bg-amber-50/60 border-amber-150";
                      iconColor = "text-amber-700";
                    }

                    let AlertIcon = AlertCircle;
                    let typeLabel = "General Alert";
                    if (alert.type === "dry_spell") {
                      AlertIcon = Droplet;
                      typeLabel = "Dry-Spell Hazard";
                    } else if (alert.type === "frost") {
                      AlertIcon = Snowflake;
                      typeLabel = "Frost Threat";
                    } else if (alert.type === "flood") {
                      AlertIcon = CloudRain;
                      typeLabel = "Flood Danger";
                    } else if (alert.type === "pest_risk") {
                      AlertIcon = ShieldAlert;
                      typeLabel = "Pest Risk Warning";
                    }

                    const delivery = deliveryStatuses[alert.id] || { status: "idle" };
                    const phoneValue = phoneNumbers[alert.id] || "";

                    return (
                      <div 
                        key={alert.id} 
                        className={`border rounded-3xl p-5 md:p-6 shadow-sm flex flex-col justify-between transition-all duration-200 hover:shadow-md ${bgClass}`}
                        id={`alert-card-${alert.id}`}
                      >
                        <div>
                          {/* Alert Card Header */}
                          <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="flex items-center gap-2.5">
                              <div className={`p-2.5 rounded-2xl bg-white shadow-sm border border-stone-200 ${iconColor}`}>
                                <AlertIcon className="h-5 w-5" />
                              </div>
                              <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-stone-500 block font-mono">
                                  {typeLabel}
                                </span>
                                <h3 className="font-black text-stone-900 text-base uppercase tracking-tight">
                                  {alert.affectedCrop} Crop Advisory
                                </h3>
                              </div>
                            </div>

                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider shrink-0 ${badgeClass}`}>
                              {alert.severity} Risk
                            </span>
                          </div>

                          {/* Message Body */}
                          <div className="my-3">
                            <p className="text-xs text-stone-700 leading-relaxed bg-white/70 backdrop-blur-sm p-4 rounded-2xl border border-stone-200/50 shadow-inner">
                              {alert.messageEn}
                            </p>
                          </div>

                          {/* Action Items Box */}
                          <div className={`p-4 rounded-2xl border mb-5 ${actionBg}`}>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 font-mono block mb-1">
                              Immediate Action Steps:
                            </span>
                            <p className="text-xs text-stone-900 font-bold leading-relaxed">
                              {alert.recommendedAction}
                            </p>
                          </div>
                        </div>

                        {/* Interactive Sandbox Dispatch */}
                        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm mt-2">
                          <span className="text-[9px] font-black text-emerald-850 tracking-wider uppercase block mb-1.5 font-mono">
                            ⚙️ Real SMS Sandbox Dispatcher
                          </span>
                          <p className="text-[11px] text-stone-500 leading-normal mb-3">
                            Enter a 10-digit mobile number below to dispatch this safety directive to a real device.
                          </p>

                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="tel"
                              value={phoneValue}
                              onChange={(e) => handlePhoneChange(alert.id, e.target.value)}
                              placeholder="e.g. 9876543210"
                              maxLength={10}
                              className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-700 w-full"
                              id={`phone-input-${alert.id}`}
                            />
                            
                            <button
                              onClick={() => handleSendSMSAlert(alert)}
                              disabled={delivery.status === "sending"}
                              className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                                delivery.status === "sending"
                                  ? "bg-stone-400 cursor-not-allowed"
                                  : "bg-emerald-800 hover:bg-emerald-700 active:bg-emerald-900"
                              }`}
                              id={`send-btn-${alert.id}`}
                            >
                              {delivery.status === "sending" ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  <span>Sending...</span>
                                </>
                              ) : (
                                <>
                                  <Send className="h-3.5 w-3.5" />
                                  <span>Send Alert</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Delivery status output */}
                          {delivery.status !== "idle" && (
                            <div className="mt-2.5">
                              {delivery.status === "sent" ? (
                                <div className="bg-emerald-50 text-emerald-800 text-[11px] px-3 py-1.5 rounded-xl border border-emerald-150 flex flex-col gap-1 font-sans">
                                  <div className="flex items-center gap-1.5 font-semibold">
                                    <CheckCircle className="h-4 w-4 text-emerald-700 shrink-0" />
                                    <span>{delivery.message}</span>
                                  </div>
                                  {delivery.isSimulated && (
                                    <div className="text-[10px] text-emerald-700/80 border-t border-emerald-100/50 pt-1 mt-1 leading-normal">
                                      <p className="font-bold">💡 Sandbox Mode Notification:</p>
                                      <p>{delivery.details || "To send real SMS alerts to phone numbers, please configure the 'FAST2SMS_API_KEY' secret under the Settings menu."}</p>
                                    </div>
                                  )}
                                </div>
                              ) : delivery.status === "error" ? (
                                <div className="bg-rose-50 text-rose-800 text-[11px] px-3 py-1.5 rounded-xl border border-rose-150 flex flex-col gap-1 font-sans">
                                  <div className="flex items-center gap-1.5 font-semibold">
                                    <AlertTriangle className="h-4 w-4 text-rose-700 shrink-0" />
                                    <span>Failed to Deliver Alert</span>
                                  </div>
                                  <p className="text-[10px] text-rose-700/80 leading-normal pl-5">
                                    {delivery.message}
                                  </p>
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === "recommend" ? (
          /* CROP RECOMMENDATION ENGINE VIEW */
          <div className="space-y-6 animate-fade-in" id="recommendation-tab-grid">
            <div className="bg-white rounded-3xl border border-stone-200 p-6 md:p-8 shadow-sm">
              
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-6 mb-6">
                <div>
                  <span className="text-xs font-black text-emerald-800 tracking-widest uppercase mb-1 block font-mono">Agricultural Intelligence</span>
                  <h2 className="text-3xl font-black text-stone-900 leading-tight uppercase tracking-tight">Crop Recommendation Engine</h2>
                  <p className="text-stone-500 mt-1 text-sm leading-relaxed">
                    AI-powered predictions optimized for local soil, satellite vegetation health indices, and seasonal weather forecasts.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3" id="rec-cache-badge-container">
                    {recIsCached && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-800 border border-blue-200 uppercase tracking-widest font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                        Cached Result (24h)
                      </span>
                    )}
                    {recIsFallback && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-widest font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        Regional Backup Default
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={fetchRecommendations}
                  disabled={isRecLoading}
                  className="flex items-center gap-2 text-xs bg-emerald-50 text-emerald-950 px-4 py-2.5 rounded-2xl border border-emerald-200 font-black uppercase shrink-0 transition-all hover:bg-emerald-100 cursor-pointer disabled:opacity-50"
                  id="refresh-rec-btn"
                >
                  <RotateCcw className={`h-4 w-4 text-emerald-800 ${isRecLoading ? "animate-spin" : ""}`} />
                  <span>Re-run Analysis</span>
                </button>
              </div>

              {/* Loading State */}
              {isRecLoading ? (
                <div className="py-20 text-center space-y-4" id="rec-loading-view">
                  <div className="relative flex items-center justify-center w-20 h-20 mx-auto">
                    <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping"></div>
                    <div className="w-12 h-12 rounded-full bg-emerald-800 flex items-center justify-center text-white relative shadow-md">
                      <Sparkles className="h-6 w-6 animate-pulse" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-black text-stone-850 text-base uppercase font-mono">Running Soil &amp; Climate Intelligence...</h3>
                    <p className="text-stone-400 text-xs mt-1 max-w-sm mx-auto">
                      Querying local ground telemetry and executing expert agronomy rules via Gemini AI.
                    </p>
                  </div>
                </div>
              ) : recError ? (
                <div className="py-12 text-center space-y-4 bg-red-50 rounded-3xl border border-red-100" id="rec-error-view">
                  <AlertTriangle className="h-10 w-10 text-red-600 mx-auto" />
                  <div>
                    <h3 className="font-bold text-red-950 text-base">Recommendations Unavailable</h3>
                    <p className="text-red-800 text-xs mt-1 max-w-md mx-auto">{recError}</p>
                  </div>
                  <button
                    onClick={fetchRecommendations}
                    className="px-5 py-2.5 bg-red-800 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <div className="space-y-8" id="rec-results-view">
                  
                  {/* Current District Telemetry Input Panel */}
                  {recDistrictData && (
                    <div className="bg-stone-50 border border-stone-200 rounded-3xl p-5 shadow-inner" id="rec-telemetry-panel">
                      <h3 className="text-xs font-black text-stone-500 uppercase tracking-wider font-mono flex items-center gap-2 mb-4">
                        <span>🛰️</span> Analyzed Ground Telemetry &amp; Satellite Parameters
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-stone-700">
                        <div className="bg-white p-3.5 rounded-2xl border border-stone-150 shadow-xs">
                          <span className="text-[10px] uppercase font-mono text-stone-400 block mb-0.5">District</span>
                          <span className="text-base font-black text-stone-900">{recDistrictData.district}, {recDistrictData.state}</span>
                        </div>
                        <div className="bg-white p-3.5 rounded-2xl border border-stone-150 shadow-xs">
                          <span className="text-[10px] uppercase font-mono text-stone-400 block mb-0.5">Vegetation (NDVI)</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-base font-black text-stone-900">{recDistrictData.ndvi?.value}</span>
                            <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-bold">{recDistrictData.ndvi?.label}</span>
                          </div>
                        </div>
                        <div className="bg-white p-3.5 rounded-2xl border border-stone-150 shadow-xs">
                          <span className="text-[10px] uppercase font-mono text-stone-400 block mb-0.5">Soil Profile</span>
                          <span className="text-base font-black text-stone-900 block truncate">{recDistrictData.soil?.type}</span>
                          <span className="text-[9px] text-stone-400 font-mono">pH: {recDistrictData.soil?.ph} | NPK: {recDistrictData.soil?.n_level}/{recDistrictData.soil?.p_level}/{recDistrictData.soil?.k_level}</span>
                        </div>
                        <div className="bg-white p-3.5 rounded-2xl border border-stone-150 shadow-xs">
                          <span className="text-[10px] uppercase font-mono text-stone-400 block mb-0.5">Water Table / Season</span>
                          <span className="text-base font-black text-stone-900 block">{recDistrictData.groundwater_depth_m}m depth</span>
                          <span className="text-[9px] text-stone-400 font-mono">Upcoming: {recDistrictData.season}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Compare Toggle */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-emerald-50/40 border border-emerald-100/60 p-4 rounded-3xl" id="compare-toggle-bar">
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-black text-emerald-950 uppercase tracking-tight">Compare Recommended Crops</h4>
                      <p className="text-stone-500 text-xs">Select any two crop recommendation cards to analyze key agronomic attributes side-by-side.</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedCompareCrops([]);
                      }}
                      className="px-4 py-2 bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer hover:bg-emerald-700"
                      id="reset-compare-btn"
                    >
                      Reset Selection ({selectedCompareCrops.length}/2)
                    </button>
                  </div>

                  {/* Recommendations Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="rec-cards-grid">
                    {recommendations.map((crop) => {
                      const isSelected = selectedCompareCrops.includes(crop.name);
                      const isLimitReached = selectedCompareCrops.length >= 2;

                      const handleSelectCard = () => {
                        if (isSelected) {
                          setSelectedCompareCrops(selectedCompareCrops.filter(name => name !== crop.name));
                        } else {
                          if (isLimitReached) {
                            setSelectedCompareCrops([selectedCompareCrops[1], crop.name]);
                          } else {
                            setSelectedCompareCrops([...selectedCompareCrops, crop.name]);
                          }
                        }
                      };

                      return (
                        <div 
                          key={crop.name}
                          className={`relative border rounded-3xl p-6 shadow-xs flex flex-col justify-between transition-all duration-200 cursor-pointer ${
                            isSelected 
                              ? "border-emerald-700 bg-emerald-50/10 ring-2 ring-emerald-700/25 shadow-md" 
                              : "border-stone-200 bg-white hover:border-emerald-600 hover:shadow-md"
                          }`}
                          onClick={handleSelectCard}
                          id={`crop-card-${crop.name.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          <div className="absolute top-4 right-4 flex items-center gap-1.5">
                            <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border uppercase tracking-widest ${
                              crop.risk_level === "Low" 
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200" 
                                : crop.risk_level === "Medium"
                                ? "bg-amber-100 text-amber-800 border-amber-200"
                                : "bg-red-100 text-red-800 border-red-200"
                            }`}>
                              {crop.risk_level} Risk
                            </span>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected 
                                ? "bg-emerald-800 border-emerald-800 text-white" 
                                : "border-stone-300 bg-stone-50"
                            }`}>
                              {isSelected && <Check className="h-3 w-3" />}
                            </div>
                          </div>

                          <div>
                            <div className="mb-4">
                              <h3 className="text-2xl font-black text-stone-900 tracking-tight leading-tight uppercase">
                                {crop.name}
                              </h3>
                              <p className="text-sm font-semibold text-stone-500 font-sans mt-0.5">
                                Local: <strong className="text-stone-800">{crop.local_name}</strong>
                              </p>
                            </div>

                            <div className="space-y-4 border-y border-stone-100 py-4 my-4" id={`metrics-${crop.name.toLowerCase().replace(/\s+/g, '-')}`}>
                              <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-100 shrink-0">
                                  <span className="text-lg font-black block leading-none">₹</span>
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block font-mono">Estimated Income</span>
                                  <span className="text-lg md:text-xl font-black text-emerald-950 tracking-tight leading-none">
                                    ₹{crop.income_estimate_inr.toLocaleString("en-IN")} <span className="text-xs text-stone-500 font-semibold font-sans">/ acre</span>
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-50 text-blue-800 rounded-2xl border border-blue-100 shrink-0">
                                  <TrendingUp className="h-5 w-5" />
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block font-mono">Expected Yield</span>
                                  <span className="text-lg md:text-xl font-black text-stone-900 tracking-tight leading-none">
                                    {crop.yield_per_acre}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-sky-50 text-sky-800 rounded-2xl border border-sky-100 shrink-0">
                                  <Droplet className="h-5 w-5" />
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block font-mono">Water Requirement</span>
                                  <span className="text-lg md:text-xl font-black text-stone-900 tracking-tight leading-none">
                                    {crop.water_need_mm} mm
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-amber-50 text-amber-800 rounded-2xl border border-amber-100 shrink-0">
                                  <Clock className="h-5 w-5" />
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block font-mono">Sowing Window</span>
                                  <span className="text-lg md:text-xl font-black text-stone-900 tracking-tight leading-none">
                                    {crop.sowing_window}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-1.5 mt-4" id="hindi-explanation">
                              <span className="text-[10px] font-black tracking-wider text-emerald-850 uppercase font-mono block">
                                वैज्ञानिक विश्लेषण (Soil &amp; Weather Fit)
                              </span>
                              <p className="text-xs text-stone-700 leading-relaxed font-semibold bg-emerald-50/30 border border-emerald-100/50 p-4 rounded-2xl">
                                {crop.explanation_local}
                              </p>
                            </div>
                          </div>

                          <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-between text-[11px] font-mono text-stone-400">
                            <span>Mime-Type: JSON Response</span>
                            <span className="font-bold text-emerald-800">Select to Compare</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Comparison Side-by-Side Table Section */}
                  {selectedCompareCrops.length === 2 && (() => {
                    const crop1 = recommendations.find(c => c.name === selectedCompareCrops[0]);
                    const crop2 = recommendations.find(c => c.name === selectedCompareCrops[1]);

                    if (!crop1 || !crop2) return null;

                    return (
                      <div className="bg-white border border-stone-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6" id="comparison-section">
                        <div className="border-b border-stone-100 pb-4">
                          <h3 className="text-lg font-black text-stone-900 uppercase tracking-tight flex items-center gap-2">
                            <span>📊</span> Side-by-Side Agronomic Comparison
                          </h3>
                          <p className="text-xs text-stone-500 mt-0.5">Detailed comparison of {crop1.name} and {crop2.name}.</p>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse font-sans">
                            <thead>
                              <tr className="border-b border-stone-200 bg-stone-50 text-stone-500 font-mono uppercase tracking-wider text-[10px] font-black">
                                <th className="p-4 rounded-tl-2xl">Agronomic Attribute</th>
                                <th className="p-4 font-black text-stone-900 text-xs">{crop1.name} ({crop1.local_name})</th>
                                <th className="p-4 font-black text-stone-900 text-xs rounded-tr-2xl">{crop2.name} ({crop2.local_name})</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100 text-stone-700 font-semibold">
                              <tr className="hover:bg-stone-50/50">
                                <td className="p-4 font-bold text-stone-900 bg-stone-50/20">Water Requirement</td>
                                <td className="p-4 text-base font-black text-sky-850 font-mono">{crop1.water_need_mm} mm</td>
                                <td className="p-4 text-base font-black text-sky-850 font-mono">{crop2.water_need_mm} mm</td>
                              </tr>
                              <tr className="hover:bg-stone-50/50">
                                <td className="p-4 font-bold text-stone-900 bg-stone-50/20">Estimated Income</td>
                                <td className="p-4 text-base font-black text-emerald-850 font-mono">₹{crop1.income_estimate_inr.toLocaleString("en-IN")} / acre</td>
                                <td className="p-4 text-base font-black text-emerald-850 font-mono">₹{crop2.income_estimate_inr.toLocaleString("en-IN")} / acre</td>
                              </tr>
                              <tr className="hover:bg-stone-50/50">
                                <td className="p-4 font-bold text-stone-900 bg-stone-50/20">Risk Profile</td>
                                <td className="p-4">
                                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                                    crop1.risk_level === "Low" ? "bg-emerald-100 text-emerald-800" : crop1.risk_level === "Medium" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"
                                  }`}>{crop1.risk_level} Risk</span>
                                </td>
                                <td className="p-4">
                                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                                    crop2.risk_level === "Low" ? "bg-emerald-100 text-emerald-800" : crop2.risk_level === "Medium" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"
                                  }`}>{crop2.risk_level} Risk</span>
                                </td>
                              </tr>
                              <tr className="hover:bg-stone-50/50">
                                <td className="p-4 font-bold text-stone-900 bg-stone-50/20">Soil &amp; Weather Fit</td>
                                <td className="p-4 text-stone-600 leading-relaxed text-xs">
                                  <div className="text-emerald-950 font-bold mb-1">Hindi (Devanagari):</div>
                                  <p className="italic bg-stone-50 p-3 rounded-xl border border-stone-200/50 mb-2">{crop1.explanation_local}</p>
                                  <div className="text-stone-500 font-bold mb-1">English:</div>
                                  <p>{crop1.explanation_en}</p>
                                </td>
                                <td className="p-4 text-stone-600 leading-relaxed text-xs">
                                  <div className="text-emerald-950 font-bold mb-1">Hindi (Devanagari):</div>
                                  <p className="italic bg-stone-50 p-3 rounded-xl border border-stone-200/50 mb-2">{crop2.explanation_local}</p>
                                  <div className="text-stone-500 font-bold mb-1">English:</div>
                                  <p>{crop2.explanation_en}</p>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Note block below results */}
                  <div className="bg-stone-50 border border-stone-200 rounded-3xl p-5 text-center text-stone-500 text-xs font-semibold font-mono" id="recommendation-notice">
                    📢 Refreshed each season — you'll be notified by SMS/WhatsApp when new recommendations are ready.
                  </div>

                </div>
              )}

            </div>
          </div>
        ) : (
          /* SCAN DIAGNOSTICS VIEW */
          <div className="space-y-6" id="scan-tab-main">
            
            {/* CROP RECOMMENDATION BANNER ENTRY POINT */}
            <div className="bg-emerald-900 text-white rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6" id="recommendation-entry-banner">
              <div className="space-y-1">
                <span className="text-[10px] font-black tracking-widest uppercase font-mono text-emerald-300">
                  New Smart Feature
                </span>
                <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                  <Sprout className="h-5 w-5 text-emerald-300" /> What should I grow?
                </h3>
                <p className="text-xs text-emerald-100 max-w-xl leading-relaxed">
                  Analyze your local soil parameters, moisture levels, and vegetation health index to get AI-powered crop recommendations tailored for the upcoming season.
                </p>
              </div>
              <button
                onClick={() => setActiveTab("recommend")}
                className="bg-white text-emerald-950 hover:bg-emerald-50 active:bg-emerald-100 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 shadow-md touch-target font-mono"
                id="launch-recommendation-btn"
              >
                <Sparkles className="h-4 w-4 text-emerald-800" />
                <span>Launch Crop Advisor</span>
              </button>
            </div>

            {/* PRESETS HEADER PANEL FOR INSTANT TESTING */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 shadow-sm" id="presets-panel">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-emerald-800 animate-pulse" />
                    <h3 className="font-black text-emerald-950 text-lg uppercase tracking-tight">Instant Demonstration Lab</h3>
                  </div>
                  <p className="text-stone-600 text-xs mt-1">
                    Select a simulated Indian crop specimen below to immediately pre-fill the diagnosis results without taking a photo.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5" id="specimens-list">
                  {SAMPLE_CROPS.map((sample) => (
                    <button
                      key={sample.id}
                      onClick={() => handleLoadSample(sample)}
                      className="px-3.5 py-2 rounded-2xl bg-white border border-stone-200 hover:border-emerald-700 hover:bg-emerald-50/50 transition-all text-xs font-semibold text-stone-800 flex items-center gap-2 shadow-sm touch-target"
                      id={`preset-btn-${sample.id}`}
                    >
                      <img 
                        src={sample.imageUrl} 
                        className="w-5 h-5 object-contain rounded" 
                        alt={sample.name} 
                      />
                      <span>{sample.cropType} Test</span>
                    </button>
                  ))}

                  {/* Ambiguous Case (Escalation Demo) button */}
                  <button
                    onClick={() => handleLoadSample({
                      id: "escalation-demo",
                      name: "Ambiguous Crop Spot Specimen",
                      cropType: "Ambiguous Case",
                      symptomNotes: "Scattered dark brown spots of varying size. Low confidence, high severity.",
                      imageUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23FEF3C7"/><circle cx="50" cy="50" r="35" fill="%23D97706" opacity="0.1"/><circle cx="45" cy="40" r="6" fill="%239A3412"/><circle cx="55" cy="55" r="7" fill="%239A3412"/><circle cx="48" cy="70" r="5" fill="%239A3412"/><path d="M50,35 L50,65" stroke="%2378350F" stroke-width="2"/><circle cx="50" cy="50" r="15" fill="none" stroke="%23DC2626" stroke-width="2" stroke-dasharray="3 3"/></svg>`,
                      presetDiagnosis: {
                        disease_name: "Possible Early Blight or Septoria Leaf Spot",
                        disease_name_local: "प्रारंभिक झुलसा या सेप्टोरिया पत्ती धब्बा (संभावित)",
                        confidence_score: 58,
                        severity: "High",
                        symptoms_observed: [
                          "Scattered dark brown spots of varying size",
                          "Some yellowing around spot margins",
                          "Pattern consistent with two possible diseases",
                          "Image quality limits definitive identification"
                        ],
                        treatment_en: "Diagnosis uncertain — case forwarded to your nearest Rythu Seva Kendra for expert field inspection before treatment.",
                        treatment_local: "निदान अनिश्चित है — उपचार से पहले विशेषज्ञ क्षेत्र निरीक्षण के लिए आपके नजदीकी रायथू सेवा केंद्र को मामला भेज दिया गया है।",
                        escalate_to_rsk: true,
                        case_id: "RSK-CASE-0472"
                      }
                    })}
                    className="px-3.5 py-2 rounded-2xl bg-amber-50 border border-amber-200 hover:border-amber-600 hover:bg-amber-100/50 transition-all text-xs font-semibold text-amber-900 flex items-center gap-2 shadow-sm touch-target animate-pulse"
                    id="preset-btn-escalation-demo"
                  >
                    <AlertCircle className="h-4 w-4 text-amber-700 shrink-0" />
                    <span>Ambiguous Case (Escalation Demo)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* BENTO GRID: DIAGNOSTIC LAB INPUTS & ANALYTICS OUTPUTS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="bento-lab-grid">
              
              {/* COLUMN Left: Camera/Upload & Descriptions (4 cols) */}
              <div className="lg:col-span-4 flex flex-col gap-6" id="bento-input-column">
                
                {/* 1. Upload & Photo Preview Card */}
                <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-sm flex flex-col flex-1" id="photo-upload-bento">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black text-stone-400 tracking-widest uppercase font-mono">1. Crop Specimen</span>
                    {selectedImage && (
                      <button
                        onClick={handleReset}
                        className="text-[11px] text-rose-600 font-bold hover:underline"
                        id="reset-crop-btn"
                      >
                        Reset Photo
                      </button>
                    )}
                  </div>

                  <div 
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={!selectedImage ? triggerFileSelect : undefined}
                    className={`relative flex-1 min-h-[220px] rounded-2xl border-2 overflow-hidden flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer p-4 group ${
                      selectedImage 
                        ? "border-transparent bg-stone-50" 
                        : dragActive 
                        ? "border-emerald-700 bg-emerald-50/40" 
                        : "border-dashed border-stone-300 bg-stone-50 hover:bg-stone-100/50"
                    }`}
                    id="specimen-drag-drop-zone"
                  >
                    {selectedImage ? (
                      <div className="relative w-full h-full flex items-center justify-center" id="image-preview-wrapper">
                        <img 
                          src={selectedImage} 
                          className="max-h-[280px] w-full object-contain rounded-xl shadow-inner" 
                          alt="Uploaded crop diagnostic preview" 
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium rounded-xl gap-2">
                          <Upload className="h-4 w-4" />
                          <span>Replace Photo</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4" id="upload-prompt-view">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-800">
                          <Camera className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-stone-900">Take Photo or Upload Specimen</p>
                          <p className="text-xs text-stone-400 mt-1 max-w-[200px] mx-auto">
                            Drag and drop plant leaf here or tap to launch camera
                          </p>
                        </div>
                        <button
                          type="button"
                          className="px-4 py-2 bg-emerald-800 text-white rounded-xl text-xs font-bold shadow hover:bg-emerald-700 transition-colors"
                        >
                          Select Image
                        </button>
                      </div>
                    )}

                    {/* Hidden Native File Input */}
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      accept="image/*" 
                      onChange={onFileSelect}
                      className="hidden" 
                      id="crop-photo-file-input"
                    />
                  </div>

                  <p className="text-[10px] text-stone-400 mt-2 text-center">
                    Accepted formats: JPG, PNG, WEBP. Max 5MB file.
                  </p>
                </div>

                {/* Crop Type Selection */}
                <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-sm" id="crop-type-selection-bento">
                  <span className="text-xs font-black text-stone-400 tracking-widest uppercase font-mono mb-3 block">1.5 Select Crop Type</span>
                  <div className="grid grid-cols-3 gap-2">
                    {["Rice", "Wheat", "Cotton", "Sugarcane", "Tomato", "Potato", "Turmeric", "Grapes", "Pigeon Pea"].map((crop) => (
                      <button
                        key={crop}
                        type="button"
                        onClick={() => setSelectedCropType(crop)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                          selectedCropType === crop
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300 shadow-sm"
                            : "bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100"
                        }`}
                        id={`crop-type-btn-${crop.toLowerCase().replace(" ", "-")}`}
                      >
                        {crop}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Symptom Description (Text or Voice dictation) */}
                <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-sm" id="symptoms-entry-bento">
                  <span className="text-xs font-black text-stone-400 tracking-widest uppercase font-mono mb-3 block">2. Field Sighting</span>
                  <VoiceInput 
                    description={symptomDescription}
                    onChange={(val) => setSymptomDescription(val)}
                  />
                </div>

                {/* 3. Diagnose CTA Button */}
                <div className="bg-white rounded-3xl border border-stone-200 p-4 shadow-sm" id="action-trigger-bento">
                  <button
                    onClick={handleAnalyzeCrop}
                    disabled={isAnalyzing || !selectedImage}
                    className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 ${
                      !selectedImage 
                        ? "bg-stone-200 text-stone-400 cursor-not-allowed"
                        : isAnalyzing
                        ? "bg-emerald-900 text-white cursor-wait animate-pulse"
                        : "bg-emerald-800 hover:bg-emerald-700 text-white cursor-pointer active:scale-[0.99]"
                    }`}
                    id="analyze-crops-submit-btn"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Consulting Gemini Pathologist...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5 text-brand-amber animate-bounce" />
                        <span>Run pathology Diagnostic</span>
                      </>
                    )}
                  </button>

                  {analysisError && (
                    <div className="mt-3 p-3 bg-rose-50 border border-rose-150 rounded-xl text-rose-800 text-xs flex gap-2 items-start" id="api-error-card">
                      <AlertCircle className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Diagnostic Failure</p>
                        <p className="mt-0.5">{analysisError}</p>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* COLUMN Right: Diagnosis results & Action layouts (8 cols) */}
              <div className="lg:col-span-8 flex flex-col gap-6" id="bento-output-column">
                
                {/* Loader Skeleton if analyzing */}
                {isAnalyzing && (
                  <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-sm flex flex-col justify-center items-center text-center space-y-4 flex-1 min-h-[400px]" id="loading-skeleton">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-4 border-emerald-100 border-t-emerald-800 animate-spin"></div>
                      <Sprout className="h-8 w-8 text-emerald-800 absolute top-4 left-4 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="font-black text-stone-900 text-lg">Scanning Foliage...</h4>
                      <p className="text-xs text-stone-400 mt-1 max-w-md mx-auto">
                        Sending high-resolution pixel patterns to Google Gemini. Comparing against diagnostic models for common Indian rusts, blights, pests, and local mineral deficiencies.
                      </p>
                    </div>
                    <div className="w-full max-w-xs bg-stone-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-800 h-full w-[60%] animate-pulse"></div>
                    </div>
                  </div>
                )}

                {/* Placeholder if no analysis run yet */}
                {!isAnalyzing && !diagnosis && (
                  <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-sm flex flex-col justify-center items-center text-center space-y-4 flex-1 min-h-[400px]" id="empty-state-bento">
                    <div className="w-16 h-16 bg-stone-50 rounded-2xl flex items-center justify-center border border-stone-200 text-stone-400">
                      <Sprout className="h-10 w-10" />
                    </div>
                    <div>
                      <h4 className="font-black text-stone-800 text-lg uppercase tracking-tight">Agri-Pathology Laboratory</h4>
                      <p className="text-sm text-stone-500 mt-2 max-w-md mx-auto">
                        Your real-time diagnosis report will appear here. Choose one of the instant specimen presets above to view a sample or upload your crop photo.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full pt-4 text-left">
                      <div className="p-3 bg-stone-50 rounded-xl border border-stone-150 text-xs">
                        <span className="font-bold text-emerald-950 block mb-1">🔍 High Precision</span>
                        Gemini identifies exact leaf lesions, insect patterns and details appropriate eco-fungicides.
                      </div>
                      <div className="p-3 bg-stone-50 rounded-xl border border-stone-150 text-xs">
                        <span className="font-bold text-emerald-950 block mb-1">🇮🇳 Localized Vernacular</span>
                        Returns diseases translated into localized Indian names (e.g. झोंका रोग, झुलसा रोग).
                      </div>
                    </div>
                  </div>
                )}

                {/* ACTUAL RESULT PRESENTATION IN BENTO GRID CELLS */}
                {!isAnalyzing && diagnosis && (
                  <div className="space-y-6 animate-fade-in" id="active-diagnosis-results-root">
                    
                    {/* BENTO INNER ROW 1: PRIMARY DISEASE INFO & THREAT LEVEL (2 Cards) */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6" id="bento-inner-row-1">
                      
                      {/* Sub-Card 1: Primary Diagnosis details */}
                      <div className="md:col-span-8 bg-emerald-50 border border-emerald-100 rounded-3xl p-6 flex flex-col justify-between shadow-sm relative overflow-hidden" id="card-primary-diagnosis">
                        {/* Audio guide trigger button in corner */}
                        <button
                          onClick={toggleAudioDiagnosis}
                          className={`absolute top-4 right-4 p-2.5 rounded-full transition-all duration-200 border touch-target ${
                            isSpeaking 
                              ? "bg-rose-100 border-rose-200 text-rose-700 animate-pulse" 
                              : "bg-white hover:bg-stone-50 border-stone-200 text-stone-700"
                          }`}
                          title={isSpeaking ? "Mute Read-Aloud" : "Read Aloud Diagnosis"}
                          id="btn-voice-readaloud"
                        >
                          {isSpeaking ? <VolumeX className="h-4.5 w-4.5" /> : <Volume2 className="h-4.5 w-4.5" />}
                        </button>

                        <div>
                          <span className="text-[10px] font-black text-emerald-800 tracking-widest uppercase block mb-1">
                            Indian Crop Specimen Analysis
                          </span>
                          <h2 className="text-3xl font-black text-emerald-950 leading-tight uppercase font-sans">
                            {diagnosis.disease_name}
                          </h2>
                          <p className="text-lg font-serif italic text-emerald-700 font-medium mt-1">
                            {diagnosis.disease_name_local}
                          </p>
                        </div>

                        <div className="mt-8 pt-4 border-t border-emerald-100/60" id="confidence-bar-widget">
                          <div className="flex items-center justify-between text-xs font-mono text-emerald-900 font-bold mb-1.5">
                            <span>Diagnostic Accuracy</span>
                            <span>{diagnosis.confidence_score}% Confidence</span>
                          </div>
                          <div className="h-2.5 w-full bg-emerald-200/50 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                diagnosis.confidence_score >= 85 
                                  ? "bg-emerald-600" 
                                  : diagnosis.confidence_score >= 70 
                                  ? "bg-brand-gold" 
                                  : "bg-brand-brick"
                              }`}
                              style={{ width: `${diagnosis.confidence_score}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Sub-Card 2: Severity Level Indicators */}
                      <div 
                        className={`md:col-span-4 rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-sm border transition-colors ${
                          diagnosis.severity === "High"
                            ? "bg-rose-50 border-rose-200"
                            : diagnosis.severity === "Medium"
                            ? "bg-amber-50 border-amber-200"
                            : "bg-emerald-50/50 border-emerald-200/50"
                        }`}
                        id="card-severity-indicator"
                      >
                        <div className="relative mb-3 flex items-center justify-center">
                          {/* Pulsing indicator ring */}
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center animate-[pulse_2s_infinite] ${
                            diagnosis.severity === "High"
                              ? "bg-rose-100 text-rose-600"
                              : diagnosis.severity === "Medium"
                              ? "bg-amber-100 text-amber-600"
                              : "bg-emerald-100 text-emerald-700"
                          }`}>
                            <AlertTriangle className="h-6 w-6" />
                          </div>
                        </div>

                        <span className="text-[10px] font-black text-stone-500 tracking-widest uppercase mb-1">
                          Severity Assessment
                        </span>
                        
                        <p className={`text-2xl font-black uppercase ${
                          diagnosis.severity === "High"
                            ? "text-rose-800"
                            : diagnosis.severity === "Medium"
                            ? "text-amber-800"
                            : "text-emerald-800"
                        }`}>
                          {diagnosis.severity}
                        </p>

                        <span className="text-[10px] text-stone-400 mt-1 font-mono">
                          {diagnosis.severity === "High" 
                            ? "Urgent treatment critical" 
                            : diagnosis.severity === "Medium" 
                            ? "Treatment recommended" 
                            : "No critical damage"}
                        </span>
                      </div>

                    </div>

                    {/* BENTO INNER ROW 2: SYMPTOMS & TREATMENT SCHEMES */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6" id="bento-inner-row-2">
                      
                      {/* Symptoms observed checklist */}
                      <div className="md:col-span-5 bg-white border border-stone-200 rounded-3xl p-6 shadow-sm" id="card-symptoms-observed">
                        <span className="text-xs font-black text-stone-400 tracking-widest uppercase mb-4 block font-mono">
                          Symptoms Identified
                        </span>

                        <div className="space-y-4">
                          {diagnosis.symptoms_observed.map((symptom, idx) => (
                            <div key={idx} className="flex gap-3 text-sm font-medium items-start">
                              <span className="text-emerald-700 font-bold bg-emerald-50 rounded-md w-5 h-5 flex items-center justify-center text-xs shrink-0 mt-0.5 font-mono">
                                {idx + 1}
                              </span>
                              <p className="text-stone-700 text-xs leading-relaxed">{symptom}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Recommended Treatment (Chemical & Organic actions) */}
                      <div className="md:col-span-7 bg-white border border-stone-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between" id="card-treatment-plan">
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-black text-stone-400 tracking-widest uppercase font-mono">
                              Recommended Action Plan (English)
                            </span>
                            <span className="bg-stone-100 text-stone-600 text-[9px] px-2 py-0.5 rounded font-mono uppercase">
                              Standard English
                            </span>
                          </div>

                          <div className="space-y-3" id="treatment-items">
                            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-150">
                              <p className="text-xs font-bold text-stone-900 mb-1 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-700" />
                                Action Steps / Dosage
                              </p>
                              <p className="text-xs text-stone-600 leading-relaxed whitespace-pre-line">
                                {diagnosis.treatment_en}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Speech hint */}
                        <div className="mt-4 pt-3 border-t border-stone-100 text-[10px] text-stone-400 flex items-center gap-1">
                          <Info className="h-3.5 w-3.5 text-stone-400" />
                          <span>Tap the speaker icon in the top green card to listen to these directions offline.</span>
                        </div>
                      </div>

                    </div>

                    {/* BENTO INNER ROW 3: LOCAL LANGUAGE DIAGNOSTIC TREATMENT */}
                    <div className="bg-emerald-950 text-white rounded-3xl p-6 shadow-sm" id="card-prevention-tips">
                      <span className="text-xs font-black text-brand-amber tracking-widest uppercase mb-3 block font-mono">
                        स्थानीय भाषा में उपचार के निर्देश (Vernacular Treatment Advisory)
                      </span>
                      
                      <div className="bg-emerald-900/40 border border-emerald-800 rounded-2xl p-4">
                        <p className="text-sm font-bold text-emerald-200 mb-2 font-sans flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-brand-gold animate-pulse" />
                          सुरक्षित जैविक और रासायनिक उपचार विधि / Recommended Treatment Localized:
                        </p>
                        <p className="text-xs text-stone-200 leading-relaxed whitespace-pre-line font-sans font-medium">
                          {diagnosis.treatment_local}
                        </p>
                      </div>
                    </div>

                    {/* 4. ESCALATION RYTHU SEVA KENDRA BANNER */}
                    {isEscalated ? (
                      <div 
                        className="bg-brand-navy rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-md border border-stone-800 text-white relative overflow-hidden" 
                        id="escalation-banner-rsk"
                      >
                        {/* Decorative watermark background circle */}
                        <div className="absolute -right-16 -bottom-16 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />

                        <div className="flex items-start gap-5">
                          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 border border-white/15">
                            <ShieldAlert className="h-6 w-6 text-brand-amber animate-pulse" />
                          </div>
                          <div>
                            <div className="flex flex-wrap gap-1.5 items-center mb-1.5">
                              <span className="bg-amber-400/20 text-brand-amber text-[10px] font-mono font-black px-2 py-0.5 rounded uppercase tracking-wider inline-block">
                                Escalated to Rythu Seva Kendra (RSK)
                              </span>
                              <span className="bg-white/10 text-stone-200 text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider inline-block border border-white/10">
                                Case ID: {diagnosis.case_id || "RSK-CASE-0472"}
                              </span>
                            </div>
                            <h3 className="font-black text-xl uppercase tracking-tight text-white leading-tight">
                              Expert Support Requested
                            </h3>
                            <p className="text-stone-300 text-xs mt-1 max-w-xl leading-relaxed">
                              {diagnosis.confidence_score < 70 
                                ? "Because our AI diagnostic accuracy fell below 70%, this case has been automatically queued for human expert verification."
                                : "Because this crop threat has been flagged as HIGH SEVERITY, local Krishi officers are ready to assist."}{" "}
                              A local officer has been assigned to verify this case in <strong>{activeDistrict.name} District</strong>.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0 z-10">
                          <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl text-left">
                            <p className="text-[10px] font-mono text-stone-400 uppercase tracking-widest">RSK Helpline</p>
                            <p className="text-sm font-black text-brand-amber font-mono mt-0.5">{activeDistrict.helpline}</p>
                          </div>

                          <a 
                            href={`tel:${activeDistrict.helpline}`}
                            className="bg-brand-gold hover:bg-brand-gold/90 text-stone-900 font-black px-6 py-4 rounded-2xl transition-all uppercase text-xs tracking-wider text-center flex items-center justify-center gap-2"
                            id="call-officer-now-link"
                          >
                            <PhoneCall className="h-4 w-4" />
                            <span>Call Agri-Officer Now</span>
                          </a>
                        </div>
                      </div>
                    ) : (
                      /* HEALTHY/LOW THREAT ADVISORY NOTICE */
                      <div className="bg-emerald-950 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-emerald-900 text-brand-cream" id="healthy-standard-banner">
                        <div className="flex gap-3 items-center">
                          <CheckCircle className="h-5 w-5 text-emerald-400" />
                          <div>
                            <h5 className="font-black text-xs uppercase tracking-wider text-emerald-300">Standard Diagnostics Complete</h5>
                            <p className="text-xs text-stone-300 mt-0.5">Crop condition is stable. Continue weekly monitoring schedules and follow local weather warnings.</p>
                          </div>
                        </div>
                        <div className="text-xs font-mono text-emerald-400 bg-emerald-900/50 border border-emerald-800 px-3 py-1.5 rounded-xl uppercase">
                          No Escalation Needed
                        </div>
                      </div>
                    )}

                  </div>
                )}

              </div>

            </div>

            {/* LOWER STATS BAR */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4" id="stats-summary-bento">
              <div className="bg-white border border-stone-200 rounded-2xl p-4 text-center shadow-xs">
                <p className="text-2xl font-black text-emerald-950">100%</p>
                <p className="text-[10px] text-stone-400 font-mono uppercase mt-1">Sovereign Data Privacy</p>
              </div>
              <div className="bg-white border border-stone-200 rounded-2xl p-4 text-center shadow-xs">
                <p className="text-2xl font-black text-emerald-950">50+</p>
                <p className="text-[10px] text-stone-400 font-mono uppercase mt-1">Indian Crop Species</p>
              </div>
              <div className="bg-white border border-stone-200 rounded-2xl p-4 text-center shadow-xs">
                <p className="text-2xl font-black text-emerald-950">Gemini 3.5</p>
                <p className="text-[10px] text-stone-400 font-mono uppercase mt-1">Diagnostic Engine</p>
              </div>
              <div className="bg-white border border-stone-200 rounded-2xl p-4 text-center shadow-xs">
                <p className="text-2xl font-black text-emerald-950">RSK Integration</p>
                <p className="text-[10px] text-stone-400 font-mono uppercase mt-1">Direct Farmer Help</p>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* 4. FOOTER */}
      <footer className="mt-12 bg-white border-t border-stone-200 py-6 px-6 shadow-inner" id="app-footer">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-stone-400">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <span className="uppercase tracking-widest font-bold text-[10px] text-stone-500">Kisan Alert Console</span>
            <span className="hidden sm:inline text-stone-200">|</span>
            <span>Scan Session: KS-{selectedDistrictId.toUpperCase()}-2026</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></div>
            <span className="uppercase text-[10px] tracking-wider font-bold text-stone-500">Government Support Partner Network</span>
          </div>
        </div>
      </footer>

      {/* 5. CALLING FARMER OVERLAY MODAL */}
      {callingFarmer && (
        <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" id="calling-farmer-modal">
          <div className="bg-white rounded-3xl border border-stone-200 p-8 max-w-sm w-full text-center shadow-2xl space-y-6">
            
            {/* Animated Pulses */}
            <div className="relative flex items-center justify-center w-24 h-24 mx-auto">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping"></div>
              <div className="absolute inset-2 rounded-full bg-emerald-500/30 animate-pulse"></div>
              <div className="w-16 h-16 rounded-full bg-emerald-950 flex items-center justify-center text-white relative shadow-lg">
                <PhoneCall className="h-8 w-8" />
              </div>
            </div>

            <div>
              <p className="text-xs font-mono font-black text-emerald-800 uppercase tracking-widest">
                Active Telephony Outbound
              </p>
              <h3 className="text-2xl font-black text-stone-900 mt-1 uppercase tracking-tight">
                {callingFarmer.farmerName}
              </h3>
              <p className="text-xs text-stone-500 font-mono mt-1">
                Village: {callingFarmer.village} | {callingFarmer.cropName} Case
              </p>
            </div>

            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
              <span className="text-[10px] font-mono text-stone-400 uppercase font-bold">Call Status</span>
              <p className="text-sm font-black text-stone-800 mt-1 animate-pulse">
                {callDuration === 0 ? "Connecting..." : `In progress... ${Math.floor(callDuration / 60).toString().padStart(2, '0')}:${(callDuration % 60).toString().padStart(2, '0')}`}
              </p>
              <p className="text-[10px] text-stone-400 mt-1.5 leading-relaxed font-semibold">
                Mocking standard carrier routing. In production, this dials +91 98480 04721.
              </p>
            </div>

            <button
              onClick={handleEndCall}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer touch-target font-sans text-sm uppercase tracking-wider"
            >
              <span className="inline-block transform rotate-135">
                <PhoneCall className="h-4 w-4" />
              </span>
              <span>Disconnect Call</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
