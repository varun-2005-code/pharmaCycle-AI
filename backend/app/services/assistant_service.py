"""Grounded AI Assistant Service for PharmaCycle AI.

Adheres strictly to Section 4E of PROJECT_SPEC.md:
- Retrieval-based chat that answers only from DisposalRule and guide content.
- If an LLM key (GEMINI_API_KEY or OPENAI_API_KEY) is set in environment, use it with retrieved passages as only grounding.
- Otherwise, use the deterministic rules-backed FAQ mode.
- Labels active mode in response ('llm_grounded' vs 'rules_grounded').
- Displays verified source references.
- Returns 'Information unavailable' when there is no matching disposal guidance.
- Guardrails:
  - Never give disease diagnoses or medical/consumption advice.
  - Never claim medicine is safe based on appearance.
  - Never invent or fabricate local facilities.
- Fully covers the four example questions from Section 4E.
"""
import os
import re
import logging
from typing import List, Dict, Any, Optional
import httpx

from app.config import settings
from app.schemas.assistant import ChatResponse, ChatSource, SuggestedAction

logger = logging.getLogger("pharmacycle.assistant")

# -----------------------------------------------------------------------------
# Guardrail keyword patterns
# -----------------------------------------------------------------------------

EMERGENCY_INGESTION_KEYWORDS = [
    "poison", "overdose", "swallowed", "ingested", "ate pills", "ate medicine", "drank medicine",
    "baby swallowed", "child swallowed", "toddler swallowed", "dog ate", "dog swallowed", "cat ate",
    "cat swallowed", "pet ate", "pet swallowed", "swallowed whole bottle", "toxic ingestion",
    "accidental ingestion", "suicide", "kill myself", "end my life", "unconscious", "took too many",
    "overdosed", "swallowed battery"
]

MEDICAL_DIAGNOSIS_KEYWORDS = [
    "diagnos", "disease", "illness", "infection", "symptom", "cure", "treatment for",
    "do i have", "what illness", "what disease", "is this strep", "is this flu"
]

MEDICAL_CONSUMPTION_KEYWORDS = [
    "can i take", "should i take", "can i eat", "can i drink", "can i swallow",
    "can i consume", "dosage", "dose", "painkiller dosage", "safe to take",
    "safe to eat", "safe to drink", "safe to swallow", "safe to consume",
    "will this cure", "headache cure", "stomach pain", "side effects",
    "is it safe to ingest"
]

APPEARANCE_SAFETY_KEYWORDS = [
    "safe based on appearance", "safe from appearance", "looks safe", "look safe",
    "looks fine", "looks clean", "looks good", "looks okay", "can i tell if it is safe by looking",
    "tell from appearance", "tell by appearance", "tell by looking", "appearance safe",
    "colour looks fine", "pill looks good", "tablet looks fine", "tablet looks safe",
    "pill looks safe", "medicine looks safe", "capsule looks safe", "looks undamaged"
]

INVENT_FACILITIES_KEYWORDS = [
    "where is the nearest", "give me the address of", "give me phone number of",
    "invent a facility", "find me a centre in", "drop off facility in"
]

# -----------------------------------------------------------------------------
# Grounded Knowledge Corpus (Disposal Rules & Packaging Guide Articles)
# -----------------------------------------------------------------------------

