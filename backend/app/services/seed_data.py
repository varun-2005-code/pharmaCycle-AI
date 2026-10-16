"""Seed data provider and database initialization utilities for PharmaCycle AI."""
import json
from datetime import datetime, timezone
import logging
from sqlalchemy.orm import Session

from app.models.disposal_rule import DisposalRule
from app.models.collection_facility import CollectionFacility
from app.models.waste_item import WasteItem
from app.models.waste_event import WasteEvent

logger = logging.getLogger("pharmacycle.seed")

DEFAULT_DISPOSAL_RULES = [
    {
        "waste_category": "Medicine or tablet strip",
        "location_scope": "National / General Take-Back",
        "recommended_action": (
            "Take expired or unused tablets and capsules to an authorized pharmacy drop-off box or municipal "
            "take-back program. Keep medicines in original packaging or sealed in a clear bag if loose. "
            "Never flush medicines down the toilet or sink, and never deposit them into household recycling bins."
        ),
        "handling_cautions": (
            "Keep out of reach of children and pets. Do not crush tablets or open capsules. Scratch out or remove "
            "any personal identification (patient name, prescription number) from the pharmacy label before disposal."
        ),
        "source_title": "WHO Safe Disposal of Unwanted Pharmaceuticals in and after Emergencies / FDA Medicine Disposal Guidelines",
        "source_url": "https://www.fda.gov/drugs/safe-disposal-medicines/disposal-unused-medicines-what-you-should-know",
        "verification_status": "verified",
        "last_verified_at": datetime.now(timezone.utc)
    },
    {
        "waste_category": "Empty blister pack",
        "location_scope": "Specialized Multilayer Recycling",
        "recommended_action": (
            "Empty pharmaceutical blister packs are made of bonded aluminium foil and PVC/PVDC plastic. "
            "Standard household kerbside recycling cannot separate these bonded layers. Deposit empty blister packs "
            "at designated pharmacy collection points participating in specialized multilayer blister recycling schemes."
        ),
        "handling_cautions": (
            "Ensure blister pockets are completely empty and free of leftover medicine fragments. "
            "Do not mix with standard PET or HDPE domestic recycling unless your local MRF explicitly confirms "
            "acceptance of bonded foil-plastic composites."
        ),
        "source_title": "WRAP UK / European Packaging and Packaging Waste Directive & Specialized Blister Recycling Programs",
        "source_url": "https://www.wrap.org.uk",
        "verification_status": "verified",
        "last_verified_at": datetime.now(timezone.utc)
    },
    {
        "waste_category": "Medicine bottle or container",
        "location_scope": "Municipal Glass & Rigid Plastics",
        "recommended_action": (
            "Empty amber glass bottles or rigid HDPE/PET plastic syrup containers can often be recycled in municipal "
            "streams once completely emptied and rinsed, subject to local hazardous contamination bylaws. "
            "Check local rules on whether plastic caps should remain attached or separated."
        ),
        "handling_cautions": (
            "Do not pour leftover liquid medications into the drain or sink. Wipe off residues and completely deface "
            "or peel off personal prescription identity labels to protect patient privacy."
        ),
        "source_title": "EPA Household Hazardous Waste & Pharmaceutical Packaging Guidance",
        "source_url": "https://www.epa.gov/hw/household-hazardous-waste-hhw",
        "verification_status": "verified",
        "last_verified_at": datetime.now(timezone.utc)
    },
    {
        "waste_category": "Cardboard or paper pharmaceutical packaging",
        "location_scope": "Municipal Dry Paper Stream",
        "recommended_action": (
            "Cardboard outer cartons and folded paper patient information leaflets (PILs) are fully recyclable. "
            "Flatten the cardboard boxes to conserve bin volume and deposit in dry paper/cardboard kerbside recycling."
        ),
        "handling_cautions": (
            "Ensure the packaging is clean and dry. If the carton was soiled or contaminated by broken ampoules or leaked "
            "liquid antibiotics, treat it as contaminated waste and route to authorized disposal."
        ),
        "source_title": "Confederation of European Paper Industries / Recyclability Guidelines",
        "source_url": "https://www.cepi.org",
        "verification_status": "verified",
        "last_verified_at": datetime.now(timezone.utc)
    },
    {
        "waste_category": "Unknown or other",
        "location_scope": "Municipal Hazardous Waste Authority",
        "recommended_action": (
            "For unidentified or complex pharmaceutical packaging, avoid speculative domestic disposal. "
            "Contact your local municipal environmental health authority, hospital pharmacy waste desk, or authorized "
            "hazardous waste transfer station for specific segregation advice."
        ),
        "handling_cautions": (
            "Do not open, puncture, burn, crush, or mix unknown pharmaceutical containers. "
            "Handle with gloves if leaking or damaged, and store in a secure secondary container."
        ),
        "source_title": "General Guidance (Unverified) - Municipal Protocol Pending",
        "source_url": None,
        "verification_status": "general guidance, unverified",
        "last_verified_at": None
    }
]

