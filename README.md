🌾 Kisan Alert

AI-Powered Crop Health Advisory & Pathology Platform for Indian Farmers

Built for Hack2Skill Hackathon — Team Apex Innovators

---

## Overview

Kisan Alert is a mobile-first web application that gives Indian farmers AI-assisted crop health diagnosis, weather-driven advisories, crop recommendations, and a two-way escalation channel to human agricultural experts.

It's a single-page React application (Vite + TypeScript) backed by an Express server. The server brokers all calls to Google Gemini, OpenWeatherMap, Fast2SMS, and Supabase, so no third-party API key is ever exposed to the browser.

The UI is organized into five tabs: **Scan**, **Alerts**, **Recommend**, **RSK** (expert case queue), and **About**.

## The Problem

Smallholder farmers in India often lack fast, affordable access to a plant pathologist when a crop shows disease symptoms, and lack visibility into short-term weather risk to their specific fields. Feature-phone-only users are excluded from most digital advisory tools.

Kisan Alert addresses this with a low-friction, camera/microphone-first interface, automatic escalation for cases an AI can't confidently resolve, and an SMS channel that reaches non-smartphone users.

## Key Features

- **Instant crop diagnosis** — submit a photo or a voice note (Hindi, English, or Hinglish) and get a disease/pest/deficiency diagnosis with confidence score, severity, symptoms, and bilingual treatment guidance in under a minute.
- **Automatic expert escalation** — any diagnosis with confidence below 70% or High severity is automatically routed to a human expert at a Rythu Bharosa Kendra (RSK), rather than silently guessing.
- **Weather & district alerts** — 7-day rainfall, temperature, and humidity forecasts, plus active district-level alerts for dry spells, frost, floods, and pest risk.
- **SMS fallback** — alerts can be dispatched via SMS to feature-phone users through the Fast2SMS gateway.
- **AI crop recommendations** — top 3 recommended crops for the season, grounded in NDVI (satellite vegetation stress), soil type/pH/NPK, groundwater depth, and 7-day weather, each with yield, water need, sowing window, income estimate, and risk level.
- **Expert case management** — RSK officers can view all escalated cases, update status (Open → In Review → Responded → Closed), and add written advisory responses.
- **Google Sign-In (optional)** — farmers can sign in via Supabase Auth to persist and view their case history; scanning and viewing public alerts works without sign-in.
- **Bilingual by default** — all diagnosis and treatment output is provided in English and a local Indian language (Hindi/Devanagari or regional equivalent).
- **Graceful degradation** — weather and crop-recommendation features fall back to deterministic mock data rather than failing outright when an external API key is missing or a provider is unreachable.

## Tech Stack

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind | Single-page UI: Scan / Alerts / Recommend / RSK / About tabs |
| Backend | Express (`server.ts`) | Brokers all external API calls; enforces auth and case-ownership rules |
| AI / Diagnosis | Google Gemini (`@google/genai`) | Photo/audio pathology diagnosis and crop recommendation generation |
| Weather | OpenWeatherMap One Call API 3.0 | 7-day forecast, with deterministic local fallback |
| SMS | Fast2SMS Gateway | Outbound alert delivery to feature phones, with sandbox simulation fallback |
| Database / Auth | Supabase (Postgres + Auth) | User accounts, escalated case storage; in-memory mock fallback for local/demo runs |

## Getting Started

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set the required environment variables in `.env.local` (see [Environment Variables](#environment-variables) below).
3. Run the app:
   ```bash
   npm run dev
   ```

The app runs at `http://localhost:3000`.

### Build & Deploy

```bash
npm run build   # builds frontend (Vite) and bundles the server (esbuild)
npm run start   # runs the production server
```

The frontend and backend can be deployed independently (e.g., frontend on Netlify, backend on Render/Cloud Run), coordinated via the `VITE_BACKEND_URL` environment variable and a Netlify API proxy redirect.

## Environment Variables

| Variable | Purpose | Required? |
|---|---|---|
| `GEMINI_API_KEY` | Diagnosis and crop-recommendation calls | **Required** for core functionality |
| `OPENWEATHERMAP_API_KEY` | Live 7-day weather forecast | Optional — falls back to mock forecast |
| `FAST2SMS_API_KEY` | Real SMS dispatch | Optional — falls back to simulated send |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Auth + persisted case storage | Optional — falls back to in-memory demo mode |
| `VITE_BACKEND_URL` | Points a separately-deployed frontend at its backend | Optional — defaults to relative `/api` paths |

> The app runs end-to-end with **no external keys configured**, using its built-in mock/demo mode — useful for local development and hackathon judging.

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/analyze` | POST | Submit a crop photo or voice recording for AI diagnosis |
| `/api/weather` | GET | 7-day weather forecast for a district |
| `/api/send-alert` | POST | Dispatch an SMS alert to a supplied mobile number |
| `/api/crop-recommendations` | GET | Top 3 AI-recommended crops for the district's upcoming season |
| `/api/cases` | GET / POST | View and manage escalated expert cases |

## User Roles

| Role | Description | Access |
|---|---|---|
| Farmer (Guest) | Any visitor | Submit diagnoses/cases; view own escalated cases once signed in |
| Farmer (Signed-in) | Authenticated via Google OAuth (Supabase Auth) | Same as above, plus persisted case history tied to their account |
| Agricultural Expert | Identified by an allow-listed email address | Views all escalated cases across districts; sets status and advisory response |

## Known Limitations

Captured here for transparency:

- `GET /api/cases` currently has no authentication requirement and returns all case records; it should be restricted to the case owner or an expert in a production deployment.
- When Supabase is not configured, all requests are treated as an authenticated expert — intended for local demoing only.
- The expert allow-list is currently hardcoded in source rather than stored in configuration.
- Kisan Alert is not a substitute for regulatory pesticide/agrochemical guidance; treatment text is advisory only.

## Out of Scope (Current Version)

Payment/subsidy processing, marketplace or input-purchase features, multi-tenant government integration, and native mobile apps (the product is a responsive web app).

## Team

**Apex Innovators**
- Vaibhav Thakur
- Aditi Pant

---

*"Transforming agriculture for the next billion farmers."*
