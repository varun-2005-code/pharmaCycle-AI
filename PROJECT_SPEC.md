# MASTER BUILD PROMPT — PHARMACYCLE AI

Act as a senior full-stack developer, AI/ML engineer, UI/UX designer, and hackathon product architect. Build a fully functional, responsive, end-to-end web application named **PharmaCycle AI — Smart Pharmaceutical Waste Assistant**.

Do not create only a landing page or static UI mockup. Build a working application with a frontend, backend, database integration, image-processing workflow, waste classification, OCR, disposal recommendation engine, collection locator, and Digital Twin dashboard.

Work directly in the current project workspace. Inspect the existing files before modifying anything. Preserve useful existing code, make appropriate architectural decisions, and run the application and tests before declaring the work complete.

## 1. PROJECT VISION

PharmaCycle AI is a specialized Smart Recycling Assistant that helps users identify pharmaceutical waste, distinguish medicines from packaging, understand safe disposal options, locate appropriate collection facilities, and track waste through the collection process.

The initial scope includes:

1. Expired or unused tablets and capsules.
2. Empty pharmaceutical blister packs made from plastic, aluminium, or multilayer materials.
3. Medicine bottles and containers.
4. Cardboard medicine cartons and paper leaflets.
5. Unknown pharmaceutical packaging requiring manual review.

The website must explain that identifying an object does not establish its expiry, safety, composition, or recyclability. The application must never automatically claim that a medicine is expired or that a blister pack is recyclable based solely on its appearance.

## 2. TECHNOLOGY STACK

Use the following stack unless the existing project has a working equivalent:

Frontend:
- React with TypeScript.
- Vite.
- Tailwind CSS.
- shadcn/ui or accessible equivalent components.
- Lucide icons.
- Recharts for charts.
- React Router for navigation.

Backend:
- Python FastAPI.
- Pydantic for request and response validation.
- SQLAlchemy for database access.
- SQLite for a simple local development setup, structured so it can be migrated to PostgreSQL.
- REST API endpoints with proper error handling.

AI and image processing:
- Pillow and OpenCV where appropriate.
- A pluggable image-classification service.
- EasyOCR or PaddleOCR for expiry-date text extraction.
- A separate, deterministic disposal-rules engine.
- An optional LLM integration for explanations, grounded in approved disposal guidance.

Development must work locally without requiring paid API keys. If a model, OCR package, external API, or LLM key is unavailable, the website must still run using a clearly labelled demo mode. Never pretend that demo predictions are real model predictions.

Create a requirements.txt for the backend and package.json for the frontend. Include a README with exact setup and execution instructions.

## 3. BRANDING AND DESIGN

Brand name: PharmaCycle AI.

Tagline: "Identify Smart. Dispose Safe. Recover Responsibly."

Create a polished, modern environmental-health technology interface suitable for a national-level student hackathon.

Visual direction:
- White and soft off-white backgrounds.
- Deep botanical green as the primary colour.
- Teal secondary accents.
- Muted grey text.
- Subtle green gradients.
- Clean cards, rounded corners, soft shadows and generous whitespace.
- Professional typography.
- Consistent spacing and iconography.
- Responsive mobile, tablet and desktop layouts.
- Smooth but restrained transitions.
- Light theme by default.

Avoid excessive neon colours, cluttered dashboards, oversized animations, generic AI imagery, and childish illustrations.

Use clear status badges for identified, awaiting confirmation, collection pending, collected, and processed. Do not use a processed status unless a real or explicitly simulated processing event supports it.

## 4. WEBSITE PAGES

Implement all of the following pages with working navigation.

### A. Home / Landing Page

Create a professional landing page containing:

- Navigation bar with logo, Home, Identify Waste, Disposal Guide, Collection Centres, Dashboard, About and Sign In.
- Hero heading: "Smarter Pharmaceutical Waste Management Starts Here."
- Supporting text explaining how AI assists with pharmaceutical waste identification and responsible disposal.
- Primary CTA: "Identify Waste".
- Secondary CTA: "Explore Disposal Guide".
- A visually attractive upload/scan illustration.
- Four feature cards: AI Identification, Expiry Assistance, Safe Disposal Guidance, and Waste Tracking.
- A workflow section: Identify → Verify → Dispose → Track.
- A statistics section using clearly labelled demo data or real data only when available.
- An explanation of the environmental problem.
- A responsible-disposal section.
- Footer with About, Privacy, Safety, Documentation and Contact links.

Buttons must navigate to functional pages.

