"""
Game service for handling game logic and puzzle management.
"""
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
import random

from models.puzzle import Puzzle, GameSession
from services.embedding_service import embedding_service
from config import settings


class GameService:
    """Service for game logic and puzzle operations."""

    def get_random_puzzle(self, db: Session, difficulty: Optional[str] = None) -> Optional[Puzzle]:
        """
        Get a random active puzzle from database.

        Args:
            db: Database session
            difficulty: Optional difficulty filter (easy, medium, hard)

        Returns:
            Random puzzle or None
        """
        query = db.query(Puzzle).filter(Puzzle.is_active == True)

        if difficulty:
            query = query.filter(Puzzle.difficulty == difficulty)

        # Get random puzzle
        count = query.count()
        if count == 0:
            return None

        random_offset = random.randint(0, count - 1)
        return query.offset(random_offset).first()

    def create_game_session(self, db: Session, puzzle_id: int) -> GameSession:
        """
        Create a new game session.

        Args:
            db: Database session
            puzzle_id: Puzzle ID

        Returns:
            New game session
        """
        session = GameSession(
            puzzle_id=puzzle_id,
            guesses=[],
            hints_used=0,
            won=False
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    def process_guess(
        self,
        guess: str,
        puzzle: Puzzle,
        session: GameSession,
        db: Session
    ) -> Dict:
        """
        Process a player's guess and return feedback.

        Args:
            guess: Player's guess
            puzzle: Current puzzle
            session: Game session
            db: Database session

        Returns:
            Dictionary with guess results
        """
        # Get guess embedding
        guess_embedding = embedding_service.get_embedding(guess)

        # Calculate similarity with answer
        similarity = embedding_service.calculate_similarity(
            guess_embedding,
            puzzle.answer_embedding
        )
        similarity_percentage = similarity * 100

        # Get temperature label
        temperature = embedding_service.get_temperature_label(similarity_percentage)

        # Check if won
        is_correct = similarity >= (settings.SIMILARITY_THRESHOLD_WIN / 100)

        # Also check for exact match or very close synonym
        guess_lower = guess.lower().strip()
        answer_lower = puzzle.answer.lower().strip()

        if guess_lower == answer_lower:
            is_correct = True
            similarity_percentage = 100.0
        elif puzzle.related_terms and guess_lower in [t.lower() for t in puzzle.related_terms]:
            is_correct = True
            similarity_percentage = max(similarity_percentage, 95.0)

        # Create guess record
        guess_record = {
            "guess": guess,
            "similarity": round(similarity_percentage, 1),
            "temperature": temperature,
            "is_correct": is_correct
        }

        # Update session
        current_guesses = session.guesses or []
        current_guesses.append(guess_record)
        session.guesses = current_guesses

        if is_correct:
            session.won = True

        db.commit()

        return {
            "guess": guess,
            "similarity": round(similarity_percentage, 1),
            "temperature": temperature,
            "is_correct": is_correct,
            "guess_number": len(current_guesses),
            "max_guesses": settings.MAX_GUESSES,
            "game_over": is_correct or len(current_guesses) >= settings.MAX_GUESSES
        }

    def get_hint(
        self,
        puzzle: Puzzle,
        session: GameSession,
        db: Session
    ) -> Optional[str]:
        """
        Get the next available hint for the current game session.

        Args:
            puzzle: Current puzzle
            session: Game session
            db: Database session

        Returns:
            Hint string or None if no more hints
        """
        if not puzzle.hints:
            return None

        guess_count = len(session.guesses or [])
        hints_available = [
            threshold for threshold in settings.HINT_UNLOCK_GUESSES
            if guess_count >= threshold
        ]

        if not hints_available:
            return None

        hint_index = len(hints_available) - 1
        hints_used = session.hints_used

        if hint_index >= len(puzzle.hints) or hint_index < hints_used:
            return None

        # Update hints used
        session.hints_used = hint_index + 1
        db.commit()

        return puzzle.hints[hint_index]

    def get_game_stats(self, session: GameSession) -> Dict:
        """Get statistics for a game session."""
        guesses = session.guesses or []

        if not guesses:
            return {
                "total_guesses": 0,
                "won": False,
                "hints_used": session.hints_used
            }

        similarities = [g.get("similarity", 0) for g in guesses]

        return {
            "total_guesses": len(guesses),
            "won": session.won,
            "hints_used": session.hints_used,
            "best_guess": max(similarities),
            "average_similarity": sum(similarities) / len(similarities),
            "guesses": guesses
        }


# Global instance
game_service = GameService()
