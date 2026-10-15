"""PharmaCycle AI Backend Application Entrypoint."""
from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.logging_config import setup_logging
from app.api.health import router as health_router

# Initialize structured logging
setup_logging()
logger = logging.getLogger("pharmacycle.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager: sets up DB on startup and tears down on shutdown."""
    logger.info("Starting up PharmaCycle AI Backend...")
    # Initialize SQLite database and models
    init_db()
    logger.info("Database tables initialized successfully.")
    yield
    logger.info("Shutting down PharmaCycle AI Backend...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for PharmaCycle AI — Smart Pharmaceutical Waste Assistant",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# Configure CORS for local development and specified origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(health_router, prefix="/api")


@app.get("/", tags=["Root"])
def root():
    """Root endpoint providing service information."""
    return {
        "service": settings.PROJECT_NAME,
        "status": "online",
        "docs": "/docs",
        "health": "/api/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