### B. AI Waste Identification Page

This is the main feature and must be fully implemented.

Provide:
- Drag-and-drop image upload.
- Click-to-browse image upload.
- Camera capture where supported by the browser, with permission handling.
- Image preview before analysis.
- Remove and replace image controls.
- File validation for type and size.
- Supported formats: JPG, JPEG, PNG and WEBP.
- A clear Analyze Waste button.
- Loading indicator while processing.
- Useful error messages.
- An analysis result panel.

Use these visual classification categories:
- Medicine or tablet strip.
- Empty blister pack.
- Medicine bottle or container.
- Cardboard or paper pharmaceutical packaging.
- Unknown or other.

For each result display:
- Predicted visual category.
- Confidence score only when returned by the actual configured model.
- Model mode: real model or demo simulation.
- Short explanation of the prediction.
- Any uncertainty or limitations.
- Suggested next action.

Implement a backend image-analysis service with a pluggable model adapter.

If a trained model is not available, use a deterministic, explicitly labelled demo mode that allows the user to select a sample category and see the intended workflow. Do not claim that filename matching, random predictions, or hard-coded demo results constitute computer vision.

The system must support an "Unknown / Needs Review" outcome and must not force every image into a known category.

### C. Expiry-Date OCR

After the image is uploaded, provide an optional "Read Expiry Date" action.

Implement OCR on the uploaded image where the OCR engine is installed and operational.

Requirements:
- Extract visible text.
- Look for labels such as EXP, EXPIRY, USE BEFORE, and BEST BEFORE.
- Distinguish expiry dates from manufacturing dates where possible.
- Support common date formats such as MM/YYYY, MM/YY and DD/MM/YYYY.
- Show the extracted text and candidate date.
- Ask the user to confirm the date.
- Allow manual date entry when OCR fails.
- Handle unreadable, missing, ambiguous and conflicting dates safely.
- Never silently interpret a manufacturing date as an expiry date.
- Do not declare a medicine expired unless a date is confirmed and the date interpretation is sufficiently clear.

When a date is missing or uncertain, show "Expiry not verified."

For demo mode, let the user enter a sample expiry date manually and clearly indicate that it was user-provided.

Do not identify a medicine or determine whether it is genuine or safe from its appearance.

### D. Disposal Recommendation Engine

Build a dedicated rules engine in the backend. Keep critical disposal decisions separate from generative AI.

The engine must use:
- Waste category.
- User-confirmed item details.
- Confirmed expiry status, if available.
- Packaging material when known.
- User-selected location, if provided.
- Verified local disposal guidance and facility acceptance data.

Provide different recommendations for:

1. Expired or unused medicines:
   Recommend an authorized medicine take-back or collection option where available. Explain that users should follow the facility's instructions. Never recommend flushing medicines or placing them into ordinary recycling bins as a default.

2. Empty blister packs:
   Explain that many packs contain bonded plastic and aluminium, and ordinary recycling services may not accept them. Recommend a facility only if its acceptance of blister packs has been verified.

3. Medicine bottles:
   Check the material, contamination and local facility rules before recommending recycling.

4. Cardboard cartons and paper leaflets:
   Explain that clean paper packaging may be recyclable where local rules allow.

5. Unknown or contaminated items:
   Avoid speculative advice and direct users to the relevant municipal service or authorized waste handler.

Each recommendation should display:
- Recommended action.
- Why that action is suggested.
- Handling cautions.
- Applicable location or jurisdiction.
- Source title and source URL, if verified.
- Last verification date, if recorded.
- Confidence or uncertainty explanation.

Do not fabricate citations, regulations, collection facilities, or acceptance policies.

### E. Generative AI Disposal Assistant

Create a chat-style assistant that answers questions such as:
- "How should I dispose of expired tablets?"
- "Can I put an empty blister pack in a plastic recycling bin?"
- "How do I read the expiry date on this medicine?"
- "What should I do if the expiry date is unreadable?"

The assistant must:
- Use approved disposal guidance as its reference.
- Prefer a retrieval-based approach over unsupported free-form answers.
- Display source references for important disposal advice.
- State when information is unavailable.
- Avoid diagnosing diseases or advising users to consume medicines.
- Avoid claiming that a medicine is safe based on appearance.
- Avoid inventing local facilities or claiming unverified facilities accept pharmaceutical waste.

If no LLM key is configured, implement a functional rules-backed FAQ assistant with predefined responses and source references. Clearly label the assistant mode.

### F. Collection Centre Locator

