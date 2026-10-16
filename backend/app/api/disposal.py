"""Disposal Recommendation and Disposal Guide API Endpoints."""
from typing import List, Optional
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.disposal_rule import DisposalRule
from app.schemas.disposal import (
    DisposalRecommendRequest,
    DisposalRecommendResponse,
    DisposalGuideResponse,
    DisposalGuideArticle
)
from app.services.rules_engine import evaluate_disposal_recommendation

logger = logging.getLogger("pharmacycle.api.disposal")
router = APIRouter()


DISPOSAL_GUIDE_ARTICLES: List[DisposalGuideArticle] = [
    DisposalGuideArticle(
        id="art-tablets-capsules",
        category="Medicine or tablet strip",
        title="Expired & Unused Medicines (Tablets & Capsules)",
        common_materials="Active Pharmaceutical Ingredients (APIs), excipients, binders, gelatin/cellulose capsules.",
        appropriate_route=(
            "Return to an authorized take-back location, community pharmacy collection bin, or municipal "
            "drug take-back program. Keep in original packaging or sealed in a clear plastic bag if blister strip is unlabelled."
        ),
        what_not_to_do=(
            "NEVER flush down the toilet or wash down the sink. Do NOT place active pharmaceutical tablets into ordinary "
            "household recycling bins or compost bins. Avoid tossing into domestic garbage where pets or scavengers could ingest them."
        ),
        depends_on_local_rules=(
            "Some municipalities offer pre-paid mail-back envelopes, while others require drop-off at designated police stations "
            "or accredited pharmacies. Check local pharmacy take-back regulations."
        ),
        source_title="FDA Safe Disposal of Medicines & EPA Management Guidelines",
        source_url="https://www.fda.gov/drugs/safe-disposal-medicines",
        verification_status="verified"
    ),
    DisposalGuideArticle(
        id="art-blister-packs",
        category="Empty blister pack",
        title="Empty Pharmaceutical Blister Packs",
        common_materials="Bonded multi-layer laminate: Aluminium foil heat-sealed to Polyvinyl Chloride (PVC) or PVDC plastic.",
        appropriate_route=(
            "Deposit in specialized multi-material recycling boxes at participating pharmacies (e.g., TerraCycle collection points). "
            "These schemes use specialized mechanical delamination to separate the aluminium from the plastic polymer."
        ),
        what_not_to_do=(
            "Do NOT place empty blister packs into standard household kerbside recycling bins. "
            "Because the aluminium is bonded to plastic, standard optical sorters at municipal recovery facilities cannot separate them, "
            "causing contamination and sending entire bundles to incinerators or landfills."
        ),
        depends_on_local_rules=(
            "Only a subset of municipal areas have contracted with specialized blister recycling partners. "
            "Consult the PharmaCycle Collection Centre Locator to verify local drop box locations."
        ),
        source_title="WRAP Guidelines on Multi-Material Pharmaceutical Packaging",
        source_url="https://www.wrap.org.uk",
        verification_status="verified"
    ),
    DisposalGuideArticle(
        id="art-bottles-containers",
        category="Medicine bottle or container",
        title="Medicine Bottles & Syrup Containers",
        common_materials="Amber glass, High-Density Polyethylene (HDPE), Polyethylene Terephthalate (PET), polypropylene caps.",
        appropriate_route=(
            "If completely empty and safe to handle, rinse residual syrup/liquid, completely deface or remove patient "
            "prescription labels to protect privacy, and place into municipal glass or rigid plastic recycling."
        ),
        what_not_to_do=(
            "Do NOT pour leftover liquid medications, antibiotic syrups, or suspensions into household drains or garden soil. "
            "Do not leave personal identification or prescription numbers legible on discarded containers."
        ),
        depends_on_local_rules=(
            "Some local authorities require plastic bottle caps to remain screwed onto the bottle, while others require caps "
            "to be removed and discarded separately. Check municipal recycling rules."
        ),
        source_title="EPA Household Hazardous Waste & Pharmaceutical Packaging Guidance",
        source_url="https://www.epa.gov/hw/household-hazardous-waste-hhw",
        verification_status="verified"
    ),
    DisposalGuideArticle(
        id="art-cardboard-cartons",
        category="Cardboard or paper pharmaceutical packaging",
        title="Cardboard Medicine Cartons",
        common_materials="Bleached chemical pulp, folding boxboard, recyclable virgin and post-consumer cellulose fibers.",
        appropriate_route=(
            "Flatten outer cardboard boxes to conserve bin volume and recycle through standard dry paper and cardboard household kerbside collection."
        ),
        what_not_to_do=(
            "Do NOT place cartons in recycling if they have been stained or contaminated with spilled liquid medications, "
            "broken glass ampoules, or bodily fluids."
        ),
        depends_on_local_rules=(
            "Paper collection may require separation into designated paper recycling bins or paper sacks depending on municipal single-stream vs dual-stream sorting."
        ),
        source_title="European Paper Recycling Council & Circular Packaging Standards",
        source_url="https://www.cepi.org",
        verification_status="verified"
    ),
    DisposalGuideArticle(
        id="art-paper-leaflets",
        category="Cardboard or paper pharmaceutical packaging",
        title="Paper Leaflets (Patient Information Leaflets)",
        common_materials="Lightweight uncoated paper, wood-free cellulose, non-toxic offset printing inks.",
        appropriate_route=(
            "Clean paper leaflets (PILs) can be placed directly into dry household paper recycling alongside cardboard packaging."
        ),
        what_not_to_do=(
            "Do NOT recycle leaflets if they have absorbed liquid antibiotic syrup, chemicals, or oily suspensions."
        ),
        depends_on_local_rules=(
            "Check whether local collection permits shredded or loose small paper leaflets in commingled bins."
        ),
        source_title="Confederation of European Paper Industries / Recyclability Guidelines",
        source_url="https://www.cepi.org",
        verification_status="verified"
    ),
    DisposalGuideArticle(
        id="art-unknown-hazardous",
        category="Unknown or other",
        title="Unknown or Contaminated Pharmaceutical Packaging",
        common_materials="Unmarked multilayer plastics, damaged aerosols, cytotoxic vials, unmarked mystery compounds.",
        appropriate_route=(
            "Avoid speculative domestic disposal. Contact your municipal environmental health department, "
            "community hazardous waste drop-off event, or local hospital pharmacy disposal officer for safe handling protocols."
        ),
        what_not_to_do=(
            "Do NOT crush, burn, puncture, or open unknown containers. Never mix unknown chemical compounds into household refuse or sewers."
        ),
        depends_on_local_rules=(
            "Availability of specialized household hazardous waste collection days and drop-off depots."
        ),
        source_title="General Guidance (Unverified) - Municipal Protocol Pending",
        source_url=None,
        verification_status="general guidance, unverified"
    )
]