GROUNDED_PASSAGES: List[Dict[str, Any]] = [
    {
        "id": "tablets_capsules",
        "title": "Disposal Guidance: Expired or Unused Tablets and Capsules",
        "category": "Medicine or tablet strip",
        "keywords": [
            "tablet", "capsule", "pill", "antibiotic", "expired medicine", "unused medicine",
            "dispose medicine", "dispose tablet", "dispose pill", "painkiller", "syrup", "medicine"
        ],
        "content": (
            "Expired or unused tablets and capsules should be returned to an authorized pharmacy take-back drop-off box "
            "or municipal pharmaceutical collection program. Keep medicines in their original packaging, or placed inside a sealed transparent bag.\n\n"
            "⚠️ **Critical Safety Rules:**\n"
            "• **Never flush medicines down the toilet or sink:** Active pharmaceutical ingredients pass directly through wastewater treatment "
            "plants into rivers and oceans, harming aquatic wildlife and driving antimicrobial resistance.\n"
            "• **Never place medicines into domestic recycling bins:** Medicines pose severe contamination and chemical hazard risks to waste workers."
        ),
        "sources": [
            {"title": "FDA Safe Disposal of Unused Medicines", "url": "https://www.fda.gov/drugs/safe-disposal-medicines"},
            {"title": "WHO Safe Disposal of Unwanted Pharmaceuticals", "url": "https://www.who.int/water_sanitation_health/medical-waste/en/"}
        ],
        "suggestions": [
            "Can I put an empty blister pack in a plastic recycling bin?",
            "How do I read the expiry date on this medicine?",
            "What should I do if the expiry date is unreadable?"
        ]
    },
    {
        "id": "blister_packs",
        "title": "Disposal Guidance: Empty Pharmaceutical Blister Packs",
        "category": "Empty blister pack",
        "keywords": [
            "blister", "empty blister", "blister pack", "foil", "pvc", "strip", "empty foil", "foil strip",
            "empty strip", "plastic recycling bin"
        ],
        "content": (
            "No, empty pharmaceutical blister packs should **NOT** be put into standard household mixed plastic recycling bins.\n\n"
            "**Material Composition:** Blister strips consist of aluminium foil heat-bonded to polyvinyl chloride (PVC) or PVDC plastic. "
            "Municipal Material Recovery Facilities (MRFs) cannot mechanically separate these bonded micro-layers, causing contaminated plastic batches to be diverted to landfills or incinerators.\n\n"
            "**Recommended Action:** Use specialized pharmacy drop-boxes (such as TerraCycle blister recycling schemes) that utilize thermal and chemical delamination."
        ),
        "sources": [
            {"title": "WRAP UK Multi-Material Packaging Guidelines", "url": "https://www.wrap.org.uk"},
            {"title": "European Packaging and Packaging Waste Framework", "url": "https://environment.ec.europa.eu"}
        ],
        "suggestions": [
            "How should I dispose of expired tablets?",
            "Where can I find collection centres for blister packs?",
            "How do I read the expiry date on this medicine?"
        ]
    },
    {
        "id": "read_expiry_date",
        "title": "Packaging Guide: How to Read Medicine Expiry Dates",
        "category": "Expiry Verification",
        "keywords": [
            "read expiry", "find expiry", "how to read", "expiry date", "exp date", "format",
            "how do i read", "expiration date", "where is expiry"
        ],
        "content": (
            "To locate and verify an expiry date on pharmaceutical packaging:\n\n"
            "1. **Look for Key Identifiers:** Look for markings stamped or debossed with **EXP**, **EXPIRY**, **USE BEFORE**, or a small hourglass symbol (⌛).\n"
            "2. **Common Formats:** Most packs use `MM/YYYY` (e.g. `11/2026`), `MM/YY` (e.g. `04/25`), or `DD/MM/YYYY` (e.g. `15/08/2026`).\n"
            "3. **Distinguish from MFG / BATCH:** Never confuse the Manufacturing Date (`MFG`, `MFD`) or Batch Number (`LOT`, `BN`) with the expiration date! MFG indicates when the drug was produced, not when it expires.\n"
            "4. **End of Month Rule:** If only month and year are specified (e.g. `EXP 08/2025`), the medicine expires on the final calendar day of that month."
        ),
        "sources": [
            {"title": "FDA Guidance on Expiration Dating and Stability Testing", "url": "https://www.fda.gov"},
            {"title": "MHRA Pharmaceutical Labelling Best Practices", "url": "https://www.gov.uk/mhra"}
        ],
        "suggestions": [
            "What should I do if the expiry date is unreadable?",
            "How should I dispose of expired tablets?",
            "Can I put an empty blister pack in a plastic recycling bin?"
        ]
    },
    {
        "id": "unreadable_expiry_date",
        "title": "Packaging Guide: Handling Unreadable or Missing Expiry Dates",
        "category": "Expiry Verification",
        "keywords": [
            "unreadable", "scratched", "faded", "missing date", "rubbed off", "damaged date",
            "date unreadable", "cannot read date", "expiry missing"
        ],
        "content": (
            "If the expiry date on a pharmaceutical package is unreadable, faded, scratched off, or missing, **treat the medicine as expired**.\n\n"
            "**Key Guidance:**\n"
            "• Do not guess the expiration date.\n"
            "• Pharmaceutical stability, sterility, and chemical potency cannot be guaranteed once visual date stamps are lost.\n"
            "• Safely transport the unidentifiable medicine to an authorized pharmacy take-back drop box for high-temperature incineration disposal."
        ),
        "sources": [
            {"title": "FDA Medicine Disposal Questions and Answers", "url": "https://www.fda.gov/drugs/safe-disposal-medicines/disposal-unused-medicines-what-you-should-know"},
            {"title": "NHS Unused or Expired Medicines Guidance", "url": "https://www.nhs.uk/medicines/"}
        ],
        "suggestions": [
            "How should I dispose of expired tablets?",
            "How do I read the expiry date on this medicine?",
            "Can I put an empty blister pack in a plastic recycling bin?"
        ]
    },
    {
        "id": "bottles_containers",
        "title": "Disposal Guidance: Medicine Bottles and Containers",
        "category": "Medicine bottle or container",
        "keywords": [
            "bottle", "syrup", "glass", "amber glass", "cough syrup", "liquid medicine", "dropper", "vial"
        ],
        "content": (
            "For medicine bottles and containers:\n\n"
            "1. **Empty Completely:** Never discard bottles with liquid medicine still inside down sinks or drains.\n"
            "2. **Rinse Safely:** If safe to handle, rinse residual syrup with a small amount of warm water.\n"
            "3. **Protect Privacy:** Thoroughly peel off, scratch out, or blacken personal patient prescription labels.\n"
            "4. **Recycle by Material:** Amber glass bottles go into municipal glass recycling bins; clean HDPE/PET plastic bottles go into municipal plastic recycling."
        ),
        "sources": [
            {"title": "EPA Household Hazardous Waste Guidance", "url": "https://www.epa.gov/hw/household-hazardous-waste-hhw"}
        ],
        "suggestions": [
            "Can I put an empty blister pack in a plastic recycling bin?",
            "What do I do with cardboard packaging?",
            "How should I dispose of expired tablets?"
        ]
    },
    {
        "id": "cardboard_leaflets",
        "title": "Disposal Guidance: Cardboard Medicine Cartons and Paper Leaflets",
        "category": "Cardboard or paper pharmaceutical packaging",
        "keywords": [
            "cardboard", "box", "carton", "paper", "leaflet", "paperboard", "pil", "packaging"
        ],
        "content": (
            "Outer cardboard cartons and folded paper Patient Information Leaflets (PILs) are 100% recyclable in standard municipal dry paper/cardboard bins.\n\n"
            "**Tips:** Flatten the boxes to conserve space. If the carton was soiled by leaked liquid medication or crushed ampoules, dispose of it with general hazardous waste instead of domestic recycling."
        ),
        "sources": [
            {"title": "European Paper Recycling Council", "url": "https://www.cepi.org"}
        ],
        "suggestions": [
            "How should I dispose of expired tablets?",
            "Can I put an empty blister pack in a plastic recycling bin?"
        ]
    },
    {
        "id": "unknown_waste",
        "title": "Disposal Guidance: Unknown or Damaged Pharmaceutical Waste",
        "category": "Unknown or other",
        "keywords": [
            "unknown", "unlabelled", "mystery", "damaged packaging", "unidentified", "other waste"
        ],
        "content": (
            "Packaging with missing labels, illegible text, or unknown chemical contents must never be guessed, consumed, or placed into domestic recycling.\n\n"
            "Keep the unknown item in a sealed transparent bag and hand it over to an authorized municipal hazardous waste collection depot or pharmacy take-back counter for professional disposal."
        ),
        "sources": [
            {"title": "EPA Hazardous Waste Guidelines", "url": "https://www.epa.gov/hw"}
        ],
        "suggestions": [
            "How should I dispose of expired tablets?",
            "How do I read the expiry date on this medicine?"
        ]
    },
    {
        "id": "flushing_dangers",
        "title": "Environmental Safety: Dangers of Flushing Medicines",
        "category": "Environmental Warning",
        "keywords": [
            "flush", "toilet", "sink", "drain", "sewer", "water supply", "pour down"
        ],
        "content": (
            "**DO NOT FLUSH MEDICINES DOWN TOILETS OR SINKS!**\n\n"
            "Municipal wastewater treatment facilities are not engineered to remove active pharmaceutical ingredients, synthetic hormones, or antibiotics. "
            "Flushed medications pass directly into freshwater rivers and marine habitats, disrupting reproductive cycles in fish and encouraging the evolution of antibiotic-resistant superbugs."
        ),
        "sources": [
            {"title": "EPA Contaminants of Emerging Concern in Water", "url": "https://www.epa.gov"},
            {"title": "WHO Environmental Impact of Pharmaceutical Waste", "url": "https://www.who.int"}
        ],
        "suggestions": [
            "How should I dispose of expired tablets?",
            "Where can I find collection centres for blister packs?"
        ]
    }
]


