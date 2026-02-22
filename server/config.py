"""Environment variables and application settings."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://orpheus:password@localhost:5432/orpheus"

    # Supabase Auth
    supabase_url: str = "https://xxxx.supabase.co"
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = "your-supabase-jwt-secret"

    # Task queue
    redis_url: str = "redis://localhost:6379/0"

    # Anthropic
    anthropic_api_key: str = ""

    # Groq (Whisper transcription)
    groq_api_key: str = ""

    # Demucs
    demucs_model: str = "htdemucs"

    # File storage
    audio_storage_path: str = "./storage/audio"
    scores_path: str = "./scores/data"

    # Dev mode — bypasses auth for local development
    dev_mode: bool = False

    # CORS — comma-separated origins for production
    cors_origins: str = "http://localhost:3000"

    # Email
    sendgrid_api_key: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
