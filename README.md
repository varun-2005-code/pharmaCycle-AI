# PharmaCycle AI — Smart Pharmaceutical Waste Assistant

> **"Identify Smart. Dispose Safe. Recover Responsibly."**

PharmaCycle AI is an environmental-health technology web application designed to help households, pharmacies, and waste handlers properly identify pharmaceutical waste, separate medicines from composite packaging (such as PVC/Alu blister foils), discover authorized collection facilities, and track waste items through a verified Digital Twin state machine.

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
│   │   ├── models/                  # SQLAlchemy Models (Section 5)
│   │   │   ├── waste_item.py        # WasteItem model & DB check constraints
│   │   │   ├── disposal_rule.py     # DisposalRule model & verification status
│   │   │   ├── collection_facility.py # CollectionFacility locator model
│   │   │   └── waste_event.py       # WasteEvent immutable audit trail
│   │   ├── schemas/                 # Pydantic v2 schemas
│   │   ├── services/
│   │   │   ├── image_validator.py   # Magic-byte file validation (JPEG/PNG/WEBP, 5MB limit)
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
│   ├── tests/                       # Automated pytest suite (47 tests)
│   │   ├── test_health.py
│   │   ├── test_models.py
│   │   ├── test_state_machine.py
│   │   ├── test_analyze.py
│   │   ├── test_ocr.py
│   │   ├── test_disposal.py
│   │   ├── test_facilities.py
│   │   ├── test_waste_items_and_dashboard.py
│   │   └── test_assistant_and_admin.py
│   ├── requirements.txt             # Python dependencies
│   └── pytest.ini
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx           # Navigation with live health indicator pill
│   │   │   ├── Footer.tsx           # Botanical green footer with legal & safety disclaimers
│   │   │   ├── Layout.tsx           # Global page layout container
│   │   │   └── StatusBadge.tsx      # 5-status lifecycle badge with icons
│   │   ├── pages/
│   │   │   ├── HomePage.tsx         # Section 4A Landing Page
│   │   │   ├── IdentifyPage.tsx     # Section 4B AI Waste Identification
│   │   │   ├── OcrPage.tsx          # Section 4C Expiry-Date OCR & Verification
│   │   │   ├── RecommendationsPage.tsx # Section 4D Rules Recommendation Engine
│   │   │   ├── AssistantPage.tsx    # Section 4E Grounded AI Disposal Assistant
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
│   │   ├── types/index.ts           # Comprehensive TypeScript interfaces
│   │   ├── App.tsx                  # React Router v7 routes
│   │   └── index.css                # Botanical green (#0F3E2E) & teal (#14B8A6) tokens
│   ├── package.json
│   └── vite.config.ts
│
├── PROJECT_SPEC.md                  # Project Specification (Source of Truth)
└── README.md                        # Master Documentation
```

---

## 2. Waste Status State Machine

The platform implements a strict 5-stage waste lifecycle state machine:

```
[ identified ]
      │
      ▼
[ awaiting_confirmation ]
      │
      ▼
[ collection_pending ]
      │
      ▼
[ collected ]
      │
      ▼