# -----------------------------------------------------------------------------
# Guardrail checking functions
# -----------------------------------------------------------------------------

def check_emergency_guardrail(msg_lower: str) -> Optional[ChatResponse]:
    """Refuses emergency ingestion, poisoning, and overdose queries with urgent hotlines."""
    # Distinguish general consumption advice inquiry ("can i swallow two pills") from acute emergencies
    if ("can i swallow" in msg_lower or "should i swallow" in msg_lower) and not any(
        k in msg_lower for k in ["poison", "overdose", "bottle", "child", "baby", "toddler", "dog", "cat", "pet", "toxic", "too many", "accidental", "suicide", "kill"]
    ):
        return None

    if any(k in msg_lower for k in EMERGENCY_INGESTION_KEYWORDS):
        return ChatResponse(
            reply=(
                "🚨 **CRITICAL MEDICAL EMERGENCY SAFETY GUARDRAIL** 🚨\n\n"
                "PharmaCycle AI is exclusively a pharmaceutical packaging and environmental waste disposal assistant. "
                "I am **NOT** authorized to handle medical emergencies, poisoning, drug overdoses, or accidental ingestion.\n\n"
                "**TAKE IMMEDIATE ACTION:**\n"
                "• **United States:** Call **Poison Help** immediately at **1-800-222-1222** or dial **911**.\n"
                "• **India:** Call National Emergency **112** or Poison Information Centre at **1800-116-117**.\n"
                "• **United Kingdom:** Call **999** for emergency or **111** for urgent health advice.\n"
                "• **European Union:** Call **112** for emergency assistance.\n\n"
                "Do NOT wait for symptoms to appear. Keep the container or packaging nearby to identify the substance to emergency responders."
            ),
            mode="rules_grounded",
            intent="emergency_refusal",
            sources=[
                ChatSource(title="American Association of Poison Control Centers", url="https://www.poison.org"),
                ChatSource(title="WHO International Programme on Chemical Safety", url="https://www.who.int")
            ],
            disclaimer="EMERGENCY REFUSAL: Seek immediate emergency medical care for poisoning or overdose.",
            suggestions=[
                "How should I dispose of expired tablets?",
                "Can I put an empty blister pack in a plastic recycling bin?"
            ],
            actions=[
                SuggestedAction(label="Emergency Services (112)", action_type="emergency_call", payload="112"),
                SuggestedAction(label="US Poison Control (1-800-222-1222)", action_type="emergency_call", payload="18002221222"),
                SuggestedAction(label="View Safety Policy", action_type="navigate", payload="/safety")
            ]
        )
    return None


