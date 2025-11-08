"""
API routes for puzzle operations.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models.puzzle import Puzzle
from services.game_service import game_service

router = APIRouter(prefix="/api/puzzle", tags=["puzzle"])


@router.get("/random")
def get_random_puzzle(
    difficulty: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get a random puzzle to play.

    Args:
        difficulty: Optional difficulty filter (easy, medium, hard)

    Returns:
        Puzzle data (without answer or embeddings)
    """
    puzzle = game_service.get_random_puzzle(db, difficulty)

    if not puzzle:
        raise HTTPException(status_code=404, detail="No puzzles available")

    return {
        "id": puzzle.id,
        "image_url": puzzle.image_url,
        "category": puzzle.category,
        "difficulty": puzzle.difficulty,
        "hint_count": len(puzzle.hints) if puzzle.hints else 0,
    }


@router.get("/{puzzle_id}")
def get_puzzle(
    puzzle_id: int,
    db: Session = Depends(get_db)
):
    """Get puzzle by ID (without answer)."""
    puzzle = db.query(Puzzle).filter(Puzzle.id == puzzle_id).first()

    if not puzzle:
        raise HTTPException(status_code=404, detail="Puzzle not found")

    return {
        "id": puzzle.id,
        "image_url": puzzle.image_url,
        "category": puzzle.category,
        "difficulty": puzzle.difficulty,
        "hint_count": len(puzzle.hints) if puzzle.hints else 0,
    }


@router.get("/stats/count")
def get_puzzle_count(db: Session = Depends(get_db)):
    """Get total number of active puzzles."""
    count = db.query(Puzzle).filter(Puzzle.is_active == True).count()
    return {"total_puzzles": count}
