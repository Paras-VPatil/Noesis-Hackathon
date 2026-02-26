import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "AskMyNotes"
    API_V1_STR: str = "/api/v1"
    
    # Gemini API
    GEMINI_API_KEY: str = ""
    
    # Chroma DB
    CHROMA_PERSIST_DIRECTORY: str = "./chroma_db"
    
    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "askmynotes"
    
    # Security
    SECRET_KEY: str = "your-secret-key-here"  # change in production
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=True)

settings = Settings()
