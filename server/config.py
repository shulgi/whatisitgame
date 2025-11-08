"""
Configuration settings for the What Is It game server.
All settings can be overridden via environment variables.
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "sqlite:///./whatisit.db"

    # Reddit API (optional - for authenticated requests)
    REDDIT_CLIENT_ID: Optional[str] = None
    REDDIT_CLIENT_SECRET: Optional[str] = None
    REDDIT_USER_AGENT: str = "WhatIsItGame/1.0"

    # LLM Settings (modular - easy to swap)
    LLM_PROVIDER: str = "ollama"  # Options: "ollama", "openai", "local"
    LLM_MODEL: str = "llama3.2"  # For Ollama
    LLM_BASE_URL: str = "http://localhost:11434"  # Ollama default
    LLM_TEMPERATURE: float = 0.3  # Lower for more consistent extraction

    # Embedding Settings (modular)
    EMBEDDING_PROVIDER: str = "sentence-transformers"  # Options: "sentence-transformers", "openai"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"  # Fast and good quality
    # Alternative: "all-mpnet-base-v2" for better quality but slower

    # Game Settings
    MAX_GUESSES: int = 8
    SIMILARITY_THRESHOLD_WIN: float = 0.90  # 90% similarity to win
    HINT_UNLOCK_GUESSES: list = [3, 5, 7]  # Unlock hints at these guess counts

    # Scraping Settings
    SUBREDDIT: str = "whatisthisthing"
    MIN_UPVOTES: int = 10  # Minimum upvotes for post
    MAX_POSTS_PER_SCRAPE: int = 100

    # Caching
    CACHE_REDDIT_DATA: bool = True
    CACHE_EMBEDDINGS: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()
