"""Deterministic Rules Engine for Safe Pharmaceutical Waste Disposal Recommendations.

Decoupled strictly from generative LLMs to guarantee evidence-grounded, safety-critical advice.
Adheres to Section 4D of PROJECT_SPEC.md.
"""
from typing import Optional, List
from datetime import datetime, timezone
import json
import logging
from sqlalchemy.orm import Session

from app.models.disposal_rule import DisposalRule
from app.models.collection_facility import CollectionFacility
from app.schemas.disposal import DisposalRecommendRequest, DisposalRecommendResponse, FacilitySummary

logger = logging.getLogger("pharmacycle.rules_engine")

# Canonical category mapping
CATEGORY_CANONICAL = {
    "medicine or tablet strip": "Medicine or tablet strip",
    "tablet": "Medicine or tablet strip",
    "capsule": "Medicine or tablet strip",
    "tablets": "Medicine or tablet strip",
    "empty blister pack": "Empty blister pack",
    "blister": "Empty blister pack",
    "blister pack": "Empty blister pack",
    "medicine bottle or container": "Medicine bottle or container",
    "bottle": "Medicine bottle or container",
    "syrup": "Medicine bottle or container",
    "cardboard or paper pharmaceutical packaging": "Cardboard or paper pharmaceutical packaging",
    "cardboard": "Cardboard or paper pharmaceutical packaging",
    "box": "Cardboard or paper pharmaceutical packaging",
    "leaflet": "Cardboard or paper pharmaceutical packaging",
    "unknown or other": "Unknown or other",
    "unknown": "Unknown or other",
    "other": "Unknown or other"
}


def normalize_category(cat: str) -> str:
    cleaned = cat.strip().lower()
    return CATEGORY_CANONICAL.get(cleaned, "Unknown or other")


