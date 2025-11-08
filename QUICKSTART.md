# Quick Start Guide - Cloud LLM Edition

Get the game running in 5 minutes with **NO LOCAL INSTALLATIONS** required! 🚀

## Prerequisites

✅ Node.js 18+ installed
✅ That's it! No Ollama, no Python, nothing else needed!

## Setup Steps

### 1. Get Free API Keys (2 minutes)

Choose **ONE** of these free cloud LLM providers:

#### Option A: Groq (RECOMMENDED ⭐)
- **Fastest** and best quality
- Go to: https://console.groq.com/keys
- Sign up (free)
- Create API key
- Free tier: **14,400 requests/day**

#### Option B: Hugging Face
- Good alternative
- Go to: https://huggingface.co/settings/tokens
- Sign up (free)
- Create "Read" token
- Free tier: Rate-limited but generous

### 2. Clone & Install

```bash
git clone <your-repo>
cd whatisitgame
npm install
```

### 3. Configure Environment

```bash
# Copy example environment file
cp .env.example .env.local

# Edit .env.local and add your API key:
# Either GROQ_API_KEY or HUGGINGFACE_API_KEY
```

Example `.env.local`:
```bash
# Groq (recommended)
GROQ_API_KEY=gsk_xxxxxxxxxxxxx

# OR HuggingFace
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxx

# Vercel Postgres (get these from Vercel dashboard)
POSTGRES_URL=postgres://...
```

### 4. Setup Vercel Database

```bash
# Install Vercel CLI
npm i -g vercel

# Link to your Vercel project (or create new)
vercel link

# Pull database credentials
vercel env pull .env.local
```

Or manually create Vercel Postgres:
1. Go to https://vercel.com/dashboard
2. Create new project
3. Storage → Create Database → Postgres
4. Copy credentials to `.env.local`

### 5. Curate Puzzle Data

```bash
# Process 10 puzzles (takes ~3-5 minutes)
npm run curate -- --limit=10

# Or specify provider explicitly:
npm run curate -- --limit=10 --provider=groq
npm run curate -- --limit=10 --provider=huggingface
```

The script will:
- ✅ Fetch Reddit posts
- ✅ Extract answers using cloud LLM (Groq/HF)
- ✅ Generate embeddings
- ✅ Save to Vercel Postgres

### 6. Run Locally

```bash
npm run dev
```

Open: http://localhost:3000

### 7. Deploy to Vercel

```bash
# Commit your changes
git add .
git commit -m "Add puzzle data"
git push

# Deploy (if linked to Vercel, auto-deploys on push)
# Or manually:
vercel --prod
```

Done! Your game is live! 🎉

## Comparison: Cloud LLM vs Local Ollama

| Feature | Cloud LLM (Groq/HF) | Local Ollama |
|---------|---------------------|--------------|
| Installation | ✅ None | ❌ ~4GB download |
| Speed | ✅ Very fast | ⚠️ Depends on hardware |
| Cost | ✅ Free | ✅ Free |
| Internet needed | ✅ Yes | ❌ No |
| Works on any machine | ✅ Yes | ⚠️ Needs decent specs |
| Rate limits | ⚠️ Daily limits | ✅ Unlimited |

**Recommendation**: Use **Groq** for cloud-based curation. It's faster and easier!

## Tips

### Want More Puzzles?

```bash
npm run curate -- --limit=50
```

### Using Local Ollama Instead?

If you prefer local LLM:

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2

# Run curation (auto-detects Ollama if no cloud keys)
npm run curate -- --limit=10 --provider=ollama
```

### Check Your Database

```bash
vercel postgres connect
# Then run SQL:
SELECT COUNT(*) FROM puzzles;
```

## Troubleshooting

**"No cloud LLM API keys found"**
- Add `GROQ_API_KEY` or `HUGGINGFACE_API_KEY` to `.env.local`

**"POSTGRES_URL not found"**
- Run `vercel env pull .env.local` to get database credentials
- Or manually add from Vercel dashboard

**"Rate limit exceeded"**
- Groq: 14,400 requests/day (plenty for normal use)
- HuggingFace: Retry after a few minutes
- Or switch to the other provider

**"Model is loading" (HuggingFace)**
- First request might take 20-30 seconds while model loads
- Subsequent requests are fast

## Next Steps

- Play the game locally: http://localhost:3000
- Deploy to Vercel: `vercel --prod`
- Add more puzzles: `npm run curate -- --limit=100`
- Share your game with friends!

---

**Questions?** Check the main [README.md](README.md) for detailed documentation.