DEFAULT_FACILITIES = [
    {
        "name": "GreenCross Eco Pharmacy [EXAMPLE – not a real facility]",
        "address": "104 Botanical Way, Health District",
        "city": "Central City",
        "postal_code": "10001",
        "latitude": 40.7128,
        "longitude": -74.0060,
        "contact_details": "+1 (555) 019-2834 • contact@greencross-demo.org",
        "operating_hours": "Mon - Fri 08:00 - 20:00, Sat 09:00 - 17:00",
        "accepted_categories": json.dumps([
            "Medicine or tablet strip",
            "Empty blister pack",
            "Medicine bottle or container"
        ]),
        "source_url": "https://pharmacycle.local/demo-facilities",
        "verification_status": "verified",
        "last_verified_at": datetime.now(timezone.utc)
    },
    {
        "name": "TerraCycle Blister Pack Drop Box [EXAMPLE – not a real facility]",
        "address": "45 Circular Economy Plaza",
        "city": "Central City",
        "postal_code": "10005",
        "latitude": 40.7050,
        "longitude": -74.0090,
        "contact_details": "+1 (555) 014-9912 • blisters@terracycle-demo.com",
        "operating_hours": "24/7 Drop Box Access",
        "accepted_categories": json.dumps([
            "Empty blister pack"
        ]),
        "source_url": "https://pharmacycle.local/demo-facilities",
        "verification_status": "verified",
        "last_verified_at": datetime.now(timezone.utc)
    },
    {
        "name": "Metro Health Hospital Take-Back Kiosk [EXAMPLE – not a real facility]",
        "address": "500 Medical Center Blvd",
        "city": "Metro City",
        "postal_code": "20002",
        "latitude": 38.9072,
        "longitude": -77.0369,
        "contact_details": "+1 (555) 018-7721 • pharmacy@metrohealth-demo.gov",
        "operating_hours": "Mon - Sun 07:00 - 22:00",
        "accepted_categories": json.dumps([
            "Medicine or tablet strip",
            "Unknown or other"
        ]),
        "source_url": "https://pharmacycle.local/demo-facilities",
        "verification_status": "verified",
        "last_verified_at": datetime.now(timezone.utc)
    },
    {
        "name": "Harbor Industrial Materials Reclamation [EXAMPLE – not a real facility]",
        "address": "Pier 18, Harbor Industrial Park",
        "city": "Harbor City",
        "postal_code": "30003",
        "latitude": 37.7749,
        "longitude": -122.4194,
        "contact_details": "+1 (555) 012-3456 • info@harborreclaim-demo.org",
        "operating_hours": "Tue - Sat 08:30 - 16:30",
        "accepted_categories": json.dumps([
            "Cardboard or paper pharmaceutical packaging",
            "Medicine bottle or container"
        ]),
        "source_url": "https://pharmacycle.local/demo-facilities",
        "verification_status": "verified",
        "last_verified_at": datetime.now(timezone.utc)
    },
    {
        "name": "Suburban Drugstore Unverified Bin [EXAMPLE – not a real facility]",
        "address": "12 Maple Street",
        "city": "Riverdale",
        "postal_code": "40004",
        "latitude": 41.8781,
        "longitude": -87.6298,
        "contact_details": "+1 (555) 016-8800",
        "operating_hours": "Mon - Sat 09:00 - 19:00",
        "accepted_categories": json.dumps([
            "Medicine or tablet strip"
        ]),
        "source_url": "https://pharmacycle.local/demo-facilities",
        "verification_status": "unverified",  # Explicitly unverified per section 4F
        "last_verified_at": None
    },
    {
        "name": "Riverdale Quick-Care Unverified Blister Box [EXAMPLE – not a real facility]",
        "address": "77 Elm Street",
        "city": "Riverdale",
        "postal_code": "40004",
        "latitude": 41.8790,
        "longitude": -87.6300,
        "contact_details": "+1 (555) 019-4411",
        "operating_hours": "Drop Box Only",
        "accepted_categories": json.dumps([
            "Empty blister pack"
        ]),
        "source_url": None,
        "verification_status": "unverified",  # Section 4D: Unverified blister box must NOT be recommended
        "last_verified_at": None
    }
]


