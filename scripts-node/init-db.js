/**
 * Initialize database schema
 * Run this once to create tables in your Vercel Postgres database
 *
 * Usage: node scripts-node/init-db.js
 */

require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function initDatabase() {
  console.log('🔧 Initializing database schema...\n');

  try {
    // Create puzzles table
    console.log('Creating puzzles table...');
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
    console.log('✅ Puzzles table created');

    // Create game_sessions table
    console.log('Creating game_sessions table...');
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
    console.log('✅ Game sessions table created');

    // Create indexes
    console.log('Creating indexes...');
    await sql`CREATE INDEX IF NOT EXISTS idx_puzzles_active ON puzzles(is_active);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_puzzles_reddit_id ON puzzles(reddit_post_id);`;
    console.log('✅ Indexes created');

    // Check if any puzzles exist
    const result = await sql`SELECT COUNT(*) as count FROM puzzles;`;
    const count = parseInt(result.rows[0].count);

    console.log('\n✨ Database initialized successfully!');
    console.log(`📊 Current puzzle count: ${count}`);

    if (count === 0) {
      console.log('\n⚠️  No puzzles in database yet.');
      console.log('   Run: npm run curate -- --limit=10');
    }

  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
}

initDatabase().then(() => {
  console.log('\n✅ Done!');
  process.exit(0);
});
