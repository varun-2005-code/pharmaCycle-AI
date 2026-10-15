"""WasteEvent SQLAlchemy Model."""
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, CheckConstraint, func
)
from sqlalchemy.orm import relationship

from app.database import Base


class WasteEvent(Base):
    __tablename__ = "waste_events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    waste_item_id = Column(
        Integer,
        ForeignKey("waste_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    event_type = Column(String(100), nullable=False)
    previous_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=False, index=True)
    quantity = Column(Float, nullable=True)
    quantity_unit = Column(String(50), nullable=True)
    timestamp = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )
    actor = Column(String(100), nullable=True)
    evidence_reference = Column(String(255), nullable=True)
    demo_record = Column(Boolean, nullable=False, default=False)

    # Relationships
    waste_item = relationship("WasteItem", back_populates="events")

    __table_args__ = (
        CheckConstraint(
            "quantity IS NULL OR quantity >= 0",
            name="chk_waste_event_quantity_positive"
        ),
        CheckConstraint(
            "new_status IN ('identified', 'awaiting_confirmation', 'collection_pending', 'collected', 'processed')",
            name="chk_waste_event_valid_status"
        ),
    )

    def __repr__(self):
        return (
            f"<WasteEvent(id={self.id}, item_id={self.waste_item_id}, "
            f"type='{self.event_type}', {self.previous_status}->{self.new_status})>"
        )
