from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/forexbot"
    API_INTERNAL_URL: str = "http://localhost:3000"
    INTERNAL_API_SECRET: str = "change-me-in-production"
    RISK_FREE_RATE: float = 0.05  # 5% anual, configurable

    class Config:
        env_file = ".env"

settings = Settings()