[ processed ]  <-- Strictly requires an associated WasteEvent audit record!
```

- **Transitions:** `identified` → `awaiting_confirmation` → `collection_pending` → `collected` → `processed`.
- **Validation:** Disallowed transitions (e.g. backward leaps or skipping states) raise `InvalidStateTransitionError` with HTTP 400.
- **Processed Status Requirement:** Per specification section 3, 5, and 9: An item cannot reach `processed` unless an associated `WasteEvent` is created with an identified actor and evidence reference.

---

## 3. Implemented Features Summary

| Feature | Spec Section | Implementation |
|---|---|---|
| **AI Waste Identification** | Section 4B & 6 | Magic-byte file validation (JPEG/PNG/WEBP, 5MB limit). Pluggable `ClassifierAdapter` (`DemoClassifier` & `RealModelClassifier`). Drag-and-drop, camera capture, preview, demo selector, and uncertainty limitations. |
| **Expiry-Date OCR** | Section 4C & 6 | Regex date parsing for `MM/YYYY`, `MM/YY`, `DD/MM/YYYY`. Distinguishes `MFG/BATCH` from `EXP`. User confirmation checkbox and manual date override fallback. |
| **Disposal Recommendations** | Section 4D & 6 | Deterministic rules engine decoupled from LLMs. Evaluates category, material, confirmed expiry status, and location. Mandates pharmacy take-backs for tablets and specialized delamination for blister foils. |
| **Grounded AI Assistant** | Section 4E & 6 | Chat assistant with verifiable source citations (WHO, FDA, EPA, WRAP). Clinical safety guardrail refusing medical diagnosis or consumption advice. Operational without external API keys. |
| **Collection Centre Locator**| Section 4F & 6 | Search by city or PIN code. Filter by accepted categories and verified status. Direct Google Maps navigation link for verified locations. |
| **Digital Twin Dashboard**   | Section 4G & 6 | Real-time KPI counts, Recharts visualizations (Category Distribution donut, Waste-Flow Activity timeline), 5-step process-flow cards, and quantity distinction (User-Reported vs Collected vs Verified Processed). Load Demo & Reset Demo buttons. |
| **Material Disposal Guide**  | Section 4H & 6 | Searchable articles with material breakdowns, appropriate disposal routes, what NOT to do (red warnings), and municipal rule dependencies (amber alerts). |
| **Development Admin Console**| Section 4J & 6 | Protected development console (`X-Admin-Key`) to manage collection facilities, add disposal rules, and log verified batch recovery events. |

---

## 4. Quickstart & Execution Commands

### Prerequisites
- Python 3.10+ (tested with Python 3.14)
- Node.js 18+ (tested with Node v24)
- Modern web browser (Chrome, Edge, Firefox)

---

### Backend Setup & Launch

1. Navigate to the backend directory:
   ```powershell
   cd backend
   ```

2. Activate virtual environment:
   - **Windows:**
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **Linux / macOS:**
     ```bash
     source venv/bin/activate
     ```

3. Run the automated test suite:
   ```powershell
   pytest -v
   ```
   *All 78 tests pass across 9 test modules covering classifiers, OCR date parsing, disposal rules, facilities locator, dashboard analytics, state transitions, grounded assistant, and admin console.*

4. Launch the FastAPI server:
   ```powershell
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   - **API Docs (Swagger UI):** http://127.0.0.1:8000/docs
   - **Health Check:** http://127.0.0.1:8000/api/health

---

### Frontend Setup & Launch

1. In a separate terminal, navigate to the frontend directory:
   ```powershell
   cd frontend
   ```

2. Start the Vite development server:
   ```powershell
   npm run dev
   ```
   - **Application URL:** http://127.0.0.1:5173/

3. Run production typecheck & build:
   ```powershell
   npm run build
   ```
   *Runs `tsc -b && vite build` verifying zero TypeScript or packaging errors.*

---

## 5. Configuration & Environment Variables

All configuration is driven by standard environment variables (configured via `.env` files in `backend/` and `frontend/`).

### Backend Environment Variables (`backend/.env`)

| Variable | Default Value | Description |
|---|---|---|
| `PROJECT_NAME` | `"PharmaCycle AI - Smart Pharmaceutical Waste Assistant"` | System name displayed in API responses. |
| `ENVIRONMENT` | `development` | Operating environment (`development`, `staging`, `production`). |
| `LOG_LEVEL` | `INFO` | Logging level (`DEBUG`, `INFO`, `WARNING`, `ERROR`). |
| `DATABASE_URL` | `sqlite:///./pharmacycle.db` | SQLAlchemy connection string. Defaults to local SQLite database with foreign-key PRAGMA enforcement. |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Allowed CORS origins for the frontend single-page application. |
| `HOST` | `127.0.0.1` | Host address for uvicorn server binding. |
| `PORT` | `8000` | Port for FastAPI server. |
| `MAX_UPLOAD_SIZE_BYTES`| `5242880` (5MB) | Maximum permitted packaging image upload size. Enforced via stream length inspection. |
| `RETAIN_UPLOADED_IMAGES`| `false` | Image retention flag. When `false` (default), uploaded files are held only in memory during inference and never saved to disk. |
| `UPLOAD_DIR` | `./uploads` | Destination directory if image archiving is explicitly enabled. |
| `MODEL_MODE` | `demo` | Packaging classification engine mode: `demo` (deterministic simulation) or `real` (loads ONNX model). |
| `MODEL_PATH` | `./models/waste_classifier.onnx` | Filesystem path to trained ONNX model weights when `MODEL_MODE=real`. |
| `ADMIN_SECRET_KEY` | `pharmacycle-dev-admin-key-2026` | Dev secret key protecting the administrative management console (`X-Admin-Key` header). |
| `GEMINI_API_KEY` | `None` (Optional) | Google Gemini API key for `llm_grounded` assistant mode. If absent, operates in deterministic rules-grounded mode. |
| `OPENAI_API_KEY` | `None` (Optional) | OpenAI API key fallback for `llm_grounded` assistant mode. |

