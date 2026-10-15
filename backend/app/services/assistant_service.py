"""Grounded AI Assistant Service for PharmaCycle AI.

Adheres strictly to Section 4E of PROJECT_SPEC.md:
- Grounded in approved health authority disposal guidance.
- Guardrails against medical advice, pill identification, disease diagnosis, or consumption advice.
- Provides citations for all disposal facts.
- Fully operational without external API keys in rules-grounded mode.
"""
import re
from typing import List, Dict, Any, Tuple
import logging

from app.schemas.assistant import ChatResponse, ChatSource

logger = logging.getLogger("pharmacycle.assistant")

MEDICAL_ADVICE_KEYWORDS = [
    "can i take", "can i eat", "should i take", "dosage", "diagnose",
    "cure", "symptoms", "is it safe to drink", "is it safe to take",
    "will this cure", "treatment for", "side effects", "painkiller dosage",
    "headache cure", "stomach pain", "infection treatment"
]

KB_TOPICS: List[Dict[str, Any]] = [
    {
        "keywords": ["tablet", "capsule", "pill", "antibiotic", "expired medicine", "unused medicine", "dispose medicine"],
        "reply": (
            "Expired or unused tablets and capsules should be returned to an authorized pharmacy drop-off box or municipal "
            "take-back program. Keep medicines in their original packaging, or placed inside a sealed transparent bag.\n\n"
            "⚠️ **Critical Safety Rule:** Never flush medicines down the toilet or sink, and never deposit them into household recycling bins. "
            "Flushed pharmaceuticals pass directly through wastewater plants into rivers and oceans, harming aquatic wildlife and driving antimicrobial resistance."
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
        "keywords": ["blister", "empty blister", "foil", "blister pack", "pvc", "strip"],
        "reply": (
            "No, empty pharmaceutical blister packs should **NOT** be put into standard kerbside mixed plastic recycling bins.\n\n"
            "Blister strips consist of aluminium foil heat-bonded to polyvinyl chloride (PVC) or PVDC plastic. "
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
            "What do I do with medicine bottles?"
        ]
    },
    {
        "keywords": ["read expiry", "find expiry", "how to read", "expiry date", "exp date", "format"],
        "reply": (
            "To locate and verify an expiry date on pharmaceutical packaging:\n\n"
            "1. **Look for Key Identifiers:** Look for markings stamped or debossed with **EXP**, **EXPIRY**, **USE BEFORE**, or a small hourglass symbol ⌛.\n"
            "2. **Common Formats:** Most packs use `MM/YYYY` (e.g. `11/2026`), `MM/YY` (e.g. `04/25`), or `DD/MM/YYYY`.\n"
            "3. **Distinguish from MFG / BATCH:** Never confuse the Manufacturing Date (`MFG`, `MFR`) or Batch Number (`LOT`, `BN`) with the expiration date! MFG indicates when the drug was produced, not when it expires.\n"
            "4. **End of Month Rule:** If only month and year are specified (e.g. `EXP 08/2025`), the medicine expires on the final calendar day of that month."
        ),
        "sources": [
            {"title": "FDA Guidance on Expiration Dating and Stability Testing", "url": "https://www.fda.gov"},
            {"title": "MHRA Pharmaceutical Labelling Best Practices", "url": "https://www.gov.uk/mhra"}
        ],
        "suggestions": [
            "What should I do if the expiry date is unreadable?",
            "How should I dispose of expired tablets?",
            "Can I recycle amber glass syrup bottles?"
        ]
    },
    {
        "keywords": ["unreadable", "scratched", "faded", "missing date", "rubbed off", "damaged date"],
        "reply": (
            "If the expiry date on a pharmaceutical package is unreadable, faded, or torn off, **treat the medicine as expired**.\n\n"
            "Pharmaceutical stability cannot be guaranteed once visual date stamps are lost. "
            "Do not guess the expiration date. Safely transport the unidentifiable medicine to an authorized pharmacy take-back drop box for high-temperature incineration disposal."
        ),
        "sources": [
            {"title": "FDA Medicine Disposal Questions and Answers", "url": "https://www.fda.gov/drugs/safe-disposal-medicines/disposal-unused-medicines-what-you-should-know"},
            {"title": "NHS Unused or Expired Medicines Guidance", "url": "https://www.nhs.uk/medicines/"}
        ],
        "suggestions": [
            "How should I dispose of expired tablets?",
            "Can I recycle empty blister foils?",
            "How do I find a collection center near me?"
        ]
    },
    {
        "keywords": ["bottle", "syrup", "glass", "amber glass", "liquid medicine", "cough syrup"],
        "reply": (
            "For medicine bottles and containers:\n\n"
            "1. **Empty Completely:** Never discard bottles with liquid medicine still inside down sinks or drains.\n"
            "2. **Rinse Safely:** If safe to handle, rinse residual syrup with a small amount of warm water.\n"
            "3. **Protect Privacy:** Thoroughly peel off, scratch out, or blacken personal patient prescription labels.\n"
            "4. **Recycle by Material:** Amber glass goes into municipal glass bins; HDPE/PET bottles into municipal plastic recycling."
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
        "keywords": ["cardboard", "box", "carton", "paper", "leaflet"],
        "reply": (
            "Outer cardboard cartons and folded paper Patient Information Leaflets (PILs) are 100% recyclable in standard municipal dry paper/cardboard bins.\n\n"
            "**Tips:** Flatten the boxes to conserve space. If the carton was soiled by leaked liquid medication or crushed ampoules, dispose of it with general hazardous waste instead of recycling."
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
        "keywords": ["flush", "toilet", "sink", "drain", "water supply", "sewer"],
        "reply": (
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


def process_chat_message(message: str) -> ChatResponse:
    """Processes user message and returns grounded, cited response with guardrails."""
    msg_clean = message.strip()
    msg_lower = msg_clean.lower()

    # Safety Guardrail: Medical Advice / Consumption / Diagnosis Check
    if any(k in msg_lower for k in MEDICAL_ADVICE_KEYWORDS):
        return ChatResponse(
            reply=(
                "⚠️ **Medical Safety Guardrail:** PharmaCycle AI is strictly an environmental packaging and pharmaceutical "
                "waste disposal assistant. I am not permitted to evaluate medicine safety, diagnose medical conditions, recommend drug "
                "dosages, or advise on consuming medications. If you have questions about your prescription or health condition, "
                "please contact your doctor, pharmacist, or local poison control centre immediately."
            ),
            mode="rules_grounded",
            sources=[
                ChatSource(title="PharmaCycle AI Safety Policy", url="/safety")
            ],
            disclaimer="PharmaCycle AI does not provide medical advice or drug evaluation.",
            suggestions=[
                "How should I dispose of expired tablets?",
                "Can I put an empty blister pack in a plastic recycling bin?",
                "How do I read the expiry date on this medicine?"
            ]
        )

    # Search Knowledge Base topics
    best_topic = None
    best_score = 0

    for topic in KB_TOPICS:
        score = sum(1 for kw in topic["keywords"] if kw in msg_lower)
        if score > best_score:
            best_score = score
            best_topic = topic

    if best_topic and best_score > 0:
        sources = [ChatSource(**s) for s in best_topic["sources"]]
        return ChatResponse(
            reply=best_topic["reply"],
            mode="rules_grounded",
            sources=sources,
            disclaimer="Grounded in published health authority guidelines. Disclose local municipal bylaws before final disposal.",
            suggestions=best_topic.get("suggestions", [])
        )

    # General Fallback Response
    return ChatResponse(
        reply=(
            "I can assist you with pharmaceutical packaging disposal and safe medicine take-back guidance.\n\n"
            "**Key Principles:**\n"
            "• **Expired Medicines:** Return to authorized pharmacy take-back drop boxes. Never flush or throw into domestic recycling.\n"
            "• **Empty Blister Packs:** Made of bonded PVC/aluminium. Require specialized delamination recycling (e.g. TerraCycle), not kerbside bins.\n"
            "• **Medicine Bottles:** Empty and rinse amber glass/plastic, remove patient labels, and place in municipal recycling.\n"
            "• **Cardboard & Leaflets:** Standard clean paper recycling.\n\n"
            "For specific guidance on your item, you can scan it on our **Identify Waste** page or consult our **Collection Centres** directory."
        ),
        mode="rules_grounded",
        sources=[
            ChatSource(title="WHO Medical Waste Guidelines", url="https://www.who.int"),
            ChatSource(title="FDA Safe Disposal of Medicines", url="https://www.fda.gov/drugs/safe-disposal-medicines")
        ],
        disclaimer="Guidance is retrieval-grounded and does not substitute for certified local hazardous waste regulations.",
        suggestions=[
            "How should I dispose of expired tablets?",
            "Can I put an empty blister pack in a plastic recycling bin?",
            "How do I read the expiry date on this medicine?",
            "What should I do if the expiry date is unreadable?"
        ]
    )
