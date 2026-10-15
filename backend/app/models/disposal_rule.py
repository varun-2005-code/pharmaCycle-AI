"""DisposalRule SQLAlchemy Model."""
from sqlalchemy import Column, Integer, String, Text, DateTime
from app.database import Base


class DisposalRule(Base):
    __tablename__ = "disposal_rules"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    waste_category = Column(String(100), nullable=False, index=True)
    location_scope = Column(String(100), nullable=False, default="General")
    recommended_action = Column(Text, nullable=False)
    handling_cautions = Column(Text, nullable=True)
    source_title = Column(String(255), nullable=True)
    source_url = Column(String(500), nullable=True)
    verification_status = Column(String(50), nullable=False, default="unverified")
    last_verified_at = Column(DateTime(timezone=True), nullable=True)

    def __repr__(self):
        return f"<DisposalRule(id={self.id}, category='{self.waste_category}', status='{self.verification_status}')>"