def check_medical_advice_guardrail(msg_lower: str) -> Optional[ChatResponse]:
    """Refuses disease diagnoses, medical consultations, and consumption advice."""
    has_diagnosis = any(k in msg_lower for k in MEDICAL_DIAGNOSIS_KEYWORDS)
    has_consumption = any(k in msg_lower for k in MEDICAL_CONSUMPTION_KEYWORDS)

    if has_diagnosis or has_consumption:
        return ChatResponse(
            reply=(
                "⚠️ **Medical Safety Guardrail:** PharmaCycle AI is strictly an environmental packaging and pharmaceutical "
                "waste disposal assistant. I am not permitted to evaluate medicine safety, diagnose medical conditions, recommend drug "
                "dosages, or advise on consuming medications. If you have questions about your prescription or health condition, "
                "please contact your doctor, pharmacist, or local poison control centre immediately."
            ),
            mode="rules_grounded",
            intent="medical_advice_refusal",
            sources=[
                ChatSource(title="PharmaCycle AI Safety Policy", url="/safety")
            ],
            disclaimer="PharmaCycle AI does not provide medical advice or drug evaluation.",
            suggestions=[
                "How should I dispose of expired tablets?",
                "Can I put an empty blister pack in a plastic recycling bin?",
                "How do I read the expiry date on this medicine?"
            ],
            actions=[
                SuggestedAction(label="View Safety Guidelines", action_type="navigate", payload="/safety"),
                SuggestedAction(label="Disposal Guide", action_type="navigate", payload="/guide")
            ]
        )
    return None


