/**
 * Database library using Neon Postgres (Vercel's Postgres via Prisma)
 *
 * Handles all database operations for the game.
 * Embeddings are stored as JSON arrays for simplicity.
 */

import { Pool } from '@vercel/postgres';

// Singleton pool for connection reuse
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.POSTGRES_PRISMA_URL });
  }
  return pool;
}

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
 * Get a random active puzzle
 */
export async function getRandomPuzzle(difficulty?: string): Promise<Puzzle | null> {
  const db = getPool();
  const result = difficulty
    ? await db.query('SELECT * FROM puzzles WHERE is_active = true AND difficulty = $1 ORDER BY RANDOM() LIMIT 1', [difficulty])
    : await db.query('SELECT * FROM puzzles WHERE is_active = true ORDER BY RANDOM() LIMIT 1');

  return result.rows[0] || null;
}

/**
 * Get puzzle by ID
 */
export async function getPuzzleById(id: number): Promise<Puzzle | null> {
  const db = getPool();
  const result = await db.query('SELECT * FROM puzzles WHERE id = $1', [id]);
  return result.rows[0] || null;
}

/**
 * Create a new game session
 */
export async function createGameSession(puzzleId: number): Promise<GameSession> {
  const db = getPool();
  const result = await db.query(
    'INSERT INTO game_sessions (puzzle_id) VALUES ($1) RETURNING *',
    [puzzleId]
  );
  return result.rows[0];
}

/**
 * Get game session by ID
 */
export async function getGameSession(sessionId: number): Promise<GameSession | null> {
  const db = getPool();
  const result = await db.query('SELECT * FROM game_sessions WHERE id = $1', [sessionId]);
  return result.rows[0] || null;
}

/**
 * Add guess to session
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
  const db = getPool();
  await db.query(
    'UPDATE game_sessions SET guesses = guesses || $1::jsonb WHERE id = $2',
    [JSON.stringify([guess]), sessionId]
  );
}

/**
 * Mark session as won
 */
export async function markSessionWon(sessionId: number): Promise<void> {
  const db = getPool();
  await db.query(
    'UPDATE game_sessions SET won = true, completed_at = NOW() WHERE id = $1',
    [sessionId]
  );
}

/**
 * Update hints used
 */
export async function updateHintsUsed(sessionId: number, hintsUsed: number): Promise<void> {
  const db = getPool();
  await db.query(
    'UPDATE game_sessions SET hints_used = $1 WHERE id = $2',
    [hintsUsed, sessionId]
  );
}

/**
 * Get total puzzle count
 */
export async function getPuzzleCount(): Promise<number> {
  const db = getPool();
  const result = await db.query('SELECT COUNT(*) as count FROM puzzles WHERE is_active = true');
  return parseInt(result.rows[0].count);
}
