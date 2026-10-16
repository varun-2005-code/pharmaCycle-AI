"""Configuration settings for PharmaCycle AI Backend."""
from typing import List, Union, Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "PharmaCycle AI - Smart Pharmaceutical Waste Assistant"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    DATABASE_URL: str = "sqlite:///./pharmacycle.db"
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]
    HOST: str = "127.0.0.1"
    PORT: int = 8000

    # Image upload and retention configuration (Section 8)
    MAX_UPLOAD_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB
    RETAIN_UPLOADED_IMAGES: bool = False  # Set to True only if persistent image archiving is desired
    UPLOAD_DIR: str = "./uploads"

    # AI Model Adapter configuration (Section 4B)
    MODEL_MODE: str = "demo"  # "demo" or "real"
    MODEL_PATH: str = "./models/waste_classifier.onnx"

    # Development Admin Authentication (Section 4J)
    ADMIN_SECRET_KEY: str = "pharmacycle-dev-admin-key-2026"

    # LLM Assistant Grounding (Section 4E) - Optional external API keys
    GEMINI_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )


settings = Settings()