def seed_rules_and_facilities(db: Session) -> None:
    """Populates baseline disposal rules and demo facilities if not already present."""
    for r_data in DEFAULT_DISPOSAL_RULES:
        existing = db.query(DisposalRule).filter(
            DisposalRule.waste_category == r_data["waste_category"]
        ).first()
        if not existing:
            db.add(DisposalRule(**r_data))
        else:
            # Update fields to ensure accurate verification status and no fabricated URLs
            for k, v in r_data.items():
                setattr(existing, k, v)
    db.commit()

    for f_data in DEFAULT_FACILITIES:
        # Match by name or address so legacy rows get updated to [EXAMPLE – not a real facility]
        existing_f = db.query(CollectionFacility).filter(
            (CollectionFacility.name == f_data["name"]) |
            (CollectionFacility.address == f_data["address"])
        ).first()
        if not existing_f:
            db.add(CollectionFacility(**f_data))
        else:
            for k, v in f_data.items():
                setattr(existing_f, k, v)
    db.commit()

    # Ensure any remaining legacy facility names are updated to [EXAMPLE – not a real facility]
    legacy_facs = db.query(CollectionFacility).all()
    for fac in legacy_facs:
        if "[Demo Facility]" in fac.name:
            fac.name = fac.name.replace("[Demo Facility]", "[EXAMPLE – not a real facility]")
        elif "EXAMPLE" not in fac.name:
            fac.name = f"{fac.name} [EXAMPLE – not a real facility]"
    db.commit()

    logger.info("Baseline rules and collection facilities synchronized.")


