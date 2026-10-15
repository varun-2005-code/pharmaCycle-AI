"""Database setup and session management for PharmaCycle AI Backend."""
import logging
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

logger = logging.getLogger(__name__)

# Engine configuration supporting SQLite and PostgreSQL
connect_args = {}
if "sqlite" in settings.DATABASE_URL:
    connect_args["check_same_thread"] = False

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=(settings.LOG_LEVEL.upper() == "DEBUG")
)

# Enable foreign keys for SQLite
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if "sqlite" in settings.DATABASE_URL:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency yield for FastAPI request database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables on application startup."""
    # Import all models so that Base.metadata has all table definitions
    import app.models  # noqa: F401
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database schema initialized successfully.")

    # Seed baseline disposal rules and demo facilities
    from app.services.seed_data import seed_rules_and_facilities
    db = SessionLocal()
    try:
        seed_rules_and_facilities(db)
    finally:
        db.close()