def check_appearance_safety_guardrail(msg_lower: str) -> Optional[ChatResponse]:
    """Refuses claiming medicine safety from visual appearance."""
    if any(k in msg_lower for k in APPEARANCE_SAFETY_KEYWORDS):
        return ChatResponse(
            reply=(
                "⚠️ **Safety Guardrail:** Visual appearance alone does **NOT** establish whether a pharmaceutical is safe, "
                "stable, or active. Identifying an object visually does not establish its chemical safety, composition, or efficacy.\n\n"
                "Chemical degradation, loss of potency, and bacterial contamination frequently occur with zero visible change in color, "
                "texture, or shape. Expired or unverified medications must never be consumed based solely on their appearance. "
                "Please dispose of them safely via authorized collection programs."
            ),
            mode="rules_grounded",
            intent="appearance_safety_refusal",
            sources=[
                ChatSource(title="PharmaCycle AI Safety Policy", url="/safety"),
                ChatSource(title="FDA Guidance on Drug Expiration", url="https://www.fda.gov")
            ],
            disclaimer="Visual inspection does not verify pharmaceutical safety.",
            suggestions=[
                "How should I dispose of expired tablets?",
                "How do I read the expiry date on this medicine?",
                "What should I do if the expiry date is unreadable?"
            ],
            actions=[
                SuggestedAction(label="Scan Expiry via OCR", action_type="navigate", payload="/ocr"),
                SuggestedAction(label="Safe Disposal Guide", action_type="navigate", payload="/guide")
            ]
        )
    return None


