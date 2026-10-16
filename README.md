# PharmaCycle AI — Smart Pharmaceutical Waste Assistant

> **"Identify Smart. Dispose Safe. Recover Responsibly."**

PharmaCycle AI is an environmental-health technology web application built to help households, pharmacies, and waste handlers safely identify pharmaceutical waste, separate medicines from complex packaging (such as PVC/Aluminium blister foils), understand safe disposal options, locate authorized collection points, and track waste items through an immutable Digital Twin state machine.

---

## 1. System Architecture

```
PharmaCycle AI Workspace/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── health.py            # GET /api/health (Database & service ping)
│   │   │   ├── analyze.py           # POST /api/analyze, GET /api/categories
│   │   │   ├── ocr.py               # POST /api/ocr/expiry
│   │   │   ├── disposal.py          # POST /api/disposal/recommend, GET /api/disposal-guide
│   │   │   ├── facilities.py        # GET /api/facilities, GET /api/facilities/{id}
│   │   │   ├── waste_items.py       # CRUD & state transitions for tracked items
│   │   │   ├── dashboard.py         # GET /api/dashboard/summary, /api/dashboard/analytics
│   │   │   ├── assistant.py         # POST /api/assistant/chat (Grounded Q&A)
│   │   │   └── admin.py             # Admin stats, rule editor, manual event logger
│   │   ├── models/                  # SQLAlchemy Models
│   │   │   ├── waste_item.py        # WasteItem model & DB check constraints
│   │   │   ├── disposal_rule.py     # DisposalRule model & verification status
│   │   │   ├── collection_facility.py # CollectionFacility locator model
│   │   │   └── waste_event.py       # WasteEvent immutable audit trail
│   │   ├── schemas/                 # Pydantic v2 schemas
│   │   ├── services/
│   │   │   ├── image_validator.py   # Magic-byte file validation (JPEG/PNG/WEBP, 10MB limit)
│   │   │   ├── classifier.py        # Pluggable ClassifierAdapter (Demo & RealModel)
│   │   │   ├── ocr.py               # Expiry-Date OCR & date normalizer
│   │   │   ├── rules_engine.py      # Deterministic disposal recommendation engine
│   │   │   ├── assistant_service.py # Grounded Q&A assistant with clinical guardrails
│   │   │   └── seed_data.py         # Demo data seeder & reset utility
│   │   ├── config.py                # Environment settings & admin key
│   │   ├── database.py              # SQLite engine, sessions, foreign key pragmas
│   │   ├── logging_config.py        # Privacy-preserving logging
│   │   ├── state_machine.py         # 5-stage waste lifecycle state machine
│   │   └── main.py                  # FastAPI entrypoint & lifespan
│   ├── tests/                       # Automated pytest suite (82 tests)
│   ├── requirements.txt             # Python dependencies
│   ├── pytest.ini
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AssistantChat.tsx    # Shared chat component with voice, TTS, sources & actions
│   │   │   ├── ChatDrawer.tsx       # Slide-out drawer with focus trap & Esc key
│   │   │   ├── FloatingChatLauncher.tsx # Global floating launcher button
│   │   │   ├── Navbar.tsx           # Navigation with live health indicator pill & Assistant link
│   │   │   ├── Footer.tsx           # Botanical green footer with legal & safety disclaimers
│   │   │   ├── Layout.tsx           # Global page layout container & AssistantProvider
│   │   │   └── StatusBadge.tsx      # 5-status lifecycle badge with icons
│   │   ├── context/
│   │   │   └── AssistantContext.tsx # Global assistant context & analysis metadata passing
│   │   ├── hooks/
│   │   │   ├── useSpeechRecognition.ts # Web Speech API recognition hook
│   │   │   └── useSpeechSynthesis.ts   # Web Speech Synthesis TTS hook
│   │   ├── pages/
│   │   │   ├── HomePage.tsx         # Section 4A Landing Page with "Ask the Assistant" CTA
│   │   │   ├── IdentifyPage.tsx     # Section 4B AI Waste Identification
│   │   │   ├── OcrPage.tsx          # Section 4C Expiry-Date OCR & Verification
│   │   │   ├── RecommendationsPage.tsx # Section 4D Rules Recommendation Engine
│   │   │   ├── AssistantPage.tsx    # Section 4E Full-page Grounded AI Disposal Assistant
│   │   │   ├── FacilitiesPage.tsx   # Section 4F Collection Centre Locator
│   │   │   ├── DashboardPage.tsx    # Section 4G Digital Twin Tracking & Recharts
│   │   │   ├── GuidePage.tsx        # Section 4H Searchable Material Disposal Guide
│   │   │   ├── AboutPage.tsx        # Section 4I Problem statement & prototype scope
│   │   │   ├── AdminPage.tsx        # Section 4J Development Admin Console
│   │   │   ├── PrivacyPage.tsx      # Section 8 Privacy Policy & Data Retention
│   │   │   ├── SafetyPage.tsx       # Safety instructions & medical disclaimer
│   │   │   ├── DocsPage.tsx         # API specs & architecture documentation
│   │   │   ├── ContactPage.tsx      # Municipal outreach & support directory
│   │   │   └── NotFoundPage.tsx     # 404 handler
│   │   ├── tests/
│   │   │   ├── AssistantChat.test.tsx  # Vitest chat UI & resilience tests (5 tests)
│   │   │   ├── AssistantVoice.test.tsx # Vitest voice & TTS tests (8 tests)
│   │   │   └── setup.ts             # JSDOM test setup & polyfills
│   │   ├── types/index.ts           # Comprehensive TypeScript interfaces
│   │   ├── App.tsx                  # React Router routes
│   │   └── index.css                # Botanical green (#0F3E2E) & teal (#14B8A6) design system
│   ├── package.json
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── .env.example
│
├── docs/
│   └── AUDIT.md                     # Complete project audit against PROJECT_SPEC.md & ASSISTANT_SPEC.md
├── PROJECT_SPEC.md                  # Project Specification (Source of Truth)
└── README.md                        # Master Documentation
```

