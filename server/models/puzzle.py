"""
Database models for puzzles and game sessions.
"""
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, Boolean, JSON
from datetime import datetime
from database import Base


class Puzzle(Base):
    """
    Represents a curated puzzle from Reddit.
    Stores all processed data to avoid reprocessing.
    """
    __tablename__ = "puzzles"

    id = Column(Integer, primary_key=True, index=True)

    # Reddit data
    reddit_post_id = Column(String, unique=True, index=True, nullable=False)
    reddit_url = Column(String, nullable=False)
    image_url = Column(String, nullable=False)
    post_title = Column(Text)

    # Processed answer data
    answer = Column(String, nullable=False)  # The actual object name
    category = Column(String)  # tool, organism, artifact, etc.
    difficulty = Column(String, default="medium")  # easy, medium, hard

    # LLM-extracted data (stored as JSON to avoid reprocessing)
    hints = Column(JSON)  # List of progressive hints
    related_terms = Column(JSON)  # Synonyms and related words
    extracted_context = Column(Text)  # Raw extracted info from comments

    # Embeddings (stored as JSON array to avoid reprocessing)
    answer_embedding = Column(JSON, nullable=False)

    # Metadata
    upvotes = Column(Integer, default=0)
    comment_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)  # Can be disabled if inappropriate

    # Processing metadata
    llm_model_used = Column(String)  # Track which model was used
    embedding_model_used = Column(String)  # Track which embedding model
    processed_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "reddit_post_id": self.reddit_post_id,
            "image_url": self.image_url,
            "category": self.category,
            "difficulty": self.difficulty,
            "hint_count": len(self.hints) if self.hints else 0,
        }


class GameSession(Base):
    """
    Track individual game sessions (optional - for stats).
    """
    __tablename__ = "game_sessions"

    id = Column(Integer, primary_key=True, index=True)
    puzzle_id = Column(Integer, index=True)

    # Game state
    guesses = Column(JSON)  # List of {guess, similarity, temperature}
    hints_used = Column(Integer, default=0)
    won = Column(Boolean, default=False)

    # Timestamps
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    def to_dict(self):
        """Convert to dictionary."""
        return {
            "id": self.id,
            "puzzle_id": self.puzzle_id,
            "guesses": self.guesses,
            "hints_used": self.hints_used,
            "won": self.won,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }
