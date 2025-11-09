/**
 * API Route: GET /api/admin/init-db
 * Initialize database schema (creates tables)
 * Works with Neon Postgres (Vercel's Postgres via Prisma)
 */

import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET() {
  const connectionString = process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;

  if (!connectionString) {
    return NextResponse.json({
      success: false,
      error: 'Missing database connection string',
      details: 'Please connect a Neon Postgres database in Vercel Storage settings.'
    }, { status: 500 });
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔧 Initializing database schema...');

    // Create puzzles table
    await pool.query(`
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
    `);

    // Create game_sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_sessions (
        id SERIAL PRIMARY KEY,
        puzzle_id INTEGER REFERENCES puzzles(id),
        guesses JSONB DEFAULT '[]',
        hints_used INTEGER DEFAULT 0,
        won BOOLEAN DEFAULT false,
        started_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP
      );
    `);

    // Create indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_puzzles_active ON puzzles(is_active);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_puzzles_reddit_id ON puzzles(reddit_post_id);`);

    // Check puzzle count
    const result = await pool.query(`SELECT COUNT(*) as count FROM puzzles;`);
    const count = parseInt(result.rows[0].count);

    await pool.end();

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully!',
      puzzle_count: count,
      tables_created: ['puzzles', 'game_sessions'],
      next_step: count === 0
        ? 'Database is empty. Click "Add Puzzles" button to populate.'
        : `Database has ${count} puzzles already.`
    });

  } catch (error: any) {
    console.error('Error initializing database:', error);
    await pool.end();
    return NextResponse.json({
      success: false,
      error: error.message,
      details: 'Failed to initialize database. Check Vercel logs for details.'
    }, { status: 500 });
  }
}