Build a collection-centre directory with:
- Search by city or PIN code.
- Filter by accepted waste category.
- Search results in card format.
- Facility name, address, contact details, operating hours, accepted materials and source.
- Last-verified date.
- A map view if a suitable map service is configured.
- Directions links only when a verified address is available.

Only display real facilities when supported by verified data. Do not fabricate facility names, phone numbers, opening hours or acceptance policies.

Seed the database with clearly labelled example facilities for local testing if real verified data is unavailable. Never present these examples as real facilities.

If a facility's acceptance policy is unknown, show "Acceptance not verified" and do not recommend it as a confirmed destination.

If no eligible facility is found, explain how the user can contact the municipal waste-management authority or relevant authorized handler.

Location must be user-entered or explicitly authorized. Do not silently collect precise location.

### G. Digital Twin / Waste Tracking Dashboard

Create an interactive dashboard with:
- Total items identified.
- Items awaiting user confirmation.
- Items awaiting collection.
- Items collected.
- Items processed or recovered, supported by an event record.
- Category-wise waste distribution.
- Collection status breakdown.
- Waste-flow timeline.
- Recent activity table.
- Filters by date, category and status.
- Responsive charts using Recharts.
- Empty states when no data exists.

Include a process-flow visualization:
Household → Identification → Collection Point → Processing Facility → Confirmed Recovery or Final Treatment.

The dashboard must distinguish:
- Estimated or user-reported quantities.
- Recorded collection events.
- Verified processing and recovery events.

Do not infer recycled quantities from detected items.

Create a clearly labelled demo-data mode so judges can explore the dashboard immediately. Include a button to load sample data and another to reset it. Demo data must be distinguishable from actual records.

Provide an event history for each tracked item, including status changes, timestamps, responsible actor where known, and supporting evidence where available.

### H. Disposal Guide

Build a searchable guide covering:
- Expired and unused medicines.
- Empty blister packs.
- Medicine bottles.
- Cardboard cartons.
- Paper leaflets.
- Unknown pharmaceutical waste.

Each guide article must explain:
- What the item is.
- Common materials.
- Appropriate disposal route.
- What not to do.
- What depends on local rules.
- Official or verified reference links where available.

Clearly distinguish general advice from verified local instructions.

### I. About / Impact Page

Explain:
- The pharmaceutical waste problem.
- The purpose of PharmaCycle AI.
- How computer vision, OCR, rules-based guidance and tracking work together.
- The difference between identification and verified recycling.
- Expected environmental benefits without unsupported numerical claims.
- Prototype limitations and future development.

Include a transparent section titled "What the prototype can and cannot do."

### J. Optional Admin / Facility Management

Implement a simple development-only admin page that allows authorized development users to:
- Add or edit facility records.
- Record accepted waste categories.
- Update verification status.
- Add or edit disposal guidance.
- Record collection and processing events.

Do not expose administrative controls to normal users. Protect admin routes and explain the development authentication configuration in the README. Never hard-code real production credentials.

## 5. DATABASE DESIGN

Create suitable SQLAlchemy models and migrations or initialization logic.

At minimum include:

WasteItem:
- id
- visual_category
- confidence
- model_mode
- expiry_date
- expiry_confirmation_status
- material_type
- user_notes
- estimated_quantity
- quantity_unit
- current_status
- created_at
- updated_at

DisposalRule:
- id
- waste_category
- location_scope
- recommended_action
- handling_cautions
- source_title
- source_url
- verification_status
- last_verified_at

CollectionFacility:
- id
- name
- address
- city
- postal_code
- latitude
- longitude
- contact_details
- operating_hours
- accepted_categories
- source_url
- verification_status
- last_verified_at

WasteEvent:
- id
- waste_item_id
- event_type
- previous_status
- new_status
- quantity
- quantity_unit
- timestamp
- actor
- evidence_reference
- demo_record

Keep sensitive data to a minimum. Do not store unnecessary personal information, precise location history or uploaded images indefinitely. Document the retention configuration.

Use database constraints and validation for invalid states and quantities.

## 6. BACKEND API

Implement and document endpoints similar to:

GET /api/health
GET /api/categories
POST /api/analyze
POST /api/ocr/expiry
POST /api/disposal/recommend
GET /api/facilities
GET /api/facilities/{id}
GET /api/dashboard/summary
GET /api/dashboard/analytics
GET /api/waste-items
POST /api/waste-items
GET /api/waste-items/{id}
POST /api/waste-items/{id}/events
GET /api/waste-items/{id}/history
GET /api/disposal-guide

