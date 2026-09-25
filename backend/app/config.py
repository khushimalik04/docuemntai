"""Environment-based settings. Plain values, no framework magic."""
import os


class Settings:
    def __init__(self) -> None:
        self.database_url = os.getenv("DATABASE_URL", "sqlite:///./fireflies.db")
        origins = os.getenv("CORS_ORIGINS", "http://localhost:3000")
        self.cors_origins = [o.strip() for o in origins.split(",") if o.strip()]
        self.anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")
        self.llm_model = os.getenv("LLM_MODEL", "claude-haiku-4-5-20251001")


settings = Settings()
