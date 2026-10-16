"""Collection Facilities API Endpoints."""
from typing import List, Optional
import json
from datetime import datetime, timezone
import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.collection_facility import CollectionFacility
from app.schemas.facility import FacilityCreate, FacilityResponse, FacilityListResponse

logger = logging.getLogger("pharmacycle.api.facilities")
router = APIRouter()


def _parse_facility_model(fac: CollectionFacility) -> FacilityResponse:
    """Helper to convert CollectionFacility DB model to FacilityResponse with parsed JSON categories."""
    try:
        categories = json.loads(fac.accepted_categories)
        if not isinstance(categories, list):
            categories = [str(categories)]
    except Exception:
        categories = [c.strip() for c in fac.accepted_categories.split(",") if c.strip()]

    return FacilityResponse(
        id=fac.id,
        name=fac.name,
        address=fac.address,
        city=fac.city,
        postal_code=fac.postal_code,
        latitude=fac.latitude,
        longitude=fac.longitude,
        contact_details=fac.contact_details,
        operating_hours=fac.operating_hours,
        accepted_categories=categories,
        source_url=fac.source_url,
        verification_status=fac.verification_status,
        last_verified_at=fac.last_verified_at.isoformat() if fac.last_verified_at else None,
        is_example="example" in fac.name.lower() or "demo" in fac.name.lower()
    )


@router.get("/facilities", response_model=FacilityListResponse)
def list_facilities(
    search: Optional[str] = Query(None, description="Search in name, address, city, or PIN"),
    city: Optional[str] = Query(None, description="Filter by city name"),
    pin: Optional[str] = Query(None, description="Filter by PIN / postal code"),
    postal_code: Optional[str] = Query(None, description="Filter by postal/PIN code"),
    category: Optional[str] = Query(None, description="Filter by accepted waste category"),
    verified_only: bool = Query(False, description="Filter only verified facilities"),
    db: Session = Depends(get_db)
):
    """
    Search and filter authorized pharmaceutical waste collection centres.
    Supports search by city, PIN code, and accepted waste category.
    """
    query = db.query(CollectionFacility)

    if verified_only:
        query = query.filter(CollectionFacility.verification_status == "verified")

    if city:
        query = query.filter(CollectionFacility.city.ilike(f"%{city.strip()}%"))

    target_pin = pin or postal_code
    if target_pin:
        query = query.filter(CollectionFacility.postal_code.ilike(f"%{target_pin.strip()}%"))

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (CollectionFacility.name.ilike(s)) |
            (CollectionFacility.address.ilike(s)) |
            (CollectionFacility.city.ilike(s)) |
            (CollectionFacility.postal_code.ilike(s))
        )

    all_facs = query.all()
    results: List[FacilityResponse] = []

    for fac in all_facs:
        parsed = _parse_facility_model(fac)
        if category:
            cat_lower = category.strip().lower()
            if not any(cat_lower in c.lower() for c in parsed.accepted_categories):
                continue
        results.append(parsed)

    return FacilityListResponse(
        total=len(results),
        facilities=results
    )


@router.get("/facilities/{facility_id}", response_model=FacilityResponse)
def get_facility(facility_id: int, db: Session = Depends(get_db)):
    """Retrieve details for a single collection facility by ID."""
    fac = db.query(CollectionFacility).filter(CollectionFacility.id == facility_id).first()
    if not fac:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Collection facility with ID {facility_id} not found."
        )
    return _parse_facility_model(fac)


@router.post("/facilities", response_model=FacilityResponse, status_code=status.HTTP_201_CREATED)
def create_facility(payload: FacilityCreate, db: Session = Depends(get_db)):
    """Create a new collection facility record (Admin / Data Seeding)."""
    fac = CollectionFacility(
        name=payload.name,
        address=payload.address,
        city=payload.city,
        postal_code=payload.postal_code,
        latitude=payload.latitude,
        longitude=payload.longitude,
        contact_details=payload.contact_details,
        operating_hours=payload.operating_hours,
        accepted_categories=json.dumps(payload.accepted_categories),
        source_url=payload.source_url,
        verification_status=payload.verification_status,
        last_verified_at=datetime.now(timezone.utc) if payload.verification_status == "verified" else None
    )
    db.add(fac)
    db.commit()
    db.refresh(fac)
    logger.info(f"Created facility record #{fac.id}: '{fac.name}'")
    return _parse_facility_model(fac)


@router.put("/facilities/{facility_id}", response_model=FacilityResponse)
def update_facility(facility_id: int, payload: FacilityCreate, db: Session = Depends(get_db)):
    """Update an existing collection facility record."""
    fac = db.query(CollectionFacility).filter(CollectionFacility.id == facility_id).first()
    if not fac:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Collection facility with ID {facility_id} not found."
        )

    fac.name = payload.name
    fac.address = payload.address
    fac.city = payload.city
    fac.postal_code = payload.postal_code
    fac.latitude = payload.latitude
    fac.longitude = payload.longitude
    fac.contact_details = payload.contact_details
    fac.operating_hours = payload.operating_hours
    fac.accepted_categories = json.dumps(payload.accepted_categories)
    fac.source_url = payload.source_url
    fac.verification_status = payload.verification_status
    if payload.verification_status == "verified":
        fac.last_verified_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(fac)
    logger.info(f"Updated facility record #{fac.id}")
    return _parse_facility_model(fac)
