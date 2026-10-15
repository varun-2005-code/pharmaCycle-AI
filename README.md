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
   *All 47 tests pass covering classifiers, OCR, disposal rules, facilities locator, dashboard analytics, and state transitions.*

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

3. (Optional) Run production typecheck & build:
   ```powershell
   npm run build
   ```

---

## 5. Backend REST API Reference

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
| `POST`| `/api/assistant/chat` | Grounded AI Q&A assistant with citations |
| `GET` | `/api/admin/stats` | Admin database overview metrics |
| `POST`| `/api/admin/rules` | Add new disposal guidance rule |
| `POST`| `/api/admin/events` | Log verified batch destruction or processing event |

---

## 6. Authentication & Security Disclosure

- **Development Admin Key:** `pharmacycle-dev-admin-key-2026` (passed via `X-Admin-Key` header or through the Admin Console UI).
- **Privacy Policy:** Uploaded images are processed in memory and never retained beyond processing unless configured via `RETAIN_UPLOADED_IMAGES=True`.
- **Zero Hallucination Guarantee:** The disposal engine uses deterministic rules grounded in WHO, FDA, and EPA guidelines. Demo mode explicitly returns `model_mode="demo"` and `confidence=null` and is never misrepresented as computer vision.
