"""
API routes for game operations.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models.puzzle import Puzzle, GameSession
from services.game_service import game_service

router = APIRouter(prefix="/api/game", tags=["game"])


class StartGameRequest(BaseModel):
    puzzle_id: int


class GuessRequest(BaseModel):
    session_id: int
    guess: str


class HintRequest(BaseModel):
    session_id: int


@router.post("/start")
def start_game(
    request: StartGameRequest,
    db: Session = Depends(get_db)
):
    """
    Start a new game session for a puzzle.

    Args:
        request: Contains puzzle_id

    Returns:
        New game session
    """
    # Verify puzzle exists
    puzzle = db.query(Puzzle).filter(Puzzle.id == request.puzzle_id).first()
    if not puzzle:
        raise HTTPException(status_code=404, detail="Puzzle not found")

    # Create session
    session = game_service.create_game_session(db, request.puzzle_id)

    return {
        "session_id": session.id,
        "puzzle_id": session.puzzle_id,
        "max_guesses": 8,
        "started_at": session.started_at.isoformat()
    }


@router.post("/guess")
def make_guess(
    request: GuessRequest,
    db: Session = Depends(get_db)
):
    """
    Make a guess for the current game.

    Args:
        request: Contains session_id and guess

    Returns:
        Guess result with similarity and feedback
    """
    # Get session
    session = db.query(GameSession).filter(GameSession.id == request.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")

    # Get puzzle
    puzzle = db.query(Puzzle).filter(Puzzle.id == session.puzzle_id).first()
    if not puzzle:
        raise HTTPException(status_code=404, detail="Puzzle not found")

    # Check if game is already over
    if session.won or (session.guesses and len(session.guesses) >= 8):
        raise HTTPException(status_code=400, detail="Game is already over")

    # Process guess
    result = game_service.process_guess(request.guess, puzzle, session, db)

    # If game is over, include answer
    if result["game_over"]:
        result["answer"] = puzzle.answer
        result["answer_explanation"] = puzzle.extracted_context

    return result


@router.post("/hint")
def get_hint(
    request: HintRequest,
    db: Session = Depends(get_db)
):
    """
    Get the next available hint.

    Args:
        request: Contains session_id

    Returns:
        Hint text or error
    """
    # Get session
    session = db.query(GameSession).filter(GameSession.id == request.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")

    # Get puzzle
    puzzle = db.query(Puzzle).filter(Puzzle.id == session.puzzle_id).first()
    if not puzzle:
        raise HTTPException(status_code=404, detail="Puzzle not found")

    # Get hint
    hint = game_service.get_hint(puzzle, session, db)

    if hint is None:
        raise HTTPException(
            status_code=400,
            detail="No hints available. Make more guesses to unlock hints."
        )

    return {
        "hint": hint,
        "hints_used": session.hints_used,
        "guess_count": len(session.guesses or [])
    }


@router.get("/session/{session_id}")
def get_session(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get game session details."""
    session = db.query(GameSession).filter(GameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")

    stats = game_service.get_game_stats(session)

    return {
        "session_id": session.id,
        "puzzle_id": session.puzzle_id,
        "stats": stats,
        "started_at": session.started_at.isoformat(),
        "completed_at": session.completed_at.isoformat() if session.completed_at else None
    }


@router.post("/give-up/{session_id}")
def give_up(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Give up on the current game and reveal the answer.

    Args:
        session_id: Game session ID

    Returns:
        Answer and puzzle details
    """
    # Get session
    session = db.query(GameSession).filter(GameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")

    # Get puzzle
    puzzle = db.query(Puzzle).filter(Puzzle.id == session.puzzle_id).first()
    if not puzzle:
        raise HTTPException(status_code=404, detail="Puzzle not found")

    # Mark session as completed (not won)
    session.won = False
    db.commit()

    return {
        "answer": puzzle.answer,
        "category": puzzle.category,
        "explanation": puzzle.extracted_context,
        "reddit_url": puzzle.reddit_url,
        "guesses_made": len(session.guesses or [])
    }
