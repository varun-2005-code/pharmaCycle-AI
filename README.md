# PharmaCycle AI — Smart Pharmaceutical Waste Assistant

> **"Identify Smart. Dispose Safe. Recover Responsibly."**

PharmaCycle AI is an environmental-health technology application designed to help households, pharmacies, and waste handlers properly identify pharmaceutical waste, separate medicines from composite packaging (such as PVC/Alu blister foils), discover authorized collection facilities, and track waste items through a verified Digital Twin state machine.

---

## 1. System Architecture

```
PROJECT_SPEC.md/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── health.py          # GET /api/health (Database & service ping)
│   │   ├── models/                # SQLAlchemy Models (Section 5)
│   │   │   ├── __init__.py
│   │   │   ├── waste_item.py      # WasteItem model & constraints
│   │   │   ├── disposal_rule.py   # DisposalRule model & verification status
│   │   │   ├── collection_facility.py # CollectionFacility locator model
│   │   │   └── waste_event.py     # WasteEvent audit trail model
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   └── health.py          # Pydantic v2 health response schema
│   │   ├── config.py              # Environment settings & CORS
│   │   ├── database.py            # SQLite engine, sessions, schema init
│   │   ├── logging_config.py      # Privacy-preserving logging
│   │   ├── state_machine.py       # 5-stage waste lifecycle state machine
│   │   └── main.py                # FastAPI entrypoint & lifespan
│   ├── tests/
│   │   ├── conftest.py            # Isolated in-memory SQLite fixtures
│   │   ├── test_health.py         # /api/health integration tests
│   │   ├── test_models.py         # SQLAlchemy models & constraint tests
│   │   └── test_state_machine.py  # Lifecycle transitions & audit tests
│   ├── .env.example               # Environment template
│   ├── .env                       # Active local environment
│   ├── pytest.ini                 # Pytest testpaths & pythonpath
│   └── requirements.txt           # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx         # Section 4A navbar with live /api/health pill
│   │   │   ├── Footer.tsx         # Section 4A footer with disclaimer
│   │   │   ├── Layout.tsx         # Global page layout
│   │   │   └── StatusBadge.tsx    # 5-status lifecycle badge with icons
│   │   ├── pages/                 # All specification placeholder routes
│   │   │   ├── HomePage.tsx       # Section 4A Landing Page
│   │   │   ├── IdentifyPage.tsx   # Section 4B AI Waste Identification
│   │   │   ├── OcrPage.tsx        # Section 4C Expiry-Date OCR
│   │   │   ├── RecommendationsPage.tsx # Section 4D Rules Recommendation
│   │   │   ├── AssistantPage.tsx  # Section 4E Grounded AI Assistant
│   │   │   ├── FacilitiesPage.tsx # Section 4F Collection Centre Locator
│   │   │   ├── DashboardPage.tsx  # Section 4G Digital Twin Dashboard
│   │   │   ├── GuidePage.tsx      # Section 4H Material Disposal Guide
│   │   │   ├── AboutPage.tsx      # Section 4I About & Limitations
│   │   │   ├── AdminPage.tsx      # Section 4J Development Admin Console
│   │   │   ├── PrivacyPage.tsx    # Section 8 Privacy Policy
│   │   │   ├── SafetyPage.tsx     # Handling Safety Guidelines
│   │   │   ├── DocsPage.tsx       # Documentation & Swagger specs
│   │   │   ├── ContactPage.tsx    # Municipal Outreach Directory
│   │   │   └── NotFoundPage.tsx   # 404 handler
│   │   ├── types/
│   │   │   └── index.ts           # Shared TypeScript interfaces
│   │   ├── App.tsx                # React Router v7 scaffold
│   │   ├── index.css              # Botanical green & teal theme system
│   │   └── main.tsx               # Application mount
│   ├── tailwind.config.js         # Theme tokens (botanical-900, tealAccent-500)
│   ├── postcss.config.js
│   ├── vite.config.ts             # Dev proxy (/api -> http://127.0.0.1:8000)
│   └── package.json
│
├── PROJECT_SPEC.md                # Project Specification
└── README.md                      # Setup and Run Guide
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

- **Validation:** Attempting backward transitions or skipping states (e.g., `identified` -> `collected`) raises an `InvalidStateTransitionError`.
- **Processed Status Requirement:** Per specification section 3, 5, and 9: An item cannot reach `processed` unless an associated `WasteEvent` is created with an identified actor and evidence reference.

---

## 3. Quickstart & Execution Commands

### Prerequisites
- Python 3.10+ (tested with Python 3.14)
- Node.js 18+ & npm (tested with Node v24)

---

### Backend Setup & Launch

1. Navigate to the backend directory:
   ```powershell
   cd backend
   ```

2. Activate the virtual environment:
   - **Windows PowerShell:**
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **Linux / macOS:**
     ```bash
     source venv/bin/activate
     ```

3. (Optional if already installed) Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the automated test suite:
   ```bash
   pytest -v
   ```
   *All 13 tests should pass (model constraints, relationships, state machine validations, and API health checks).*

5. Start the FastAPI backend server:
   ```powershell
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   - **Root API:** http://127.0.0.1:8000/
   - **Health Endpoint:** http://127.0.0.1:8000/api/health
   - **Swagger Interactive Docs:** http://127.0.0.1:8000/docs

---

### Frontend Setup & Launch

1. Open a new terminal and navigate to the frontend directory:
   ```powershell
   cd frontend
   ```

2. Install dependencies:
   ```powershell
   npm install
   ```

3. Start the Vite development server:
   ```powershell
   npm run dev
   ```
   - **Application URL:** http://localhost:5173/

The frontend includes a live backend connectivity indicator in the top navbar that queries `GET /api/health` and verifies that the SQLite database is healthy and reachable.

---

## 4. API Endpoints (Foundation Stage)

| Method | Endpoint | Description | Status Code |
|---|---|---|---|
| `GET` | `/` | Root service descriptor & links | `200 OK` |
| `GET` | `/api/health` | Service & SQLite database connectivity check | `200 OK` / `503 Unavailable` |
| `GET` | `/docs` | Swagger OpenAPI documentation UI | `200 OK` |

---

## 5. Hackathon Prototype Disclosure

Identifying a medicine strip or packaging blister does not establish chemical composition, drug authenticity, or municipal curbside recyclability. Never flush medicines into residential water systems.
