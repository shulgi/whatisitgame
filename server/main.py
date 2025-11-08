"""
Main FastAPI application for What Is It Game.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import settings
from database import init_db
from routers import puzzle, game


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    print("Initializing database...")
    init_db()
    print("Database initialized!")
    yield


# Create FastAPI app
app = FastAPI(
    title="What Is It? Game API",
    description="Semantic guessing game based on Reddit's r/whatisthisthing",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(puzzle.router)
app.include_router(game.router)


@app.get("/")
def root():
    """API root endpoint."""
    return {
        "message": "What Is It? Game API",
        "version": "1.0.0",
        "endpoints": {
            "docs": "/docs",
            "random_puzzle": "/api/puzzle/random",
            "start_game": "/api/game/start",
            "make_guess": "/api/game/guess",
            "get_hint": "/api/game/hint"
        }
    }


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