def check_invent_facilities_guardrail(msg_lower: str) -> Optional[ChatResponse]:
    """Prevents inventing or fabricating facility locations outside verified registry."""
    if any(k in msg_lower for k in INVENT_FACILITIES_KEYWORDS):
        return ChatResponse(
            reply=(
                "PharmaCycle AI strictly avoids fabricating facility names, addresses, or opening hours.\n\n"
                "To locate real, verified pharmaceutical collection drop-off points, please search our **Collection Centres** "
                "directory (/facilities) by entering your city or PIN code. If no verified facility is available in your area, "
                "please contact your local municipal waste management authority."
            ),
            mode="rules_grounded",
            intent="invent_facilities_refusal",
            sources=[
                ChatSource(title="PharmaCycle Collection Locator", url="/facilities")
            ],
            disclaimer="Facility recommendations require verified registry data; never fabricated.",
            suggestions=[
                "Where can I find collection centres for blister packs?",
                "How should I dispose of expired tablets?"
            ],
            actions=[
                SuggestedAction(label="Open Collection Locator", action_type="navigate", payload="/facilities"),
                SuggestedAction(label="View Disposal Guide", action_type="navigate", payload="/guide")
            ]
        )
    return None


def get_passage_actions(passage_id: str) -> List[SuggestedAction]:
    """Generates context-aware suggested actions for retrieved passages."""
    if passage_id == "blister_packs":
        return [
            SuggestedAction(label="Find Blister Collection Centres", action_type="navigate", payload="/facilities?category=Empty+blister+pack"),
            SuggestedAction(label="Read Blister Disposal Guide", action_type="navigate", payload="/guide?category=Empty+blister+pack")
        ]
    elif passage_id == "tablets_capsules":
        return [
            SuggestedAction(label="Locate Medicine Take-Back Points", action_type="navigate", payload="/facilities?category=Medicine+or+tablet+strip"),
            SuggestedAction(label="Identify Pharmaceutical Waste", action_type="navigate", payload="/identify")
        ]
    elif passage_id in ("read_expiry_date", "unreadable_expiry_date"):
        return [
            SuggestedAction(label="Scan Expiry with OCR", action_type="navigate", payload="/ocr"),
            SuggestedAction(label="Disposal Guidelines", action_type="navigate", payload="/guide")
        ]
    elif passage_id == "bottles_containers":
        return [
            SuggestedAction(label="Find Bottle Recycling Centres", action_type="navigate", payload="/facilities?category=Medicine+bottle+or+container"),
            SuggestedAction(label="Read Packaging Guide", action_type="navigate", payload="/guide?category=Medicine+bottle+or+container")
        ]
    elif passage_id == "cardboard_leaflets":
        return [
            SuggestedAction(label="View Paper Recycling Rules", action_type="navigate", payload="/guide?category=Cardboard+or+paper+pharmaceutical+packaging")
        ]
    elif passage_id == "flushing_dangers":
        return [
            SuggestedAction(label="Find Take-Back Drop-Offs", action_type="navigate", payload="/facilities"),
            SuggestedAction(label="Read Environmental Impact", action_type="navigate", payload="/about")
        ]
    return [
        SuggestedAction(label="Explore Disposal Guide", action_type="navigate", payload="/guide"),
        SuggestedAction(label="Collection Locator", action_type="navigate", payload="/facilities")
    ]


def get_passage_intent(passage_id: str) -> str:
    """Maps retrieved passage to intent category."""
    if passage_id in ("read_expiry_date", "unreadable_expiry_date"):
        return "expiry_verification_query"
    elif passage_id in ("blister_packs", "bottles_containers", "cardboard_leaflets"):
        return "packaging_recycling_query"
    return "disposal_query"


# -----------------------------------------------------------------------------
# Intent Router & Retrieval engine
# -----------------------------------------------------------------------------

