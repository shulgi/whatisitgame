# What Is It? - Semantic Guessing Game

A web-based guessing game inspired by NYT Games (like Wordle and Connections) that uses posts from Reddit's r/whatisthisthing. Players guess mystery objects and receive semantic similarity feedback.

**✨ Optimized for Vercel deployment with free-tier database and AI services!**

## Game Concept

- **Unlimited play** - Random puzzles from curated database
- **8 guesses maximum** to identify the mystery object
- **Semantic feedback** shows how close your guess is (🧊 Ice Cold → 🔥🔥🔥 Very Hot)
- **Progressive hints** unlock as you make more guesses
- **100% free** - Uses Hugging Face free API + Vercel free tier

## Tech Stack

### Frontend & Backend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Vercel** - Serverless deployment (free tier)
- **Vercel Postgres** - Managed PostgreSQL database (free tier)

### AI & Embeddings
- **Hugging Face Inference API** - Free semantic embeddings for guesses
- **Ollama** (local only) - Free LLM for data curation
- **Sentence Transformers** - Pre-compute embeddings during curation

### Key Architecture Decision

🎯 **Heavy processing happens locally, gameplay is lightweight:**

1. **Local Curation** (one-time): Use Ollama + HF API to process Reddit posts
2. **Store in Database**: All processed data with embeddings
3. **Deploy to Vercel**: Just serve puzzles and calculate similarity (no models needed!)

This keeps the game **free and fast** with no ongoing API costs during gameplay.

## Project Structure

```
whatisitgame/
├── app/                    # Next.js app directory
│   ├── api/               # API routes (serverless functions)
│   │   ├── puzzle/        # Puzzle endpoints
│   │   └── game/          # Game logic endpoints
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Main game page
│   └── globals.css        # Styles
├── lib/                   # Utilities
│   ├── db.ts             # Database operations
│   ├── similarity.ts     # Similarity calculations
│   └── embeddings.ts     # HuggingFace API client
├── scripts-node/         # Local curation scripts
│   └── curate.js         # Data curation script
├── next.config.js        # Next.js configuration
├── vercel.json           # Vercel deployment config
└── package.json
```

## Setup & Deployment

### Option A: Deploy to Vercel (Recommended)

#### 1. Fork this repository

