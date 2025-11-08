# Development Guide

## Architecture Overview

The application is built with modularity in mind, making it easy to swap models, add features, and extend functionality.

### Backend Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     FastAPI Routes                       │
│  /api/puzzle/*  |  /api/game/*                          │
└─────────────┬───────────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────────┐
│                   Service Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Game Service │  │ LLM Service  │  │Embed Service │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │           Reddit Service                          │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────┬───────────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────────┐
│                   Database Layer                         │
│              SQLite + SQLAlchemy ORM                     │
└─────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Modular Services**: Each service is independent and can be swapped
2. **Provider Pattern**: LLM and Embedding services use provider pattern
3. **Database Caching**: All processed data saved to avoid reprocessing
4. **Separation of Concerns**: Routes, services, and models are separated

## Modular LLM Service

### How to Add a New LLM Provider

1. **Create Provider Class** in `server/services/llm_service.py`:

```python
class OpenAIProvider(LLMProvider):
    def __init__(self, model: str = None, api_key: str = None):
        self.model = model or "gpt-4"
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")

    def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        # Implement OpenAI API call
        pass

    def extract_json(self, prompt: str, system_prompt: Optional[str] = None) -> Dict:
        # Implement JSON extraction
        pass
```

2. **Update Provider Factory**:

```python
def _get_provider(self) -> LLMProvider:
    provider_name = settings.LLM_PROVIDER.lower()

    if provider_name == "ollama":
        return OllamaProvider()
    elif provider_name == "openai":
        return OpenAIProvider()
    # ... add more
```

3. **Update Configuration** in `config.py`:

```python
LLM_PROVIDER: str = "openai"  # New option
LLM_MODEL: str = "gpt-4"
OPENAI_API_KEY: Optional[str] = None
```

That's it! The rest of the code automatically uses the new provider.

## Modular Embedding Service

Same pattern as LLM service:

```python
class OpenAIEmbeddingProvider(EmbeddingProvider):
    def encode(self, text: str) -> List[float]:
        # Implement OpenAI embeddings API
        pass
```

## Data Flow

### 1. Curation Pipeline

```
Reddit API
    ↓
Fetch Solved Posts (with images)
    ↓
Extract Comments
    ↓
LLM Service → Extract Answer + Metadata
    ↓
Embedding Service → Generate Embeddings
    ↓
Database → Store Everything
```

### 2. Game Flow

```
Frontend: Request Random Puzzle
    ↓
Backend: Get Puzzle from DB (without answer)
    ↓
Frontend: Display Image
    ↓
User: Make Guess
    ↓
Backend: Calculate Similarity
    ↓
Frontend: Show Temperature + Percentage
    ↓
Repeat until Win/Lose
```

## Database Schema

### Puzzle Table

```sql
CREATE TABLE puzzles (
    id INTEGER PRIMARY KEY,
    reddit_post_id TEXT UNIQUE,
    reddit_url TEXT,
    image_url TEXT,
    post_title TEXT,

    -- Processed data
    answer TEXT NOT NULL,
    category TEXT,
    difficulty TEXT,
    hints JSON,
    related_terms JSON,
    extracted_context TEXT,
    answer_embedding JSON,

    -- Metadata
    upvotes INTEGER,
    comment_count INTEGER,
    is_active BOOLEAN,
    llm_model_used TEXT,
    embedding_model_used TEXT,

    -- Timestamps
    processed_at TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### GameSession Table

```sql
CREATE TABLE game_sessions (
    id INTEGER PRIMARY KEY,
    puzzle_id INTEGER,
    guesses JSON,
    hints_used INTEGER,
    won BOOLEAN,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);
```

## API Design

### RESTful Endpoints

- **Puzzles**: Read-only puzzle data (no answers exposed)
- **Game**: Stateful game sessions with guess processing

### Request/Response Examples

**Start Game:**
```json
POST /api/game/start
{
  "puzzle_id": 123
}
→
{
  "session_id": 456,
  "puzzle_id": 123,
  "max_guesses": 8,
  "started_at": "2024-01-01T12:00:00"
}
```

**Make Guess:**
```json
POST /api/game/guess
{
  "session_id": 456,
  "guess": "telescope"
}
→
{
  "guess": "telescope",
  "similarity": 67.3,
  "temperature": "🔥 Warm",
  "is_correct": false,
  "guess_number": 3,
  "max_guesses": 8,
  "game_over": false
}
```

## Frontend Architecture

### Component Structure

```
App.jsx (Main container)
├── ImageDisplay (Shows mystery image)
├── GuessInput (Input + submit)
├── GuessHistory (List of past guesses)
├── HintDisplay (Hint button + hints)
└── GameOverModal (Win/lose modal)
```

### State Management

Uses custom `useGameState` hook for centralized state:

```javascript
const {
  puzzle,        // Current puzzle data
  guesses,       // Array of guess history
  hints,         // Unlocked hints
  gameStatus,    // loading/playing/won/lost
  submitGuess,   // Submit guess function
  requestHint,   // Request hint function
  // ...
} = useGameState();
```

### API Service

Centralized API calls in `services/api.js`:

```javascript
export const api = {
  getRandomPuzzle(difficulty),
  startGame(puzzleId),
  makeGuess(sessionId, guess),
  getHint(sessionId),
  giveUp(sessionId),
};
```

## Testing Strategy

### Backend Testing

```bash
# Install pytest
pip install pytest pytest-asyncio

# Run tests
pytest server/tests/
```

### Frontend Testing

```bash
# Install testing libraries
npm install -D vitest @testing-library/react

# Run tests
npm test
```

## Performance Considerations

### Backend
- **Database Indexing**: reddit_post_id indexed for fast lookups
- **Embedding Caching**: Embeddings stored in DB, not recalculated
- **LLM Response Time**: ~2-5 seconds per post (acceptable for curation)

### Frontend
- **Image Loading**: Lazy loading for images
- **API Calls**: Debounced where appropriate
- **Bundle Size**: Vanilla CSS keeps bundle small

## Deployment

### Backend Deployment

```bash
# Using Uvicorn
uvicorn main:app --host 0.0.0.0 --port 8000

# Using Gunicorn (production)
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### Frontend Deployment

```bash
# Build for production
npm run build

# Serve with any static server
npx serve dist
```

### Docker (Future)

```dockerfile
# Backend
FROM python:3.11
COPY server/ /app
RUN pip install -r requirements.txt
CMD ["uvicorn", "main:app", "--host", "0.0.0.0"]

# Frontend
FROM node:18
COPY client/ /app
RUN npm install && npm run build
CMD ["npx", "serve", "dist"]
```

## Environment Variables

All configuration through `server/config.py`:

```python
class Settings(BaseSettings):
    # Easy to add new settings
    # Automatically loads from .env
    # Type validation with Pydantic

    class Config:
        env_file = ".env"
```

## Extending the Game

### Adding New Features

1. **Add Daily Puzzle Mode**:
   - Create new route: `/api/puzzle/daily`
   - Store daily puzzle in cache
   - Update frontend to show date

2. **Add User Accounts**:
   - Add User model
   - Add authentication middleware
   - Link GameSession to User

3. **Add Categories**:
   - Filter puzzles by category
   - Update UI with category selector

### Model Experimentation

Easy to try different models:

```bash
# Try different LLMs
ollama pull mistral
# Edit config.py: LLM_MODEL = "mistral"

# Try different embeddings
# Edit config.py: EMBEDDING_MODEL = "all-mpnet-base-v2"

# Re-run curation
python scripts/curate_posts.py --limit 10
```

## Common Issues

### "Module not found" errors
```bash
# Make sure __init__.py files exist
touch server/models/__init__.py
touch server/services/__init__.py
```

### "Database locked" errors
```bash
# SQLite doesn't handle concurrent writes well
# For production, use PostgreSQL
DATABASE_URL=postgresql://user:pass@localhost/whatisit
```

### Slow embedding generation
```bash
# Use smaller model for speed
EMBEDDING_MODEL=all-MiniLM-L6-v2  # Fast
# vs
EMBEDDING_MODEL=all-mpnet-base-v2  # Slower but better
```

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## Resources

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Ollama Docs](https://ollama.com/docs)
- [Sentence Transformers](https://www.sbert.net/)
- [React Hooks](https://react.dev/reference/react)