@router.post("/disposal/recommend", response_model=DisposalRecommendResponse)
def get_disposal_recommendation(
    payload: DisposalRecommendRequest,
    db: Session = Depends(get_db)
):
    """
    Evaluates item details (category, material, expiry, location) through the deterministic rules engine.
    Decoupled from generative LLMs to guarantee evidence-grounded, safety-critical advice.
    """
    try:
        recommendation = evaluate_disposal_recommendation(payload, db)
        return recommendation
    except Exception as e:
        logger.error(f"Error evaluating disposal recommendation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate disposal recommendation.")


@router.get("/disposal-guide", response_model=DisposalGuideResponse)
def get_disposal_guide(
    category: Optional[str] = Query(None, description="Filter guide by category"),
    search: Optional[str] = Query(None, description="Search keyword in title or materials")
):
    """
    Returns structured, comprehensive articles covering safe disposal of pharmaceutical packaging and medicines.
    Distinguishes general stewardship from verified local instructions.
    """
    articles = DISPOSAL_GUIDE_ARTICLES

    if category:
        cat_clean = category.strip().lower()
        articles = [
            a for a in articles
            if a.category.lower() == cat_clean or cat_clean in a.category.lower() or cat_clean in a.id.lower() or cat_clean in a.title.lower()
        ]

    if search:
        q = search.strip().lower()
        articles = [
            a for a in articles
            if q in a.title.lower() or q in a.common_materials.lower() or q in a.appropriate_route.lower()
        ]

    return DisposalGuideResponse(
        total_articles=len(articles),
        articles=articles
    )