#### 2. Create Vercel account and import project
- Go to [vercel.com](https://vercel.com)
- Import your forked repository
- Vercel will auto-detect Next.js

#### 3. Add Vercel Postgres database
```bash
# In Vercel dashboard:
# Storage > Create Database > Postgres > Continue
```

Vercel will automatically set these environment variables:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

#### 4. Initialize database
```bash
# Install Vercel CLI
npm i -g vercel

# Pull environment variables
vercel env pull .env.local

# Run database initialization (one-time)
# Create a script or run SQL manually in Vercel dashboard
```

#### 5. Curate puzzle data (locally)
```bash
# Install dependencies
npm install

# Install Ollama locally
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2

# Optional: Get HuggingFace API key for higher rate limits
# https://huggingface.co/settings/tokens
# Add to .env.local: HUGGINGFACE_API_KEY=hf_...

# Run curation script (processes 10 puzzles)
npm run curate -- --limit=10
```

#### 6. Deploy!
```bash
# Commit and push - Vercel auto-deploys
git add .
git commit -m "Add puzzle data"
git push
```

Your game is now live! 🎉

### Option B: Run Locally

```bash
# 1. Clone repository
git clone <your-repo>
cd whatisitgame

# 2. Install dependencies
npm install

# 3. Setup local Postgres or use Vercel Postgres locally
# Option: Use Vercel Postgres with local dev
vercel env pull .env.local

# 4. Install Ollama
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2

# 5. Curate data
npm run curate -- --limit=10

# 6. Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Configuration

### Environment Variables

```bash
# Vercel Postgres (auto-set by Vercel)
POSTGRES_URL=

# Optional: HuggingFace API key for higher rate limits
HUGGINGFACE_API_KEY=

# Local curation only
LLM_MODEL=llama3.2  # or mistral, phi, etc.
```

### Game Settings

Edit in `lib/similarity.ts`:

```typescript
export const GAME_CONFIG = {
  MAX_GUESSES: 8,
  SIMILARITY_THRESHOLD_WIN: 0.90,
  HINT_UNLOCK_GUESSES: [3, 5, 7],
};
```

## How It Works

### 1. Data Curation (Local, One-Time)
```
Reddit API → Fetch Solved Posts
    ↓
Ollama LLM → Extract Answer & Hints
    ↓
HuggingFace API → Generate Embeddings
    ↓
Vercel Postgres → Store Everything
```

### 2. Gameplay (Vercel Serverless)
```
User Makes Guess
    ↓
HuggingFace API → Get Guess Embedding (free tier)
    ↓
Cosine Similarity → Compare to Answer Embedding
    ↓
Return Temperature + Percentage
```

**No models loaded on Vercel!** Just math and API calls. Super fast and free.

## API Endpoints

- `GET /api/puzzle/random` - Get random puzzle
- `POST /api/game/start` - Start game session
- `POST /api/game/guess` - Submit guess, get similarity
- `POST /api/game/hint` - Request hint
- `POST /api/game/give-up/:id` - Give up, reveal answer

## Curation Script

Process Reddit posts locally before deployment:

```bash
# Basic usage
npm run curate -- --limit=10

# Process more puzzles
npm run curate -- --limit=50

# The script will:
# 1. Fetch solved posts from r/whatisthisthing
# 2. Extract answers using Ollama
# 3. Generate embeddings with HuggingFace
# 4. Store in Vercel Postgres
```

**Note**: Curation happens locally. Only the final database is deployed to Vercel.

## Cost Breakdown

- **Vercel Hosting**: Free tier (sufficient for most use cases)
- **Vercel Postgres**: Free tier (60 hours compute/month)
- **HuggingFace API**: Free tier (rate-limited but generous)
- **Ollama**: Free (runs locally)

**Total cost: $0/month** for moderate usage! 🎉

## Development Tips

### Switching LLM Models

Edit `.env.local`:
```bash
LLM_MODEL=mistral  # or llama3.1, phi, etc.
```

Re-run curation to use new model.

### Database Queries

```bash
# Connect to Vercel Postgres
vercel postgres connect

# Check puzzle count
SELECT COUNT(*) FROM puzzles;

# View recent puzzles
SELECT answer, category FROM puzzles ORDER BY created_at DESC LIMIT 10;
```

### Testing Locally

```bash
# Run Next.js dev server
npm run dev

# In another terminal, tail logs
vercel logs --follow
```

## Troubleshooting

**"No puzzles available"**
- Run curation script: `npm run curate -- --limit=10`
- Check database: `vercel postgres connect`

**"HuggingFace API error"**
- Free tier is rate-limited
- Get API key at https://huggingface.co/settings/tokens
- Add to environment: `HUGGINGFACE_API_KEY=hf_...`

**"Ollama connection error" (during curation)**
- Make sure Ollama is running: `ollama serve`
- Pull model: `ollama pull llama3.2`

## Deployment Checklist

- [ ] Fork repository
- [ ] Import to Vercel
- [ ] Add Vercel Postgres database
- [ ] Run curation script locally
- [ ] Commit and push puzzle data
- [ ] Verify deployment works
- [ ] (Optional) Add HuggingFace API key for better rate limits

## Future Enhancements

- [ ] Daily puzzle mode (one puzzle per day)
- [ ] User accounts and statistics
- [ ] Leaderboards
- [ ] Share results (emoji grid like Wordle)
- [ ] Category filters
- [ ] Difficulty levels
- [ ] Admin panel for managing puzzles

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test locally
5. Submit pull request

## License

MIT

## Credits

- Data from [r/whatisthisthing](https://reddit.com/r/whatisthisthing)
- Built with [Next.js](https://nextjs.org), [Vercel](https://vercel.com), and [Hugging Face](https://huggingface.co)
- Inspired by NYT Games

---

**Made with ❤️ for the guessing game enthusiasts**

Deploy your own for free on Vercel → [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/whatisitgame)
