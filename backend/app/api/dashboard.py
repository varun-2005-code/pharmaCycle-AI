"""Dashboard Analytics and Summary API Endpoints for PharmaCycle AI."""
from typing import List, Dict
from datetime import datetime, timezone, timedelta
from collections import defaultdict
import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.waste_item import WasteItem
from app.models.waste_event import WasteEvent
from app.schemas.dashboard import (
    DashboardSummaryResponse,
    DashboardAnalyticsResponse,
    StatusCounts,
    CategoryCount,
    StatusCountItem,
    TimelinePoint,
    QuantityMetrics
)

logger = logging.getLogger("pharmacycle.api.dashboard")
router = APIRouter()


@router.get("/dashboard/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(db: Session = Depends(get_db)):
    """
    Returns high-level KPI counts for the Digital Twin Tracking Dashboard.
    Reflects the 5-state lifecycle model.
    """
    total_items = db.query(WasteItem).count()
    demo_items = db.query(WasteItem).filter(WasteItem.model_mode == "demo").count()
    actual_items = total_items - demo_items

    # Status counts
    counts_by_status = db.query(
        WasteItem.current_status, func.count(WasteItem.id)
    ).group_by(WasteItem.current_status).all()

    status_map = {st: cnt for st, cnt in counts_by_status}

    status_counts = StatusCounts(
        identified=status_map.get("identified", 0),
        awaiting_confirmation=status_map.get("awaiting_confirmation", 0),
        collection_pending=status_map.get("collection_pending", 0),
        collected=status_map.get("collected", 0),
        processed=status_map.get("processed", 0)
    )

    total_events = db.query(WasteEvent).count()
    
    # Recent events in last 24h or total
    recent_events_count = db.query(WasteEvent).count()

    return DashboardSummaryResponse(
        total_items=total_items,
        status_breakdown=status_counts,
        total_events=total_events,
        demo_items_count=demo_items,
        actual_items_count=actual_items,
        recent_events_count=recent_events_count
    )


@router.get("/dashboard/analytics", response_model=DashboardAnalyticsResponse)
def get_dashboard_analytics(db: Session = Depends(get_db)):
    """
    Returns structured analytical charts data for Recharts:
    - Category-wise distribution
    - Status breakdown
    - Time-series event flow
    - Distinct quantity metrics (User-reported vs Collected vs Verified Processed)
    """
    total_items = db.query(WasteItem).count()

    # 1. Category Distribution
    category_counts = db.query(
        WasteItem.visual_category, func.count(WasteItem.id)
    ).group_by(WasteItem.visual_category).all()

    cat_list: List[CategoryCount] = []
    for cat, cnt in category_counts:
        pct = round((cnt / total_items * 100), 1) if total_items > 0 else 0.0
        cat_list.append(CategoryCount(category=cat, count=cnt, percentage=pct))

    # If empty, provide standard zero categories
    if not cat_list:
        standard_cats = [
            "Medicine or tablet strip",
            "Empty blister pack",
            "Medicine bottle or container",
            "Cardboard or paper pharmaceutical packaging",
            "Unknown or other"
        ]
        cat_list = [CategoryCount(category=c, count=0, percentage=0.0) for c in standard_cats]

    # 2. Status Distribution
    status_order = [
        ("identified", "1. Identified"),
        ("awaiting_confirmation", "2. Awaiting Confirmation"),
        ("collection_pending", "3. Collection Pending"),
        ("collected", "4. In Custody / Collected"),
        ("processed", "5. Processed / Recovered")
    ]
    status_counts_db = dict(
        db.query(WasteItem.current_status, func.count(WasteItem.id)).group_by(WasteItem.current_status).all()
    )
    status_distribution = [
        StatusCountItem(status=k, label=lbl, count=status_counts_db.get(k, 0))
        for k, lbl in status_order
    ]

    # 3. Time-series Flow
    events = db.query(WasteEvent).order_by(WasteEvent.timestamp.asc()).all()
    timeline_map = defaultdict(lambda: {"events": 0, "identified": 0, "collected": 0, "processed": 0})

    for ev in events:
        day_str = ev.timestamp.strftime("%Y-%m-%d") if ev.timestamp else datetime.now(timezone.utc).strftime("%Y-%m-%d")
        timeline_map[day_str]["events"] += 1
        if ev.new_status == "identified":
            timeline_map[day_str]["identified"] += 1
        elif ev.new_status == "collected":
            timeline_map[day_str]["collected"] += 1
        elif ev.new_status == "processed":
            timeline_map[day_str]["processed"] += 1

    timeline_points: List[TimelinePoint] = []
    if timeline_map:
        for d, vals in sorted(timeline_map.items()):
            timeline_points.append(
                TimelinePoint(
                    date=d,
                    events=vals["events"],
                    identified=vals["identified"],
                    collected=vals["collected"],
                    processed=vals["processed"]
                )
            )
    else:
        # Default mock point if empty
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        timeline_points.append(
            TimelinePoint(date=today, events=0, identified=0, collected=0, processed=0)
        )

    # 4. Quantities Breakdown (Distinguishing user-reported vs recorded collected vs verified processed)
    # Section 4G requirement: "The dashboard must distinguish: Estimated or user-reported quantities,
    # Recorded collection events, Verified processing and recovery events. Do not infer recycled quantities from detected items."
    user_reported_sum = db.query(func.sum(WasteItem.estimated_quantity)).scalar() or 0.0

    collected_events_sum = db.query(func.sum(WasteEvent.quantity)).filter(
        WasteEvent.new_status == "collected"
    ).scalar() or 0.0

    processed_events_sum = db.query(func.sum(WasteEvent.quantity)).filter(
        WasteEvent.new_status == "processed"
    ).scalar() or 0.0

    quantities = QuantityMetrics(
        user_reported_units=float(user_reported_sum),
        recorded_collected_units=float(collected_events_sum),
        verified_processed_units=float(processed_events_sum),
        note="Recycled quantities are not inferred from detected items; strictly based on verified processing events."
    )

    return DashboardAnalyticsResponse(
        category_distribution=cat_list,
        status_distribution=status_distribution,
        timeline=timeline_points,
        quantities=quantities
    )
