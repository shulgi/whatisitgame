# Quick Start Guide

Get the game running in 5 minutes!

## 1. Install Ollama

```bash
# macOS/Linux
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull llama3.2
```

## 2. Setup Backend

```bash
cd server
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## 3. Setup Frontend

```bash
cd client
npm install
```

## 4. Get Puzzle Data (Important!)

```bash
cd server
source venv/bin/activate
python ../scripts/curate_posts.py --test
```

This takes ~2 minutes and processes 5 puzzles.

## 5. Run the Game

**Terminal 1 - Backend:**
```bash
cd server
source venv/bin/activate
python main.py
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

## 6. Play!

Open: http://localhost:5173

## Tips

- First run downloads embedding model (~80MB)
- Need more puzzles? Run: `python scripts/curate_posts.py --limit 50`
- Change models in `server/config.py`
- Check API docs at: http://localhost:8000/docs