Add proper:
- Input validation.
- HTTP status codes.
- Error handling.
- Image upload limits.
- File-type verification.
- CORS configuration for local development.
- API documentation through FastAPI's Swagger interface.
- Logging that excludes sensitive image contents and unnecessary personal data.

Use asynchronous processing only where it offers a real benefit. Avoid unnecessary complexity.

## 7. USER EXPERIENCE REQUIREMENTS

The site must:
- Work on desktop, tablet and mobile.
- Have working buttons and links.
- Display loading, success, failure and empty states.
- Have accessible forms and keyboard navigation.
- Include labels, useful validation messages and screen-reader-friendly status updates.
- Preserve user-entered form data when an operation fails.
- Use consistent navigation and page titles.
- Avoid placeholder buttons that do nothing.
- Avoid fake loading animations that conceal missing functionality.
- Handle backend unavailability gracefully.
- Provide helpful onboarding and sample images or sample data where appropriate.

Use reusable components, clear TypeScript types, clean Python modules, and a maintainable folder structure.

## 8. SECURITY AND PRIVACY

- Validate uploaded files on the server.
- Restrict file size and image formats.
- Avoid executing uploaded content.
- Keep API keys in environment variables.
- Provide a .env.example with placeholder values only.
- Never commit secrets.
- Do not collect location without user action.
- Do not use uploaded images to identify patients.
- Add an option to delete a waste record and its stored image where applicable.
- Use safe defaults for CORS and admin access.
- Document limitations of demo authentication and local development security.

## 9. TESTING AND ACCEPTANCE CRITERIA

Write backend tests using pytest and frontend tests where appropriate.

Test at least:
- Valid and invalid image uploads.
- Unsupported file types.
- Image classification demo mode.
- Unknown-category handling.
- OCR failure and manual date entry.
- Ambiguous date handling.
- Expired, non-expired and unconfirmed dates.
- Different disposal rules for medicines and blister packs.
- Facilities with verified and unverified acceptance policies.
- Dashboard statistics and event counts.
- Invalid waste-status transitions.
- Demo-data loading and reset.
- Empty database states.
- API errors and backend unavailability.

The following must work before the build is considered complete:

1. The frontend starts successfully.
2. The backend starts successfully.
3. The home page and all navigation links work.
4. A user can upload an image and obtain a real model result or a clearly labelled demo result.
5. OCR can extract text when the engine is installed, with a safe manual fallback.
6. Disposal recommendations are generated through the rules engine.
7. Facility searches and filters work against the configured database.
8. The dashboard displays records and event history.
9. Demo mode never misrepresents simulated data as real.
10. The README explains exactly how to run the application.

## 10. IMPLEMENTATION WORKFLOW

Follow this sequence:

Step 1: Inspect the existing project directory and available tools.

Step 2: Create the frontend and backend structure.

Step 3: Implement the shared data models, database initialization and API endpoints.

Step 4: Build the global layout, navigation, landing page and reusable components.

Step 5: Implement image upload, analysis results and demo/model adapter.

Step 6: Implement OCR and expiry-date confirmation.

Step 7: Implement the disposal rules engine and disposal guide.

Step 8: Implement facility search and collection-centre details.

Step 9: Implement the tracking dashboard and event history.

Step 10: Add optional grounded GenAI integration.

Step 11: Add tests, seed data, error states and responsive styling.

Step 12: Run the backend tests, frontend tests, type checks and production build. Fix errors rather than merely reporting them.

Step 13: Start the application locally and verify the main user journeys.

If any dependency cannot be installed or any external integration is unavailable, implement a clear fallback and document it. Do not silently remove a feature or pretend it works.

Work incrementally and keep the project runnable after each major stage. Do not stop after generating a plan. Implement the actual application.

## 11. FINAL DELIVERABLES

Provide:
- Complete frontend source code.
- Complete backend source code.
- Database models and initialization.
- AI/OCR service adapters.
- Disposal rules engine.
- Demo data and sample workflows.
- Automated tests.
- requirements.txt.
- package.json.
- .env.example.
- README with installation and launch commands.
- A list of implemented features.
- A list of features requiring external API keys or real trained models.
- Test results and any known limitations.

Final objective: Deliver a polished, runnable, hackathon-ready PharmaCycle AI prototype that demonstrates the complete workflow from pharmaceutical waste identification to responsible disposal guidance and traceable waste tracking.

Start by inspecting the workspace, then implement the application. Do not stop at a proposal or static mockup.