---

## 2. Implemented Features Summary

| Feature | Spec Reference | Implementation Highlights |
|---|---|---|
| **AI Waste Identification** | Section 4B | Magic-byte validation (`JPEG`, `PNG`, `WEBP`, 10MB limit). Pluggable `ClassifierAdapter` (`DemoClassifier` & `RealModelClassifier`). Drag-and-drop, camera capture, preview, replace/remove controls. Categorizes into 5 packaging classes. |
| **Expiry-Date OCR** | Section 4C | Text extraction using OCR with regex candidate parsing for `MM/YYYY`, `MM/YY`, `DD/MM/YYYY`. Distinguishes `MFG/BATCH` from `EXP`. User confirmation step and manual override fallback. Shows `"Expiry not verified"` unless confirmed. |
| **Disposal Recommendations** | Section 4D | Deterministic backend rules engine decoupled from LLMs. Evaluates category, material, confirmed expiry status, and location. Mandates pharmacy take-backs for tablets and specialized delamination for blister foils. Never recommends flushing medicines. |
| **Grounded AI Assistant** | Section 4E | Dual mode: Rules-backed FAQ (`rules_grounded`) and LLM-grounded (`llm_grounded`). Mode badge displayed in UI. Verified source chips (link only verified URLs). Suggested-action buttons (never auto-navigates). Capped 6-turn history. Emergency refusal for poison/overdose directing to 112. |
| **Assistant Chat UI Modes** | ASSISTANT_SPEC §2 | Global floating launcher on all pages, slide-out chat drawer with focus trap and `Escape` key handler, and full-page `/assistant` route. Context passing from Identify/OCR pages without sending raw image data. |
| **Voice Input & Text-to-Speech** | ASSISTANT_SPEC §3 | Browser Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`). Language selector (`en-IN` default, `hi-IN`, `kn-IN`). Visible note that answers are in English. One-time privacy notice on first use. Live interim results in input box with editable final transcript. Text-to-speech (`speechSynthesis`) with Read Aloud buttons, global Voice Replies toggle (OFF by default), and Stop button. Filters out URLs. |
| **Collection Centre Locator** | Section 4F | Search by city or PIN code. Filter by accepted categories and verified status. Direct directions links only for verified addresses. Example facilities explicitly labelled `[EXAMPLE – not a real facility]`. Assistant never invents unverified facilities. |
| **Digital Twin Dashboard** | Section 4G | Real-time KPI counts, Recharts visualizations (Category Distribution donut, Waste-Flow Activity timeline), 5-step process-flow pipeline cards. Distinguishes User-Reported vs Collected vs Verified Processed quantities. Seed Demo & Reset Demo buttons. Item event history modal. |
| **Waste Lifecycle State Machine** | Section 5 & 9 | Strict 5-stage forward state machine: `identified` → `awaiting_confirmation` → `collection_pending` → `collected` → `processed`. Transitioning to `processed` strictly requires an associated `WasteEvent` audit record with verified actor and evidence reference. |
| **Material Disposal Guide** | Section 4H | Searchable articles with material breakdowns, appropriate disposal routes, what NOT to do warnings, and municipal rule dependencies. |
| **Development Admin Console** | Section 4J | Protected development console (`X-Admin-Key` header / query param) to manage collection facilities, add disposal rules, and log verified batch recovery events. |

---

## 3. Quickstart & Execution Commands (Windows PowerShell)

### Prerequisites
- **Python 3.10+** (Tested on Python 3.14 on Windows)
- **Node.js 18+** (Tested on Node.js v24 on Windows)
- **Supported Browser:** Google Chrome or Microsoft Edge (recommended for Web Speech API SpeechRecognition & SpeechSynthesis support)

---

### Step 1: Backend Setup & Launch

Open a Windows PowerShell terminal:

```powershell
# Navigate to the backend directory
cd c:\Users\Lenovo\OneDrive\Documents\Desktop\PROJECT_SPEC.md\backend

