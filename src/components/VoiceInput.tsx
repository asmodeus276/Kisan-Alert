import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Check, AlertCircle, RefreshCw } from "lucide-react";

interface VoiceInputProps {
  description: string;
  onChange: (value: string) => void;
  lang?: string;
}

const QUICK_SYMPTOMS = [
  "पत्तियों पर पीले धब्बे (Yellow spots on leaves)",
  "सफ़ेद फफूंदी (White powdery mold underneath)",
  "पत्तियों का सूखना और मुड़ना (Dry, curling leaf margins)",
  "तने में छेद या कीड़े (Holes or insects in stalks)",
  "जड़ों का गलना (Rotting root systems)"
];

export default function VoiceInput({ description, onChange, lang = "en-IN" }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check if Speech Recognition is supported
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;

    rec.onstart = () => {
      setIsListening(true);
      setInterimTranscript("");
    };

    rec.onerror = (event: any) => {
      console.warn("Speech recognition error:", event.error);
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    rec.onresult = (event: any) => {
      let finalStr = "";
      let interimStr = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalStr += event.results[i][0].transcript + " ";
        } else {
          interimStr += event.results[i][0].transcript;
        }
      }

      if (finalStr) {
        const newDesc = description ? `${description.trim()} ${finalStr.trim()}` : finalStr.trim();
        onChange(newDesc);
      }
      setInterimTranscript(interimStr);
    };

    recognitionRef.current = rec;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [description, lang, onChange]);

  const toggleListening = () => {
    if (!speechSupported) return;

    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
      }
    }
  };

  const addQuickSymptom = (symptom: string) => {
    const cleaned = symptom.replace(/\s*\(.*\)\s*/, ""); // Clean Hindi translation if needed or keep both
    const newDesc = description ? `${description.trim()}. Observed ${cleaned.toLowerCase()}.` : `Observed ${cleaned}.`;
    onChange(newDesc);
  };

  return (
    <div className="space-y-3" id="voice-input-container">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 font-medium" id="symptoms-label">
          Symptom Description (सक्रीय लक्षण)
        </label>
        <span className="text-[10px] text-brand-gold font-serif">Optional &middot; Voice Supported</span>
      </div>

      <div className="relative">
        <textarea
          id="symptom-textarea"
          className="w-full min-h-[100px] p-3 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-navy font-sans placeholder-slate-400"
          placeholder="Describe symptoms here or use the voice recording feature below. (पत्तियों के धब्बों, फफूंदी या कीड़ों का वर्णन करें...)"
          value={description}
          onChange={(e) => onChange(e.target.value)}
        />
        
        {interimTranscript && (
          <div className="absolute bottom-2 left-3 right-3 text-xs italic text-brand-gold bg-amber-50 px-2 py-1 rounded border border-amber-100 animate-pulse">
            Listening: {interimTranscript}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 items-center justify-between" id="voice-controls-row">
        {speechSupported ? (
          <button
            type="button"
            id="mic-toggle-btn"
            onClick={toggleListening}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium border transition-all duration-200 touch-target ${
              isListening
                ? "bg-rose-50 border-rose-200 text-rose-600 animate-pulse"
                : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
            }`}
          >
            {isListening ? (
              <>
                <Mic className="h-4 w-4 text-rose-600 animate-bounce" id="mic-icon-active" />
                <span>Recording Speech... (Tap to Save)</span>
              </>
            ) : (
              <>
                <Mic className="h-4 w-4 text-brand-navy" id="mic-icon-idle" />
                <span>Record Voice Symptoms</span>
              </>
            )}
          </button>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono" id="speech-unsupported-note">
            <MicOff className="h-3.5 w-3.5" />
            <span>Voice dictation limited in this browser</span>
          </div>
        )}

        {description && (
          <button
            type="button"
            id="clear-symptoms-btn"
            onClick={() => onChange("")}
            className="text-[11px] text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      {/* Visual voice activity wave if listening */}
      {isListening && (
        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-center gap-1" id="voice-wave-container">
          <div className="h-3 w-0.5 bg-rose-500 rounded-full animate-[pulse_1s_infinite_100ms]" />
          <div className="h-5 w-0.5 bg-rose-500 rounded-full animate-[pulse_1s_infinite_200ms]" />
          <div className="h-7 w-0.5 bg-rose-500 rounded-full animate-[pulse_1s_infinite_300ms]" />
          <div className="h-4 w-0.5 bg-rose-500 rounded-full animate-[pulse_1s_infinite_400ms]" />
          <div className="h-6 w-0.5 bg-rose-500 rounded-full animate-[pulse_1s_infinite_500ms]" />
          <div className="h-2 w-0.5 bg-rose-500 rounded-full animate-[pulse_1s_infinite_600ms]" />
          <span className="text-[10px] text-slate-500 font-mono ml-2">Speak now in Hindi or English...</span>
        </div>
      )}

      {/* Quick symptom selector chips for convenient testing */}
      <div className="pt-1.5" id="quick-symptoms-chips">
        <p className="text-[10px] font-mono text-slate-400 mb-1.5 uppercase tracking-wider">Quick Symptoms Suggstions (त्वरित चयन):</p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_SYMPTOMS.map((symptom) => (
            <button
              key={symptom}
              id={`quick-symptom-chip-${symptom.slice(0, 5)}`}
              type="button"
              onClick={() => addQuickSymptom(symptom)}
              className="text-[11px] bg-slate-50 hover:bg-slate-100 text-slate-700 px-2 py-1 rounded-md border border-slate-150 transition-colors cursor-pointer"
            >
              + {symptom}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
