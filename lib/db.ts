/**
 * Database library using Vercel Postgres
 *
 * Handles all database operations for the game.
 * Embeddings are stored as JSON arrays for simplicity.
 */

import { sql } from '@vercel/postgres';

export interface Puzzle {
  id: number;
  reddit_post_id: string;
  reddit_url: string;
  image_url: string;
  post_title: string | null;
  answer: string;
  category: string | null;
  difficulty: string;
  hints: string[] | null;
  related_terms: string[] | null;
  extracted_context: string | null;
  answer_embedding: number[];
  upvotes: number;
  is_active: boolean;
  created_at: Date;
}

export interface GameSession {
  id: number;
  puzzle_id: number;
  guesses: Array<{
    guess: string;
    similarity: number;
    temperature: string;
    is_correct: boolean;
  }>;
  hints_used: number;
  won: boolean;
  started_at: Date;
  completed_at: Date | null;
}

/**
 * Initialize database tables
 * Run this once to set up the schema
 */
export async function initDb() {
  // Create puzzles table
  await sql`
    CREATE TABLE IF NOT EXISTS puzzles (
      id SERIAL PRIMARY KEY,
      reddit_post_id TEXT UNIQUE NOT NULL,
      reddit_url TEXT NOT NULL,
      image_url TEXT NOT NULL,
      post_title TEXT,
      answer TEXT NOT NULL,
      category TEXT,
      difficulty TEXT DEFAULT 'medium',
      hints JSONB,
      related_terms JSONB,
      extracted_context TEXT,
      answer_embedding JSONB NOT NULL,
      upvotes INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  // Create game_sessions table
  await sql`
    CREATE TABLE IF NOT EXISTS game_sessions (
      id SERIAL PRIMARY KEY,
      puzzle_id INTEGER REFERENCES puzzles(id),
      guesses JSONB DEFAULT '[]',
      hints_used INTEGER DEFAULT 0,
      won BOOLEAN DEFAULT false,
      started_at TIMESTAMP DEFAULT NOW(),
      completed_at TIMESTAMP
    );
  `;

  // Create indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_puzzles_active ON puzzles(is_active);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_puzzles_reddit_id ON puzzles(reddit_post_id);`;

  console.log('Database initialized successfully');
}

/**
 * Get a random active puzzle
 */
export async function getRandomPuzzle(difficulty?: string): Promise<Puzzle | null> {
  const query = difficulty
    ? sql<Puzzle>`
        SELECT * FROM puzzles
        WHERE is_active = true AND difficulty = ${difficulty}
        ORDER BY RANDOM()
        LIMIT 1
      `
    : sql<Puzzle>`
        SELECT * FROM puzzles
        WHERE is_active = true
        ORDER BY RANDOM()
        LIMIT 1
      `;

  const result = await query;
  return result.rows[0] || null;
}

/**
 * Get puzzle by ID
 */
export async function getPuzzleById(id: number): Promise<Puzzle | null> {
  const result = await sql<Puzzle>`
    SELECT * FROM puzzles WHERE id = ${id}
  `;
  return result.rows[0] || null;
}

/**
 * Create a new game session
 */
export async function createGameSession(puzzleId: number): Promise<GameSession> {
  const result = await sql<GameSession>`
    INSERT INTO game_sessions (puzzle_id)
    VALUES (${puzzleId})
    RETURNING *
  `;
  return result.rows[0];
}

/**
 * Get game session by ID
 */
export async function getGameSession(sessionId: number): Promise<GameSession | null> {
  const result = await sql<GameSession>`
    SELECT * FROM game_sessions WHERE id = ${sessionId}
  `;
  return result.rows[0] || null;
}

/**
 * Update game session with new guess
 */
export async function addGuessToSession(
  sessionId: number,
  guess: {
    guess: string;
    similarity: number;
    temperature: string;
    is_correct: boolean;
  }
): Promise<void> {
  await sql`
    UPDATE game_sessions
    SET guesses = guesses || ${JSON.stringify([guess])}::jsonb
    WHERE id = ${sessionId}
  `;
}

/**
 * Mark session as won
 */
export async function markSessionWon(sessionId: number): Promise<void> {
  await sql`
    UPDATE game_sessions
    SET won = true, completed_at = NOW()
    WHERE id = ${sessionId}
  `;
}

/**
 * Update hints used
 */
export async function updateHintsUsed(sessionId: number, hintsUsed: number): Promise<void> {
  await sql`
    UPDATE game_sessions
    SET hints_used = ${hintsUsed}
    WHERE id = ${sessionId}
  `;
}

/**
 * Get total puzzle count
 */
export async function getPuzzleCount(): Promise<number> {
  const result = await sql`
    SELECT COUNT(*) as count FROM puzzles WHERE is_active = true
  `;
  return parseInt(result.rows[0].count);
}

/**
 * Insert a new puzzle (used by curation script)
 */
export async function insertPuzzle(puzzle: Omit<Puzzle, 'id' | 'created_at'>): Promise<Puzzle> {
  const result = await sql<Puzzle>`
    INSERT INTO puzzles (
      reddit_post_id, reddit_url, image_url, post_title,
      answer, category, difficulty, hints, related_terms,
      extracted_context, answer_embedding, upvotes, is_active
    ) VALUES (
      ${puzzle.reddit_post_id},
      ${puzzle.reddit_url},
      ${puzzle.image_url},
      ${puzzle.post_title},
      ${puzzle.answer},
      ${puzzle.category},
      ${puzzle.difficulty},
      ${JSON.stringify(puzzle.hints)},
      ${JSON.stringify(puzzle.related_terms)},
      ${puzzle.extracted_context},
      ${JSON.stringify(puzzle.answer_embedding)},
      ${puzzle.upvotes},
      ${puzzle.is_active}
    )
    RETURNING *
  `;
  return result.rows[0];
}

/**
 * Check if puzzle exists by reddit post ID
 */
export async function puzzleExists(redditPostId: string): Promise<boolean> {
  const result = await sql`
    SELECT id FROM puzzles WHERE reddit_post_id = ${redditPostId}
  `;
  return result.rows.length > 0;
}
