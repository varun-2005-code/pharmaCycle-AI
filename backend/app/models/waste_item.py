"""WasteItem SQLAlchemy Model."""
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Text, DateTime, CheckConstraint, func
)
from sqlalchemy.orm import relationship

from app.database import Base


class WasteItem(Base):
    __tablename__ = "waste_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    visual_category = Column(String(100), nullable=False, index=True)
    confidence = Column(Float, nullable=True)
    model_mode = Column(String(50), nullable=False, default="demo")
    demo_record = Column(Boolean, nullable=False, default=False, index=True)
    expiry_date = Column(String(50), nullable=True)
    expiry_confirmation_status = Column(String(50), nullable=False, default="unverified")
    material_type = Column(String(100), nullable=True)
    user_notes = Column(Text, nullable=True)
    estimated_quantity = Column(Float, nullable=True)
    quantity_unit = Column(String(50), nullable=True)
    current_status = Column(String(50), nullable=False, default="identified", index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now()
    )

    # Relationships
    events = relationship(
        "WasteEvent",
        back_populates="waste_item",
        cascade="all, delete-orphan",
        order_by="WasteEvent.timestamp.asc()"
    )

    __table_args__ = (
        CheckConstraint(
            "estimated_quantity IS NULL OR estimated_quantity >= 0",
            name="chk_waste_item_estimated_quantity_positive"
        ),
        CheckConstraint(
            "current_status IN ('identified', 'awaiting_confirmation', 'collection_pending', 'collected', 'processed')",
            name="chk_waste_item_valid_status"
        ),
    )

    def __repr__(self):
        return f"<WasteItem(id={self.id}, category='{self.visual_category}', status='{self.current_status}')>"
