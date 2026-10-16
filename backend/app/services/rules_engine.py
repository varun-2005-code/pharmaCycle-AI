"""Deterministic Rules Engine for Safe Pharmaceutical Waste Disposal Recommendations.

Decoupled strictly from generative LLMs to guarantee evidence-grounded, safety-critical advice.
Adheres to Section 4D of PROJECT_SPEC.md:
- Inputs: category, confirmed details, confirmed expiry status, material, user location, verified facility/rule data.
- Outputs: recommended action, reason, handling cautions, jurisdiction, source title and URL (only if verified),
  last verification date, and uncertainty explanation.
- Distinct logic for all 5 categories.
- Never recommend flushing or ordinary recycling bins for medicines.
- Recommend blister-pack facilities ONLY if facility acceptance is verified.
- Direct unknown or contaminated items to municipal or authorized waste handlers.
- Mark unverified data as 'general guidance, unverified' with NO fabricated URLs or regulations.
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
    """Evaluates user-confirmed inputs against deterministic disposal rules and verified facilities.

    CRITICAL SAFETY RULES:
    1. Never recommend flushing or ordinary recycling bins for medicines.
    2. Recommend blister-pack facilities ONLY if their acceptance is verified.
    3. Unknown or contaminated items go to the municipal / authorized handler.
    4. Unverified data NEVER appears as verified and has NO fabricated URLs.
    """
    category = normalize_category(request.waste_category)
    expiry = (request.expiry_status or "unverified").strip().lower()
    material = (request.material_type or "Standard packaging").strip()
    location = (request.location or "").strip()
    user_notes = (request.user_notes or "").strip()

    logger.info(
        f"Evaluating disposal rules: category='{category}', expiry='{expiry}', "
        f"material='{material}', location='{location}', notes='{user_notes}'"
    )

    # 1. Query DB for matching disposal rule (prefer matching location scope if given)
    rule: Optional[DisposalRule] = None
    if location:
        rule = db.query(DisposalRule).filter(
            DisposalRule.waste_category == category,
            DisposalRule.location_scope.ilike(f"%{location}%")
        ).first()

    if not rule:
        rule = db.query(DisposalRule).filter(
            DisposalRule.waste_category == category
        ).first()

    # 2. Facility Search with strict Blister-Pack Verification Safeguards
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
            if not isinstance(accepted, list):
                accepted = [str(accepted)]
        except Exception:
            accepted = [c.strip() for c in fac.accepted_categories.split(",") if c.strip()]

        cat_matches = any(normalize_category(acc) == category for acc in accepted)

        # Section 4D Safeguard: Recommend blister-pack facilities ONLY if facility acceptance is verified
        if category == "Empty blister pack":
            if cat_matches and fac.verification_status == "verified":
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
            else:
                logger.info(f"Skipping unverified facility #{fac.id} '{fac.name}' for blister pack recommendation.")
        elif cat_matches:
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

    # Check for reported contamination in user notes or material
    is_contaminated = any(
        term in f"{user_notes} {material}".lower()
        for term in ["contaminat", "stained", "residue", "leaking", "soiled", "hazard", "toxic"]
    )

    # 3. Category-Specific Deterministic Logic Branches
    if is_contaminated and category != "Medicine or tablet strip":
        action_text = (
            "Because this item is reported as contaminated, stained, or containing chemical residue, do NOT place it into ordinary household recycling. "
            "Direct this contaminated pharmaceutical item to your municipal hazardous waste facility or authorized hazardous waste handler."
        )
        why_text = (
            "Chemical, antibiotic, or biological contamination compromises municipal recycling streams and creates hazardous exposure risks for sanitation workers."
        )
        cautions_text = (
            "Seal the contaminated packaging in a leakproof secondary bag or container. Do not attempt to wash or dilute active chemical residues into household drains."
        )
        confidence_explanation = (
            "Deterministic safety rule: Contaminated pharmaceutical packaging cannot be processed in standard recycling and must be routed to municipal/authorized handlers."
        )

    elif category == "Medicine or tablet strip":
        if expiry in ("confirmed_expired", "expired"):
            action_text = (
                "Return expired tablets or capsules to an authorized pharmacy drop-off box or municipal drug take-back program. "
                "Keep medicines in their original container or secure sealed pouch. "
                "CRITICAL: Never flush medicines down sinks or toilets, and never place active drugs into ordinary household recycling bins."
            )
            why_text = (
                "Active pharmaceutical ingredients (APIs) flushed into drains bypass sewage treatment systems and contaminate freshwater aquifers, "
                "disrupting aquatic ecosystems and accelerating antimicrobial resistance."
            )
            cautions_text = (
                "Scratch out or deface patient identity, prescription numbers, and barcodes on the label to protect privacy. "
                "Store securely out of reach of children and animals prior to take-back handover."
            )
        elif expiry in ("confirmed_valid", "not_expired"):
            action_text = (
                "If medicines are unexpired, safe, and properly stored, consult your pharmacist or healthcare provider before discarding. "
                "If unneeded, return to an authorized take-back facility or approved community pharmacy drop-box. "
                "Never share prescription medicines, never flush them, and never dispose of them in domestic recycling."
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
                "Expiry status is unverified. Inspect packaging for visible EXP or USE BEFORE stamps. "
                "If the expiration date has passed or cannot be established with certainty, treat as expired and return to a verified pharmacy take-back collection point. "
                "Never flush medicines down the toilet or sink, and never deposit them into household recycling bins."
            )
            why_text = (
                "Without a confirmed expiration date, taking chemical medication carries health risks. "
                "Safety guidelines mandate returning expired or ambiguous pharmaceuticals to authorized collection bins."
            )
            cautions_text = "Never flush medicines or discard in standard recycling bins."

        confidence_explanation = (
            "Deterministic rule applied for active pharmaceutical compounds (Tablets/Capsules). "
            "Safety protocols mandate authorized take-back collection; domestic flushing and ordinary recycling bins are strictly prohibited."
        )

    elif category == "Empty blister pack":
        if eligible_facs:
            action_text = (
                "Deposit empty blister packs at designated pharmacy drop-boxes participating in verified specialized multilayer recycling schemes "
                "(e.g., TerraCycle collection points). Standard municipal kerbside mixed plastic recycling does NOT accept blister packs."
            )
        else:
            action_text = (
                "Empty pharmaceutical blister packs contain bonded aluminium foil and PVC/PVDC plastic and cannot be recycled in standard household kerbside bins. "
                "No verified blister-pack recycling facility is currently recorded in your immediate location. "
                "Check with your municipal waste authority or participate in verified postal mail-back blister recycling programs."
            )

        why_text = (
            "Blister packs consist of aluminium foil tightly heat-bonded to polyvinyl chloride (PVC) or PVDC plastic. "
            "Standard municipal Material Recovery Facilities (MRFs) lack thermal or mechanical delamination infrastructure to separate the foil from the polymer, "
            "causing whole bundles of plastic to be sent to landfill or incinerated."
        )
        cautions_text = (
            "Ensure every pocket is completely empty with no residual medicine fragments before depositing in the collection bin. "
            "Do NOT place empty blister packs into standard household kerbside recycling bins."
        )
        confidence_explanation = (
            "Deterministic rule applied for multilayer aluminium-polymer packaging. "
            "Facilities are recommended strictly when acceptance of multilayer blister composites is verified."
        )

    elif category == "Medicine bottle or container":
        action_text = (
            "If completely empty and safe to handle, rinse residual liquid, completely deface or remove patient prescription labels, "
            "and place into municipal glass or rigid plastic recycling according to local municipal rules. "
            "Check local rules on whether bottle caps should remain screwed on or separated."
        )
        why_text = (
            "Amber glass and rigid plastics (HDPE, PET) have high circular recyclability once completely free of chemical pharmaceutical residue."
        )
        cautions_text = (
            "Never pour leftover liquid medications, antibiotic syrups, or suspensions into household drains or sinks. "
            "If the container still contains residual liquid drug that cannot be safely emptied, return the entire bottle to an authorized medicine take-back facility."
        )
        confidence_explanation = (
            "Deterministic rule applied for rigid glass and plastic containers. "
            "Recycling eligibility requires containers to be completely empty and uncontaminated by liquid medications."
        )

    elif category == "Cardboard or paper pharmaceutical packaging":
        action_text = (
            "Flatten outer cardboard medicine cartons and place folded patient information leaflets (PILs) directly into your municipal dry paper and cardboard recycling bin."
        )
        why_text = (
            "Pharmaceutical cardboard and paper leaflets are clean cellulose fibers with high recyclability in standard paper recovery streams."
        )
        cautions_text = (
            "If the carton or leaflet has been stained or contaminated by spilled liquid medications, broken glass ampoules, or chemical fluids, "
            "do NOT place it in household paper recycling; dispose with municipal hazardous/chemical waste."
        )
        confidence_explanation = (
            "Deterministic rule applied for uncontaminated paper/cardboard packaging. "
            "Clean paper fiber is recyclable; chemically contaminated packaging must be routed to authorized waste handlers."
        )

    else:
        # Unknown or other
        action_text = (
            "Do not attempt speculative domestic recycling or disposal. "
            "Contact your municipal environmental health department, community hazardous waste drop-off event, or local hospital pharmacy waste desk for safe disposal instructions."
        )
        why_text = (
            "Unknown or contaminated pharmaceutical packaging may contain hazardous chemical compounds, cytotoxic residues, or non-recyclable composite resins. "
            "Unregulated disposal poses severe public health and environmental hazards."
        )
        cautions_text = (
            "Do not crush, burn, puncture, open, or mix unknown pharmaceutical containers. "
            "Store in a secondary leakproof bag out of reach of children and pets."
        )
        confidence_explanation = (
            "Conservative safety fallback applied for unclassified or contaminated pharmaceutical waste. "
            "Speculative domestic recycling is avoided, and users are routed to municipal authorities or authorized handlers."
        )

    # 4. Strict Verification & Source Handling (Never show unverified as verified; No fabricated URLs)
    if rule and rule.verification_status == "verified":
        source_title = rule.source_title
        source_url = rule.source_url  # Verified URL
        rule_status = "verified"
        last_verified = rule.last_verified_at.isoformat() if rule.last_verified_at else None
        location_scope = rule.location_scope
        rule_id = rule.id
    elif rule:
        source_title = rule.source_title or "General Guidance (Unverified)"
        source_url = None  # Never fabricate URLs for unverified records!
        rule_status = rule.verification_status or "general guidance, unverified"
        last_verified = None
        location_scope = rule.location_scope or "General Guidance"
        rule_id = rule.id
    else:
        source_title = "General Guidance (Unverified) - Municipal Protocol Pending"
        source_url = None  # Never fabricate URLs!
        rule_status = "general guidance, unverified"
        last_verified = None
        location_scope = "General Guidance"
        rule_id = None

    if location:
        applicable_location = f"{location} (Matched against {location_scope})"
    else:
        applicable_location = f"{location_scope} (No specific city provided)"

    return DisposalRecommendResponse(
        waste_category=category,
        recommended_action=action_text,
        why_suggested=why_text,
        reason=why_text,
        handling_cautions=cautions_text,
        applicable_location=applicable_location,
        jurisdiction=applicable_location,
        source_title=source_title,
        source_url=source_url,
        verification_status=rule_status,
        last_verified_at=last_verified,
        confidence_explanation=confidence_explanation,
        matched_rule_id=rule_id,
        eligible_facilities=eligible_facs
    )