def seed_demo_waste_items_and_events(db: Session) -> dict:
    """Seeds rich demo items and verified lifecycle event histories for judges to explore."""
    # Reset existing demo records first
    reset_demo_data(db)

    logger.info("Seeding interactive demo waste items and events...")

    sample_items = [
        {
            "visual_category": "Medicine or tablet strip",
            "confidence": None,
            "model_mode": "demo",
            "demo_record": True,
            "expiry_date": "11/2024",
            "expiry_confirmation_status": "confirmed_expired",
            "material_type": "PVC/Aluminium Blister with Tablets",
            "user_notes": "Expired antibiotic course, 8 capsules remaining",
            "estimated_quantity": 8.0,
            "quantity_unit": "capsules",
            "current_status": "processed",
            "history": [
                ("identified", None, "identified", "Household User", "Visual scan captured via camera", 8.0, "capsules"),
                ("confirmed", "identified", "awaiting_confirmation", "Household User", "User verified expiry 11/2024", 8.0, "capsules"),
                ("booking", "awaiting_confirmation", "collection_pending", "PharmaCycle Dispatch", "Take-back booking REF-TK-9021", 8.0, "capsules"),
                ("collection", "collection_pending", "collected", "GreenCross Logistics Courier", "Physical custody handover manifest #4401", 8.0, "capsules"),
                ("processing", "collected", "processed", "Thermal Destruction Plant #2", "High-temperature incineration certificate CERT-HT-8891", 8.0, "capsules")
            ]
        },
        {
            "visual_category": "Empty blister pack",
            "confidence": None,
            "model_mode": "demo",
            "demo_record": True,
            "expiry_date": None,
            "expiry_confirmation_status": "unverified",
            "material_type": "Multilayer PVC/Aluminium Composite",
            "user_notes": "Empty allergy medication foil strips",
            "estimated_quantity": 5.0,
            "quantity_unit": "packs",
            "current_status": "collected",
            "history": [
                ("identified", None, "identified", "Household User", "Scanned empty strip", 5.0, "packs"),
                ("confirmed", "identified", "awaiting_confirmation", "Household User", "Confirmed empty blister", 5.0, "packs"),
                ("booking", "awaiting_confirmation", "collection_pending", "Drop-box Agent", "TerraCycle Blister Bin Drop-off registered", 5.0, "packs"),
                ("collection", "collection_pending", "collected", "EcoHaul Route #14", "Consolidated into batch BIN-BL-330", 5.0, "packs")
            ]
        },
        {
            "visual_category": "Medicine bottle or container",
            "confidence": None,
            "model_mode": "demo",
            "demo_record": True,
            "expiry_date": "08/2025",
            "expiry_confirmation_status": "confirmed_valid",
            "material_type": "Amber Glass (Rinsed)",
            "user_notes": "Cough syrup bottle, cleaned with label defaced",
            "estimated_quantity": 2.0,
            "quantity_unit": "bottles",
            "current_status": "collection_pending",
            "history": [
                ("identified", None, "identified", "Household User", "Photo taken of amber bottle", 2.0, "bottles"),
                ("confirmed", "identified", "awaiting_confirmation", "Household User", "Rinsed and confirmed", 2.0, "bottles"),
                ("booking", "awaiting_confirmation", "collection_pending", "Municipal Glass Reclaim", "Pickup scheduled slot Thu 14:00", 2.0, "bottles")
            ]
        },
        {
            "visual_category": "Cardboard or paper pharmaceutical packaging",
            "confidence": None,
            "model_mode": "demo",
            "demo_record": True,
            "expiry_date": None,
            "expiry_confirmation_status": "unverified",
            "material_type": "Recyclable Paperboard",
            "user_notes": "Flattened outer pill boxes and folded leaflet",
            "estimated_quantity": 4.0,
            "quantity_unit": "cartons",
            "current_status": "awaiting_confirmation",
            "history": [
                ("identified", None, "identified", "Household User", "Cardboard packaging identified", 4.0, "cartons"),
                ("awaiting", "identified", "awaiting_confirmation", "Household User", "Awaiting confirmation of dry condition", 4.0, "cartons")
            ]
        },
        {
            "visual_category": "Medicine or tablet strip",
            "confidence": None,
            "model_mode": "demo",
            "demo_record": True,
            "expiry_date": "02/2024",
            "expiry_confirmation_status": "confirmed_expired",
            "material_type": "Alu-Alu Cold Form Strip",
            "user_notes": "Unused blood pressure tablets",
            "estimated_quantity": 14.0,
            "quantity_unit": "tablets",
            "current_status": "identified",
            "history": [
                ("identified", None, "identified", "Household User", "Initial visual classification completed", 14.0, "tablets")
            ]
        },
        {
            "visual_category": "Unknown or other",
            "confidence": None,
            "model_mode": "demo",
            "demo_record": True,
            "expiry_date": None,
            "expiry_confirmation_status": "unverified",
            "material_type": "Unmarked Plastic Polymer",
            "user_notes": "Unlabelled ointment tube with damaged nozzle",
            "estimated_quantity": 1.0,
            "quantity_unit": "tube",
            "current_status": "identified",
            "history": [
                ("identified", None, "identified", "Household User", "Classified as Unknown / Needs Review", 1.0, "tube")
            ]
        }
    ]

    items_created = 0
    events_created = 0

    for item_data in sample_items:
        history = item_data.pop("history")
        item = WasteItem(**item_data)
        db.add(item)
        db.flush()  # assign item.id
        items_created += 1

        for ev_type, prev_st, new_st, actor, ev_ref, qty, unit in history:
            event = WasteEvent(
                waste_item_id=item.id,
                event_type=ev_type,
                previous_status=prev_st,
                new_status=new_st,
                quantity=qty,
                quantity_unit=unit,
                actor=actor,
                evidence_reference=ev_ref,
                demo_record=True
            )
            db.add(event)
            events_created += 1

    db.commit()
    logger.info(f"Seeded {items_created} demo waste items and {events_created} waste events.")
    return {"items_seeded": items_created, "events_seeded": events_created}


def reset_demo_data(db: Session) -> dict:
    """Removes demo waste items and events while preserving baseline rules and facilities."""
    # Delete events associated with demo records
    demo_events_deleted = db.query(WasteEvent).filter(WasteEvent.demo_record.is_(True)).delete(synchronize_session=False)
    # Delete waste items marked demo_record=True or model_mode="demo"
    demo_items_deleted = db.query(WasteItem).filter(
        (WasteItem.demo_record.is_(True)) | (WasteItem.model_mode == "demo")
    ).delete(synchronize_session=False)
    db.commit()
    logger.info(f"Demo data reset: deleted {demo_items_deleted} items and {demo_events_deleted} events.")
    return {"demo_items_deleted": demo_items_deleted, "demo_events_deleted": demo_events_deleted}