# Create virtual environment (if not already created)
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server via Uvicorn
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

- **API Documentation (Swagger UI):** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **Health Probe:** [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

---

### Step 2: Frontend Setup & Launch

Open a second Windows PowerShell terminal:

```powershell
# Navigate to the frontend directory
cd c:\Users\Lenovo\OneDrive\Documents\Desktop\PROJECT_SPEC.md\frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

- **Frontend Web Application:** [http://localhost:5173/](http://localhost:5173/)
- **Full-Page Assistant Route:** [http://localhost:5173/assistant](http://localhost:5173/assistant)
- **Digital Twin Dashboard:** [http://localhost:5173/dashboard](http://localhost:5173/dashboard)

---

## 4. Configuration & Environment Variables

All configuration is driven by standard environment variables. Files `.env.example` are provided with safe placeholder values only (no secrets committed).

### Backend Configuration (`backend/.env`)

```ini
# System Name & Environment
PROJECT_NAME="PharmaCycle AI - Smart Pharmaceutical Waste Assistant"
ENVIRONMENT=development
LOG_LEVEL=INFO

# Database Connection (SQLite default with foreign-key PRAGMA enforcement)
DATABASE_URL=sqlite:///./pharmacycle.db

# CORS Allowed Origins
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Server Binding
HOST=127.0.0.1
PORT=8000

# File Upload & Image Retention Policy (Section 8)
# Maximum permitted upload size: 5MB (5242880 bytes) up to 10MB
MAX_UPLOAD_SIZE_BYTES=5242880
# When false (default), images are processed in-memory and NEVER saved to disk
RETAIN_UPLOADED_IMAGES=false
UPLOAD_DIR=./uploads

# AI Classification Mode (Section 4B)
# "demo" (deterministic simulation, confidence=null) or "real" (loads ONNX model from MODEL_PATH)
MODEL_MODE=demo
MODEL_PATH=./models/waste_classifier.onnx

# Development Admin Secret Key (Section 4J)
ADMIN_SECRET_KEY=pharmacycle-dev-admin-key-2026

# Grounded AI Assistant (Section 4E) - Optional External LLM Keys
# If either key is set, the assistant operates in "llm_grounded" mode.
# If omitted, the assistant operates deterministically in zero-dependency "rules_grounded" mode.
# GEMINI_API_KEY=your_gemini_api_key_here
# OPENAI_API_KEY=your_openai_api_key_here
```

### Frontend Configuration (`frontend/.env`)

```ini
# Backend API Base URL (proxied via vite.config.ts in local development)
VITE_API_BASE_URL=http://localhost:8000
```

---

## 5. Demo Mode vs Real Model & Honesty Rules

PharmaCycle AI strictly enforces transparency principles: **no simulated demo data is ever misrepresented as real computer vision or real facilities**.

1. **AI Vision Classification (`MODEL_MODE=demo`):**
   - The classifier returns `model_mode: "demo"` and `confidence: null`.
   - The frontend displays `"Not applicable (Demo Simulation)"` rather than inventing a false numerical confidence score (e.g., 97.4%).
   - In `MODEL_MODE=real`, authentic softmax probabilities are calculated and returned.
2. **Expiry-Date OCR:**
   - Expiry dates are marked `"Expiry not verified"` until the user reviews and confirms them. Dates entered manually by the user are explicitly flagged as `"user-provided"`.
   - Protects detected manufacturing dates (`MFG`/`MFD`) from false expiration interpretation.
3. **Example Facilities:**
   - All seeded demo facilities are prominently titled with `[EXAMPLE – not a real facility]` (e.g. *"GreenCross Eco Pharmacy [EXAMPLE – not a real facility]"*).
   - Unverified facilities display `"Acceptance not verified"` and are excluded from confirmed blister recommendations.
4. **Verifiable Citations Only:**
   - Recommendations reference published public guidance from WHO, US FDA, US EPA, or UK WRAP. No regulations or citation URLs are fabricated.
5. **Dashboard Quantity Separation:**
   - The Digital Twin dashboard strictly distinguishes *Estimated / User-Reported* from *Recorded Collection* and *Verified Processed*. Detected items are never counted as recycled material without an event record.
6. **State Machine Processing Proof:**
   - Transitioning an item to `processed` status strictly requires an associated `WasteEvent` audit record with an identified actor and evidence reference.

---

## 6. Grounded AI Disposal Assistant & Voice Input

### Assistant Engine Modes
- **Rules-Backed FAQ Mode (`rules_grounded`):** Default zero-dependency mode. Matches user queries against verified disposal rules and packaging guide passages.
- **LLM-Grounded Mode (`llm_grounded`):** Activated when `GEMINI_API_KEY` or `OPENAI_API_KEY` is present. Prompts the LLM strictly with retrieved guidance context.
- **Mode Badge:** The active mode is visibly labelled at the top of the chat interface.

### Emergency Refusal Guardrails
- Queries mentioning poisoning, overdoses, chemical ingestion, or pet/child ingestion trigger an immediate clinical safety refusal (`refused=true`).
- The assistant renders a high-visibility red alert bubble and directs the user to emergency services: **Emergency Hotline (112)** or National Poison Control.

### Voice Input (Web Speech API)
- **Browser Compatibility:** Google Chrome and Microsoft Edge support the Web Speech API natively. If an unsupported browser is detected, the microphone button is hidden and the note *"Voice input isn't supported in this browser; please type."* is displayed.
- **User-Triggered Only:** The microphone is never accessed automatically.
- **One-Time Privacy Notice:** On first mic click, the application displays:
  > *"Voice recognition is provided by your browser and may send audio to your browser vendor's speech service. PharmaCycle AI never records, stores, or uploads audio ourselves, and never sends audio to our backend."*
- **Live Transcription & Editing:** Interim speech results appear live in the input box. The final transcript remains completely editable. The user explicitly presses Send; recognition never auto-submits.
- **Language Selector:** Supports English (India) `en-IN` (default), Hindi `hi-IN`, and Kannada `kn-IN`, with a visible note that answers are in English.
- **Error Handling:** Graceful error messages for `not-allowed`, `no-speech`, `audio-capture`, and `network`.
- **Lifecycle Cleanup:** Recognition automatically aborts when the drawer closes, the route changes, or the component unmounts.

### Text-to-Speech (speechSynthesis)
- **Read Aloud Button:** Available on each assistant answer bubble.
- **Global Voice Replies Toggle:** In the voice toolbar (OFF by default). When enabled, automatically speaks new assistant answers.
- **Stop Audio Button:** Immediately halts speech synthesis via `window.speechSynthesis.cancel()`.
- **URL & Markdown Sanitization:** Strips URLs (`https://...`), citations, and markdown formatting before speaking.

---

## 7. How to Load and Reset Demo Data

On the **Digital Twin Dashboard** (`/dashboard`):
- Click **"Seed Demo Data"** to load 6 sample pharmaceutical waste items across the lifecycle states (`identified`, `awaiting_confirmation`, `collection_pending`, `collected`, `processed`) along with supporting audit events.
- Click **"Reset Demo Data"** to purge all demo-marked records while preserving genuine user scans.
- Alternatively, call the REST API endpoints:
  ```powershell
  Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/api/demo/seed
  Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/api/demo/reset
  ```

---

## 8. Development Admin Console (`/admin`)

- **Route:** `http://localhost:5173/admin` (intentionally excluded from public navigation menus per Section 4J).
- **Authentication:** Protected by the token configured in `ADMIN_SECRET_KEY` (default: `pharmacycle-dev-admin-key-2026`).
- **Features:**
  - View database counts (facilities, rules, items, events).
  - Add, edit, verify, or delete collection facilities.
  - Add, edit, verify, or delete disposal guidance rules.
  - Log batch collection custody transfers and high-temperature processing events.
- **Security Limitation Notice:**
  > [!WARNING]
  > The admin console uses a shared token (`X-Admin-Key`) designed for local development and hackathon evaluation. In a production enterprise deployment, this MUST be replaced by OAuth 2.0 / OIDC with fine-grained Role-Based Access Control (RBAC), audit log signatures, and rate limiting.

---

## 9. Automated Testing & Verification

### Running Backend Tests (pytest)
```powershell
cd backend
.\venv\Scripts\Activate.ps1
python -m pytest -v
```
**Results:** **82 passed** (0 failed, 2 warnings) in ~1.5 seconds.
- `tests/test_health.py` (2 tests): Database connection probe, health check.
- `tests/test_models.py` (6 tests): SQLAlchemy database constraints, unique foreign keys.
- `tests/test_state_machine.py` (5 tests): Strict 5-stage lifecycle state machine transitions, invalid leap rejections, processing proof requirements.
- `tests/test_analyze.py` (8 tests): Image format validation (JPEG/PNG/WEBP), 5MB size limit rejection, demo classifier transparency (`confidence=null`).
- `tests/test_ocr.py` (20 tests): Date parsing formats (`MM/YYYY`, `MM/YY`, `DD/MM/YYYY`), `EXP` vs `MFG` discrimination, ambiguous date flags.
- `tests/test_disposal.py` (8 tests): Deterministic rules engine recommendations across all 5 waste categories, no-flush mandate for medicines.
- `tests/test_facilities.py` (7 tests): City and PIN search, category acceptance filtering, `EXAMPLE – not a real facility` labelling checks.
- `tests/test_waste_items_and_dashboard.py` (6 tests): KPI aggregation, process flow counts, user-reported vs collected vs processed quantities, demo seed and reset.
- `tests/test_assistant_and_admin.py` (20 tests): Grounded assistant retrieval, intent routing, emergency refusals, token-protected admin endpoints.

### Running Frontend Tests (Vitest)
```powershell
cd frontend
npm test
```
**Results:** **13 passed** across 2 test files in ~2.5 seconds:
- `src/tests/AssistantChat.test.tsx` (5 tests): Typed question send/reply, verified source links, emergency refusal bubble rendering, input preservation on network failure, drawer focus trap & Escape handling.
- `src/tests/AssistantVoice.test.tsx` (8 tests): Unsupported browser detection, first-use one-time privacy notice, interim & final transcript live updates, transcript editing before send, permission denied handling, language selector switching, drawer close cleanup, and text-to-speech read aloud/stop controls.

### Running TypeScript Check & Production Build
```powershell
cd frontend
npm run build
```
**Results:** `tsc -b && vite build` succeeds with **0 errors**.

---

## 10. Features Requiring External API Keys or Trained Models

PharmaCycle AI is **100% functional out-of-the-box without paid API keys or proprietary weights**. The following optional capabilities connect to external resources when configured:

| Capability | Default State (Zero-Dependency) | External Dependency / Requirement |
|---|---|---|
| **AI Packaging Vision Model** | Runs in `MODEL_MODE=demo` with sample image fixtures and `confidence=null`. | Requires pre-trained model weights (ONNX format) placed at `MODEL_PATH`. |
| **Expiry-Date OCR** | Transparently runs in demo/rule-based OCR mode with clear manual date entry fallback. | Requires `easyocr` Python package and downloaded PyTorch detection/recognition weights (~150MB). |
| **Grounded AI Assistant** | Operates in deterministic `rules_grounded` FAQ mode matching queries against the verified disposal rule database. | Requires `GEMINI_API_KEY` (or `OPENAI_API_KEY`) to run in generative `llm_grounded` conversational mode. |
| **Interactive Facility Maps** | Uses standard Leaflet.js with free OpenStreetMap tiles. No API key required. | Google Maps or Mapbox tiles can be configured if commercial traffic layers are desired. |

---

## 11. Known Prototype Limitations

1. **Physical Microphone Hardware Verification:**  
   In automated testing and headless Chromium environments, acoustic capture through a physical hardware microphone could not be exercised. All Web Speech API event sequences (`onstart`, `onresult` with interim/final flags, `onerror`, `onend`, `abort`, `stop`) were verified using mock implementations in Vitest and interactive browser DOM testing.
2. **Physical Audio Speaker Output:**  
   Acoustic speaker output from `speechSynthesis.speak()` was verified via DOM dispatch and speech synthesis event binding rather than physical audio decibel measurement.
3. **Computer Vision Scope:**  
   Visual classification identifies packaging categories (blister foils, bottles, cartons, loose tablets); it does not chemically analyze pill chemical composition or pharmacological purity from a photograph.
4. **Local SQLite Database:**  
   Local SQLite database with WAL mode is used for prototyping. Production deployment should migrate to PostgreSQL with read replicas and point-in-time recovery.