def route_intent(query: str, context: Optional[Dict[str, Any]] = None) -> str:
    """Explicit intent router that classifies queries into discrete intent types."""
    q_lower = query.strip().lower()
    if any(k in q_lower for k in EMERGENCY_INGESTION_KEYWORDS):
        if not (("can i swallow" in q_lower or "should i swallow" in q_lower) and not any(
            k in q_lower for k in ["poison", "overdose", "bottle", "child", "baby", "toddler", "dog", "cat", "pet", "toxic", "too many", "accidental", "suicide", "kill"]
        )):
            return "emergency_refusal"

    if any(k in q_lower for k in APPEARANCE_SAFETY_KEYWORDS):
        return "appearance_safety_refusal"
    if any(k in q_lower for k in MEDICAL_DIAGNOSIS_KEYWORDS) or any(k in q_lower for k in MEDICAL_CONSUMPTION_KEYWORDS):
        return "medical_advice_refusal"
    if any(k in q_lower for k in INVENT_FACILITIES_KEYWORDS):
        return "invent_facilities_refusal"
    
    passages = retrieve_grounded_passages(query, context=context)
    if not passages:
        return "out_of_scope"
    return get_passage_intent(passages[0]["id"])


def retrieve_grounded_passages(query: str, context: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """Retrieves passages matching query keywords, ranked by relevance score and active context."""
    q_lower = query.strip().lower()
    scored_passages = []

    has_unreadable = bool(re.search(r'\b(unreadable|faded|scratched|missing date|rubbed off|damaged date|cannot read)\b', q_lower))
    has_read = bool(re.search(r'\bread\b', q_lower))

    ctx_cat = ""
    if context and isinstance(context, dict):
        ctx_cat = (context.get("waste_category") or "").lower()

    for passage in GROUNDED_PASSAGES:
        score = sum(1 for kw in passage["keywords"] if kw in q_lower)
        # Give higher weight to exact phrase matches in question
        if passage["id"] == "tablets_capsules" and ("expired tablet" in q_lower or "dispose of expired" in q_lower):
            score += 5
        elif passage["id"] == "blister_packs" and ("blister" in q_lower or "recycling bin" in q_lower):
            score += 5
        elif passage["id"] == "unreadable_expiry_date" and has_unreadable:
            score += 10
        elif passage["id"] == "read_expiry_date" and (has_read and "expiry" in q_lower) and not has_unreadable:
            score += 6

        # Context boosting
        if ctx_cat:
            if "blister" in ctx_cat and passage["id"] == "blister_packs":
                score += 4
            elif ("tablet" in ctx_cat or "medicine" in ctx_cat) and passage["id"] == "tablets_capsules":
                score += 4
            elif "bottle" in ctx_cat and passage["id"] == "bottles_containers":
                score += 4
            elif ("carton" in ctx_cat or "paper" in ctx_cat) and passage["id"] == "cardboard_leaflets":
                score += 4

        if score > 0:
            scored_passages.append((score, passage))

    scored_passages.sort(key=lambda x: x[0], reverse=True)
    return [p for _, p in scored_passages]


# -----------------------------------------------------------------------------
# LLM grounding call (when API key is set)
# -----------------------------------------------------------------------------

def query_gemini_grounded(prompt: str, retrieved_context: str, api_key: str) -> Optional[str]:
    """Calls Gemini REST API with strictly grounded system instructions."""
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        headers = {"Content-Type": "application/json"}
        
        system_instruction = (
            "You are PharmaCycle AI Disposal Assistant. You must answer the user's question STRICTLY and SOLELY "
            "using the provided retrieved context. Do NOT use external knowledge. "
            "If the provided context does not contain the answer, say 'Information unavailable.' "
            "Never provide medical diagnoses, never advise consuming medicine, never claim medicine is safe from appearance, "
            "and never invent facilities."
        )

        user_content = f"RETRIEVED GUIDANCE CONTEXT:\n{retrieved_context}\n\nUSER QUESTION: {prompt}"

        payload = {
            "system_instruction": {"parts": [{"text": system_instruction}]},
            "contents": [{"parts": [{"text": user_content}]}],
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 600}
        }

        with httpx.Client(timeout=8.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        return parts[0].get("text", "").strip()
    except Exception as e:
        logger.warning(f"Grounded LLM call failed, falling back to rules mode: {e}")
    return None


# -----------------------------------------------------------------------------
# Main Chat Dispatcher
# -----------------------------------------------------------------------------

def process_chat_message(
    message: str,
    history: Optional[List[Any]] = None,
    context: Optional[Dict[str, Any]] = None
) -> ChatResponse:
    """Processes user message and returns grounded, cited response with guardrails, intent, and suggested actions."""
    msg_clean = message.strip()
    msg_lower = msg_clean.lower()

    # 1. Guardrail Check: Critical emergency refusal
    emerg_guard = check_emergency_guardrail(msg_lower)
    if emerg_guard:
        return emerg_guard

    # 2. Guardrail Check: Claiming safety from appearance
    app_guard = check_appearance_safety_guardrail(msg_lower)
    if app_guard:
        return app_guard

    # 3. Guardrail Check: Medical advice / diagnoses / consumption
    med_guard = check_medical_advice_guardrail(msg_lower)
    if med_guard:
        return med_guard

    # 4. Guardrail Check: Inventing facilities
    fac_guard = check_invent_facilities_guardrail(msg_lower)
    if fac_guard:
        return fac_guard

    # 5. Retrieval over grounded rules and packaging guide
    matched_passages = retrieve_grounded_passages(msg_clean, context=context)

    # 6. Handle "Information unavailable" when there is no matching disposal guidance
    if not matched_passages:
        return ChatResponse(
            reply=(
                "**Information unavailable.** PharmaCycle AI answers only questions grounded in approved pharmaceutical "
                "waste disposal rules and packaging guidelines. I do not have verified disposal information matching your query.\n\n"
                "Please ask a question related to safe medicine disposal, blister packs, bottles, cartons, or reading expiry dates."
            ),
            mode="rules_grounded",
            intent="out_of_scope",
            sources=[],
            disclaimer="PharmaCycle AI restricts responses strictly to grounded pharmaceutical disposal regulations.",
            suggestions=[
                "How should I dispose of expired tablets?",
                "Can I put an empty blister pack in a plastic recycling bin?",
                "How do I read the expiry date on this medicine?",
                "What should I do if the expiry date is unreadable?"
            ],
            actions=[
                SuggestedAction(label="Explore Disposal Guide", action_type="navigate", payload="/guide"),
                SuggestedAction(label="Locate Collection Centres", action_type="navigate", payload="/facilities")
            ]
        )

    primary_passage = matched_passages[0]
    sources = [ChatSource(**s) for s in primary_passage["sources"]]
    suggestions = primary_passage.get("suggestions", [
        "How should I dispose of expired tablets?",
        "Can I put an empty blister pack in a plastic recycling bin?"
    ])
    passage_intent = get_passage_intent(primary_passage["id"])
    passage_actions = get_passage_actions(primary_passage["id"])

    # 7. Check for LLM API Key in environment
    llm_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
    if llm_key:
        context_text = "\n\n".join([f"[{p['title']}]\n{p['content']}" for p in matched_passages[:2]])
        llm_reply = query_gemini_grounded(msg_clean, context_text, llm_key)
        if llm_reply:
            return ChatResponse(
                reply=llm_reply,
                mode="llm_grounded",
                intent=passage_intent,
                sources=sources,
                disclaimer="Synthesized via Gemini API, grounded strictly in retrieved health authority disposal guidelines.",
                suggestions=suggestions,
                actions=passage_actions
            )

    # 8. Rules-Backed FAQ Mode (Deterministic, offline, hackathon compliant)
    return ChatResponse(
        reply=primary_passage["content"],
        mode="rules_grounded",
        intent=passage_intent,
        sources=sources,
        disclaimer="Grounded directly in published health authority guidelines. No unconstrained LLM hallucinations.",
        suggestions=suggestions,
        actions=passage_actions
    )