def evaluate_disposal_recommendation(
    request: DisposalRecommendRequest,
    db: Session
) -> DisposalRecommendResponse:
    """Evaluates user-confirmed inputs against deterministic disposal rules and verified facilities."""
    category = normalize_category(request.waste_category)
    expiry = (request.expiry_status or "unverified").lower()
    material = request.material_type or "Standard packaging"
    location = (request.location or "").strip()

    logger.info(
        f"Evaluating disposal rules for category='{category}', expiry='{expiry}', "
        f"material='{material}', location='{location}'"
    )

    # Query DB for matching disposal rule
    rule: Optional[DisposalRule] = db.query(DisposalRule).filter(
        DisposalRule.waste_category == category
    ).first()

    # Find matching facilities
    facilities_query = db.query(CollectionFacility)
    if location:
        facilities_query = facilities_query.filter(
            (CollectionFacility.city.ilike(f"%{location}%")) |
            (CollectionFacility.postal_code.ilike(f"%{location}%")) |
            (CollectionFacility.address.ilike(f"%{location}%"))
        )

    all_facs = facilities_query.all()
    eligible_facs: List[FacilitySummary] = []
    for fac in all_facs:
        try:
            accepted = json.loads(fac.accepted_categories)
        except Exception:
            accepted = [fac.accepted_categories]
        
        # Check if facility accepts this category
        if any(normalize_category(acc) == category for acc in accepted) or "Unknown or other" in accepted:
            eligible_facs.append(
                FacilitySummary(
                    id=fac.id,
                    name=fac.name,
                    city=fac.city,
                    address=fac.address,
                    accepted_categories=fac.accepted_categories,
                    verification_status=fac.verification_status,
                    contact_details=fac.contact_details,
                    operating_hours=fac.operating_hours
                )
            )

    # Build contextual advice based on category and expiry
    if category == "Medicine or tablet strip":
        if expiry == "confirmed_expired" or expiry == "expired":
            action_text = (
                "Take expired tablets/capsules to an authorized take-back program or pharmacy drop box. "
                "Keep medicines in their original container or secure sealed pouch. "
                "CRITICAL: Never flush pharmaceuticals down sinks or toilets, and never place active drugs in kerbside recycling bins."
            )
            why_text = (
                "Pharmaceutical compounds flushed into sewers bypass wastewater treatment plants and enter aquatic ecosystems, "
                "causing endocrine disruption in wildlife and contributing to antimicrobial resistance."
            )
            cautions_text = (
                "Scratch out or black out patient identity and prescription numbers on the label. "
                "Store out of reach of children and animals prior to handover."
            )
        elif expiry == "confirmed_valid" or expiry == "not_expired":
            action_text = (
                "If the medicine is unexpired, safe, and stored properly, consult your pharmacist or healthcare provider "
                "before discarding. If unneeded, return to an authorized take-back facility. Never share prescription medications."
            )
            why_text = (
                "Unused medicines retain chemical potency. Controlled return ensures they do not fall into unauthorized hands "
                "or contaminate local municipal solid waste streams."
            )
            cautions_text = (
                "Do not throw in household garbage where scavenging could occur. Deface personal details on labels."
            )
        else:
            action_text = (
                "Expiry status is unverified. Inspect the carton or blister pack for an 'EXP' date. "
                "If the date has passed or cannot be established with certainty, treat as expired and return to a verified pharmacy take-back collection point."
            )
            why_text = (
                "Without a confirmed expiry date, taking chemical medication may carry health risks. "
                "Safety guidelines mandate returning expired or ambiguous pharmaceuticals to authorized collection bins."
            )
            cautions_text = "Never flush medicines or discard in standard recycling bins."

        confidence_explanation = "Deterministic rule applied for active pharmaceutical compounds (Tablets/Capsules)."

    elif category == "Empty blister pack":
        action_text = (
            "Deposit empty blister packs at designated pharmacy drop-boxes participating in specialized multilayer recycling programs "
            "(e.g., TerraCycle or brand take-back partners). Do NOT place in standard kerbside mixed plastic recycling bins."
        )
        why_text = (
            "Blister packs consist of aluminium foil tightly bonded to PVC or PVDC plastic. Standard municipal Material Recovery Facilities (MRFs) "
            "lack thermal or mechanical delamination infrastructure to separate the foil from the polymer, causing whole batches of plastic to be sent to landfill or incinerated."
        )
        cautions_text = (
            "Ensure every pocket is completely empty with no residual medicine fragments before depositing in the collection bin."
        )
        confidence_explanation = "Deterministic rule applied for multilayer aluminium-polymer packaging."

    elif category == "Medicine bottle or container":
        action_text = (
            "Thoroughly empty and rinse the container if safe. Remove or deface all personal prescription identifiers. "
            "Check local municipal guidelines on whether glass/HDPE is accepted in kerbside recycling bins with or without caps."
        )
        why_text = (
            "Amber glass and rigid plastics (HDPE, PET) have high recyclability when free of pharmaceutical chemical residues."
        )
        cautions_text = (
            "Do not pour hazardous liquid medications down household drains to empty the bottle. "
            "Ensure confidential patient labels are completely peeled or marked over."
        )
        confidence_explanation = "Deterministic rule applied for rigid glass and plastic containers."

    elif category == "Cardboard or paper pharmaceutical packaging":
        action_text = (
            "Flatten the outer cardboard carton and place folded patient information leaflets (PILs) directly into your municipal dry paper/cardboard recycling bin."
        )
        why_text = (
            "Pharmaceutical cardboard and paper leaflets are clean cellulose fibers with excellent closed-loop recyclability."
        )
        cautions_text = (
            "If the carton was contaminated by leaked liquid medication or crushed ampoules, dispose of it with hazardous waste instead of recycling."
        )
        confidence_explanation = "Deterministic rule applied for uncontaminated paper/cardboard fiber packaging."

    else:
        # Unknown or other
        action_text = (
            "Do not attempt speculative domestic recycling or disposal. Contact your local municipal environmental health authority "
            "or local hospital pharmacy waste management desk for guidance."
        )
        why_text = (
            "Unknown pharmaceutical packaging may contain cytotoxic residues, hazardous chemical compounds, or non-recyclable composite resins."
        )
        cautions_text = (
            "Do not crush, puncture, open, or burn unknown pharmaceutical items. Store safely away from children in a secondary leakproof bag."
        )
        confidence_explanation = "Conservative safety fallback applied for unclassified or ambiguous pharmaceutical waste."

    # Incorporate DB rule metadata if available
    source_title = rule.source_title if rule else "WHO Guidelines on Safe Pharmaceutical Waste Management"
    source_url = rule.source_url if rule else "https://www.who.int"
    rule_status = rule.verification_status if rule else "verified"
    rule_id = rule.id if rule else None
    last_verified = rule.last_verified_at.isoformat() if (rule and rule.last_verified_at) else datetime.now(timezone.utc).isoformat()
    location_scope = rule.location_scope if rule else "General"

    if location:
        applicable_location = f"{location} (Matched against {location_scope})"
    else:
        applicable_location = f"{location_scope} (No specific city provided)"

    return DisposalRecommendResponse(
        waste_category=category,
        recommended_action=action_text,
        why_suggested=why_text,
        handling_cautions=cautions_text,
        applicable_location=applicable_location,
        source_title=source_title,
        source_url=source_url,
        verification_status=rule_status,
        last_verified_at=last_verified,
        confidence_explanation=confidence_explanation,
        matched_rule_id=rule_id,
        eligible_facilities=eligible_facs
    )
