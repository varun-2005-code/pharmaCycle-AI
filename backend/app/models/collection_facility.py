"""CollectionFacility SQLAlchemy Model."""
from sqlalchemy import Column, Integer, String, Float, Text, DateTime
from app.database import Base


class CollectionFacility(Base):
    __tablename__ = "collection_facilities"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False, index=True)
    address = Column(String(500), nullable=False)
    city = Column(String(100), nullable=False, index=True)
    postal_code = Column(String(50), nullable=True, index=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    contact_details = Column(String(255), nullable=True)
    operating_hours = Column(String(255), nullable=True)
    accepted_categories = Column(Text, nullable=False)  # JSON or comma-separated list of categories
    source_url = Column(String(500), nullable=True)
    verification_status = Column(String(50), nullable=False, default="unverified")
    last_verified_at = Column(DateTime(timezone=True), nullable=True)

    def __repr__(self):
        return f"<CollectionFacility(id={self.id}, name='{self.name}', city='{self.city}')>"
