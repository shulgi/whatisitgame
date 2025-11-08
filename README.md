# What Is It? - Semantic Guessing Game

A web-based guessing game inspired by NYT Games (like Wordle and Connections) that uses posts from Reddit's r/whatisthisthing. Players guess mystery objects and receive semantic similarity feedback powered by local language models.

## Game Concept

- **One puzzle at a time** (unlimited play mode)
- **8 guesses maximum** to identify the mystery object
- **Semantic feedback** shows how close your guess is (🧊 Ice Cold → 🔥🔥🔥 Very Hot)
- **Progressive hints** unlock as you make more guesses
- **No API costs** - uses free, local models (Ollama + Sentence Transformers)

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - Database ORM
- **Ollama** - Local LLM for answer extraction (modular, easy to swap)
- **Sentence Transformers** - Free semantic embeddings for similarity
- **SQLite** - Lightweight database

### Frontend
- **React** - UI framework
- **Vite** - Fast build tool
- **Vanilla CSS** - Custom styling

## Project Structure

```
whatisitgame/
├── server/              # Python FastAPI backend
│   ├── main.py         # FastAPI app
│   ├── config.py       # Configuration (easy model swapping)
│   ├── database.py     # Database setup
│   ├── models/         # SQLAlchemy models
│   ├── services/       # Modular services
│   │   ├── llm_service.py        # LLM abstraction
│   │   ├── embedding_service.py  # Embedding abstraction
│   │   ├── reddit_service.py     # Reddit scraper
│   │   └── game_service.py       # Game logic
│   └── routers/        # API routes
├── client/             # React frontend
│   ├── src/
│   │   ├── components/ # UI components
│   │   ├── hooks/      # Custom hooks
│   │   ├── services/   # API client
│   │   └── App.jsx     # Main app
│   └── package.json
├── scripts/            # Utility scripts
│   └── curate_posts.py # Data curation script
└── README.md
```

## Setup Instructions

### Prerequisites

1. **Python 3.9+**
2. **Node.js 18+**
3. **Ollama** (for local LLM)

### 1. Install Ollama

```bash
# macOS/Linux
curl -fsSL https://ollama.com/install.sh | sh

# Or download from https://ollama.com/download
```

Pull a model:
```bash
ollama pull llama3.2
# Or use: mistral, phi, etc.
```

### 2. Backend Setup

```bash
cd server

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# The first run will download the embedding model (~80MB)
# This is done automatically when you start the server
```

### 3. Frontend Setup

```bash
cd client

# Install dependencies
npm install
```

### 4. Curate Puzzle Data

Before playing, you need to populate the database with puzzles from Reddit:

```bash
cd server
source venv/bin/activate  # If not already activated

# Test mode - process 5 posts
python ../scripts/curate_posts.py --test

# Full run - process 50 posts (takes 5-10 minutes)
python ../scripts/curate_posts.py --limit 50
```

This script will:
1. Fetch solved posts from r/whatisthisthing
2. Use Ollama to extract answers from comments
3. Generate embeddings using Sentence Transformers
4. Save everything to the database

**Note**: The first run downloads the embedding model (~80MB). Subsequent runs use the cached model.

## Running the Application

### Start Backend (Terminal 1)

```bash
cd server
source venv/bin/activate
python main.py
```

Server runs at: `http://localhost:8000`
API docs at: `http://localhost:8000/docs`

### Start Frontend (Terminal 2)

```bash
cd client
npm run dev
```

Frontend runs at: `http://localhost:5173`

## Configuration

All settings are in `server/config.py` and can be overridden with environment variables:

### LLM Configuration (Easy to Swap!)

```python
# In config.py or .env file
LLM_PROVIDER = "ollama"       # Currently only ollama, easy to add more
LLM_MODEL = "llama3.2"        # Change to: mistral, phi, etc.
LLM_BASE_URL = "http://localhost:11434"
LLM_TEMPERATURE = 0.3         # Lower = more consistent
```

### Embedding Configuration

```python
EMBEDDING_PROVIDER = "sentence-transformers"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"  # Fast, good quality
# Alternative: "all-mpnet-base-v2"    # Better quality, slower
```

### Game Settings

```python
MAX_GUESSES = 8
SIMILARITY_THRESHOLD_WIN = 0.90  # 90% similarity to win
HINT_UNLOCK_GUESSES = [3, 5, 7]  # Unlock hints at these guess counts
```

## How It Works

### 1. Data Curation
- Scrapes r/whatisthisthing for "Solved" posts
- Uses Ollama LLM to extract answer from comment threads
- Generates semantic embeddings for answers
- Stores everything in SQLite database (no reprocessing needed!)

### 2. Game Flow
- Player sees mystery image
- Makes guesses → Backend calculates semantic similarity
- Receives temperature feedback (🧊 → 🔥🔥🔥)
- Can request hints after 3+ guesses
- Wins if similarity ≥ 90% or exact match

### 3. Semantic Similarity
- Both guess and answer are converted to embeddings
- Cosine similarity calculated (0-100%)
- Temperature labels based on percentage ranges

## API Endpoints

### Puzzle Routes
- `GET /api/puzzle/random` - Get random puzzle
- `GET /api/puzzle/{id}` - Get specific puzzle
- `GET /api/puzzle/stats/count` - Get total puzzle count

### Game Routes
- `POST /api/game/start` - Start new game session
- `POST /api/game/guess` - Submit a guess
- `POST /api/game/hint` - Request a hint
- `POST /api/game/give-up/{session_id}` - Give up and reveal answer
- `GET /api/game/session/{session_id}` - Get session stats

## Development Tips

### Changing LLM Models

Easy! Just edit `server/config.py`:

```python
LLM_MODEL = "mistral"  # or "phi", "llama3.1", etc.
```

Then re-run the curation script to process posts with the new model.

### Changing Embedding Models

```python
EMBEDDING_MODEL = "all-mpnet-base-v2"  # Better quality
```

Note: You'll need to regenerate embeddings for existing puzzles.

### Adding New LLM Providers

The LLM service is modular! To add OpenAI, Anthropic, etc.:

1. Create new provider class in `server/services/llm_service.py`
2. Implement `generate()` and `extract_json()` methods
3. Update `_get_provider()` to recognize new provider

### Database Management

```bash
# View database
sqlite3 server/whatisit.db

# Check puzzle count
sqlite3 server/whatisit.db "SELECT COUNT(*) FROM puzzles;"

# Reset database (delete all data)
rm server/whatisit.db
```

## Troubleshooting

### "No puzzles available"
Run the curation script to populate the database:
```bash
python scripts/curate_posts.py --test
```

### "Ollama connection error"
Make sure Ollama is running:
```bash
ollama serve
```

### Embedding model download slow
First run downloads ~80MB model. This is normal and only happens once.

### CORS errors
Make sure both frontend (5173) and backend (8000) are running.

## Future Enhancements

- [ ] Daily puzzle mode (one puzzle per day, like Wordle)
- [ ] Difficulty levels (easy/medium/hard)
- [ ] User accounts and statistics
- [ ] Leaderboards
- [ ] Share results (emoji grid like Wordle)
- [ ] Category filters
- [ ] Multiple LLM provider support (OpenAI, Anthropic, etc.)

## License

MIT

## Credits

- Data from [r/whatisthisthing](https://reddit.com/r/whatisthisthing)
- Built with [Ollama](https://ollama.com) and [Sentence Transformers](https://www.sbert.net/)