### Frontend Environment Variables (`frontend/.env`)

| Variable | Default Value | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000` | Target URL for backend REST API. Proxied via `vite.config.ts` in local development. |

---

## 6. Demo Mode Transparency & Data Integrity

PharmaCycle AI strictly adheres to the principle that **no demonstration data is ever misrepresented as real**:

1. **AI Vision Classification (`MODEL_MODE=demo`):**
   - The classifier returns `model_mode: "demo"` and `confidence: null`.
   - The frontend renders `"Not applicable (Demo Simulation)"` rather than inventing a false numerical confidence percentage (e.g. 98.4%).
   - When a trained model is loaded in `MODEL_MODE=real`, authentic softmax probabilities are calculated and returned.
2. **Expiry-Date OCR:**
   - Does not fabricate OCR dates. If EasyOCR is uninstalled or an image has unreadable printing, the API transparently returns `ocr_status: "unavailable"` or `is_ambiguous: true`.
   - Expiry dates are marked `"unverified"` until the user reviews and confirms them. Dates entered manually by the user are explicitly flagged as `"user-provided"`.
3. **Example Facilities:**
   - All seeded demo facilities are prominently titled with `EXAMPLE – not a real facility` (e.g., *"EXAMPLE – not a real facility: Bandra Green Take-Back Center"*).
   - Each card displays a prominent warning badge: `"Acceptance not verified"`. They are never suggested as confirmed final destinations.
4. **Verifiable Citations Only:**
   - Every recommendation references published public guidance from the World Health Organization (WHO), US FDA, US EPA, or UK WRAP. No regulations or citation URLs are fabricated.
5. **Quantity Separation:**
   - On the Digital Twin dashboard, user-estimated quantities are reported strictly as *Estimated / User-Reported*. Only items backed by an immutable `WasteEvent` are displayed as *Recorded Collection* or *Verified Processed*. Detections are never counted as recycled material.

---

## 7. Backend REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service & SQLite database health probe |
| `GET` | `/api/categories` | Supported visual classification categories & metadata |
| `POST`| `/api/analyze` | AI Waste packaging classification (multipart/form-data) |
| `POST`| `/api/ocr/expiry` | OCR text extraction and expiry-date parsing |
| `POST`| `/api/disposal/recommend` | Deterministic rules engine recommendation |
| `GET` | `/api/disposal-guide` | Searchable disposal guide articles |
| `GET` | `/api/facilities` | Collection facilities search with city/PIN/category filters |
| `GET` | `/api/facilities/{id}` | Single facility details |
| `GET` | `/api/dashboard/summary` | Digital Twin KPI summary numbers |
| `GET` | `/api/dashboard/analytics`| Recharts analytical data (categories, timeline, quantities) |
| `GET` | `/api/waste-items` | Filtered list of tracked waste items |
| `POST`| `/api/waste-items` | Register new waste item into state machine |
| `GET` | `/api/waste-items/{id}`| Detailed waste item with event history |
| `POST`| `/api/waste-items/{id}/events` | Advance state machine status (strictly validates rules) |
| `DELETE`| `/api/waste-items/{id}`| Delete waste item and events per Section 8 privacy |
| `POST`| `/api/demo/seed` | Seed interactive demo items and lifecycle events |
| `POST`| `/api/demo/reset`| Reset demo records |
| `POST`| `/api/assistant/chat` | Grounded AI Q&A assistant with citations and refusal guardrails |
| `GET` | `/api/admin/stats` | Admin database overview metrics (Admin-Protected) |
| `GET` | `/api/admin/facilities` | List all facilities with verification details (Admin-Protected) |
| `POST`| `/api/admin/facilities` | Create new collection facility record (Admin-Protected) |
| `PUT` | `/api/admin/facilities/{id}` | Update collection facility record (Admin-Protected) |
| `PATCH`| `/api/admin/facilities/{id}/verification` | Toggle facility verification status (Admin-Protected) |
| `DELETE`| `/api/admin/facilities/{id}` | Delete collection facility (Admin-Protected) |
| `GET` | `/api/admin/rules` | List all disposal rules with verification details (Admin-Protected) |
| `POST`| `/api/admin/rules` | Add new disposal guidance rule (Admin-Protected) |
| `PUT` | `/api/admin/rules/{id}` | Update disposal guidance rule (Admin-Protected) |
| `PATCH`| `/api/admin/rules/{id}/verification` | Toggle disposal rule verification status (Admin-Protected) |
| `DELETE`| `/api/admin/rules/{id}` | Delete disposal guidance rule (Admin-Protected) |
| `POST`| `/api/admin/events` | Log verified batch destruction or processing event (Admin-Protected) |
| `DELETE`| `/api/admin/waste-items/{id}` | Permanently delete waste item and audit trail (Admin-Protected) |

---

## 8. Grounded AI Disposal Assistant (Section 4E)

The **Disposal Assistant** (`/assistant`) provides interactive retrieval-based guidance for pharmaceutical waste questions:

- **Strict Knowledge Grounding:** Answers are generated **solely** from approved `DisposalRule` records and packaging guide articles.
- **Dual Engine Modes:**
  - **LLM-Grounded Mode (`llm_grounded`):** Activated when `GEMINI_API_KEY` (or `OPENAI_API_KEY`) is set in the environment. The LLM is prompted strictly with retrieved guidance context and commanded never to hallucinate external facts.
  - **Rules-Backed FAQ Mode (`rules_grounded`):** Deterministic, zero-network fallback that pairs user questions with verified passages. Active mode is visibly labelled in the UI.
- **Source References:** Every reply includes verified health and environmental citations (FDA, WHO, WRAP, EPA).
- **Refusal Guardrails:**
  - **Medical Advice & Diagnosis:** Strictly refuses assessing diseases, recommending drug dosages, or advising ingestion.
  - **Appearance-Based Safety Claims:** Strictly refuses claiming medicine is safe from visual appearance alone (explains that chemical potency loss and degradation occur without visible changes).
  - **Facility Hallucinations:** Strictly avoids inventing addresses or telephone numbers; routes users to the verified `/facilities` directory or local municipal authority.
  - **Ungrounded Topics:** Queries outside pharmaceutical waste disposal return *"Information unavailable."*
- **Four Spec Example Questions Handled:**
  1. *"How should I dispose of expired tablets?"*
  2. *"Can I put an empty blister pack in a plastic recycling bin?"*
  3. *"How do I read the expiry date on this medicine?"*
  4. *"What should I do if the expiry date is unreadable?"*

---

## 9. Development Admin Console & Security Limitations (Section 4J)

The **Admin Management Console** (`/admin`) provides administrative controls for facility registries and disposal guidance:

- **Token Protection:** Protected by the environment variable `ADMIN_SECRET_KEY` (defaulting in dev to `pharmacycle-dev-admin-key-2026`). Sent via HTTP header `X-Admin-Key` or URL query parameter `?admin_token=`. No hardcoded credentials exist in source code.
- **Hidden Navigation:** Per Section 4J, the `/admin` route is intentionally excluded from public navigation menus and footers.
- **Full CRUD Capabilities:**
  - **Facilities:** Create, read, update, delete, and toggle verification status (`verified` vs `unverified`).
  - **Guidance Rules:** Create, read, update, delete, and toggle verification status (`verified` vs `unverified`).
  - **Event Logging:** Record collection custody transfers and high-temperature thermal destruction events linked to waste items.
  - **Waste Item Deletion:** Full deletion option for tracked items (`DELETE /api/admin/waste-items/{id}` and public `DELETE /api/waste-items/{id}`) per user privacy protocol.
- **Development Limitations & Security Notice:**
  > [!WARNING]
  > The admin console utilizes a shared secret token mechanism (`X-Admin-Key`) for rapid development, testing, and continuous integration. It does **not** provide granular per-user identity, audit log signatures, or multi-factor authentication. In a production enterprise deployment, this MUST be replaced by OAuth 2.0 / OIDC with fine-grained Role-Based Access Control (RBAC), TLS termination, and rate limiting.

---

## 10. Privacy & Data Retention Policy (Section 8)

- **Zero Image Archiving:** Uploaded packaging images are processed strictly in memory and discarded immediately upon analysis completion.
- **Delete-Record Option:** Users and administrators can delete any tracked waste item and its associated lifecycle events at any time via the UI or REST API.
- **Audit Logging:** System logs sanitize sensitive health information and personal identifiable data (PID).

---

## 11. Features Requiring External API Keys or Trained Models

The application is engineered to be **100% functional out-of-the-box without paid API keys or proprietary weights**. However, the following optional capabilities connect to external resources when configured:

| Capability | Default State (Zero-Dependency) | External Dependency / Model Requirement |
|---|---|---|
| **AI Packaging Vision Model** | Runs in `MODEL_MODE=demo` with sample image fixtures and `confidence=null`. | Requires pre-trained model weights (ONNX format) trained on pharmaceutical packaging images (pointed to by `MODEL_PATH`). |
| **Expiry-Date OCR** | Transparently detects missing EasyOCR/PaddleOCR libraries and gracefully prompts the user with manual date entry. | Requires `easyocr` Python package and downloaded PyTorch detection/recognition weights (requires ~150MB disk space). |
| **Grounded AI Assistant** | Operates in deterministic `rules_grounded` FAQ mode matching queries against the verified disposal rule database. | Requires `GEMINI_API_KEY` (or `OPENAI_API_KEY`) to run in generative `llm_grounded` conversational mode. |
| **Interactive Facility Maps** | Uses standard Leaflet.js with free OpenStreetMap raster tiles. No API key required. | Google Maps or Mapbox tiles can be swapped in if vector styling or commercial traffic layers are desired. |

---

## 12. Automated Test Results

The codebase is thoroughly verified by automated tests across both the Python FastAPI backend and the React TypeScript frontend:

### Backend Test Suite (`pytest -v`)
- **Total Tests:** 78 passed (0 failed, 2 Starlette deprecation notices)
- **Execution Time:** ~1.60s
- **Module Coverage:**
  - `tests/test_health.py` (2 tests): Database connection probe, health check endpoints.
  - `tests/test_models.py` (6 tests): SQLAlchemy database constraints, unique foreign keys, and model schemas.
  - `tests/test_state_machine.py` (5 tests): Strict 5-stage lifecycle state machine transitions, invalid leap rejections, and processing proof validations.
  - `tests/test_analyze.py` (8 tests): Image format validation (JPEG/PNG/WEBP), 5MB size limit rejection, demo classifier transparency (`confidence=null`).
  - `tests/test_ocr.py` (20 tests): Date parsing formats (`MM/YYYY`, `MM/YY`, `DD/MM/YYYY`), `EXP` vs `MFG` discrimination, ambiguous date flags.
  - `tests/test_disposal.py` (8 tests): Deterministic rules engine recommendations across all 5 waste categories, no-flush mandate for medicines.
  - `tests/test_facilities.py` (7 tests): City and PIN search, category acceptance filtering, `EXAMPLE – not a real facility` labelling checks.
  - `tests/test_waste_items_and_dashboard.py` (6 tests): KPI aggregation, process flow counts, user-reported vs collected vs processed quantities, demo seed and reset.
  - `tests/test_assistant_and_admin.py` (16 tests): Grounded assistant refusals (medical advice, appearance safety, facility fabrication), token-protected admin endpoints.

### Frontend Quality & Type Checks (`npm run build`)
- **TypeScript Compiler (`tsc -b`):** 0 errors. All interfaces in `src/types/index.ts` strictly conform to backend Pydantic schemas.
- **Production Bundle (`vite build`):** Clean compilation into `dist/`. All 12 application pages and interactive components bundled successfully.

---

## 13. Known Prototype Limitations & Production Roadmap

As outlined in Section 4I of the specification, the prototype has defined boundaries:

1. **Computer Vision Constraints:**
   - Prototype cannot chemically analyze pill composition from a photograph; visual classification determines packaging category only.
   - Poor lighting, motion blur, and crumpled blister foils may cause visual misclassification, requiring user manual verification.
2. **Regulatory & Geographic Scope:**
   - Seeded disposal guidance reflects standard international guidelines (WHO, US FDA, UK WRAP). Local municipal regulations vary significantly by municipality and take precedence.
3. **Hardware & Scanning:**
   - Video feed scanning relies on standard browser WebRTC camera APIs.
4. **Single-Store Database:**
   - Local SQLite database with WAL mode is used for prototyping. Production deployment should migrate to PostgreSQL / CockroachDB with read replicas and point-in-time recovery.


