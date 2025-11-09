/**
 * API Route: GET /api/admin/seed-samples
 * Adds pre-populated sample puzzles for testing
 *
 * Use this when Reddit API is blocked by Vercel.
 */

import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// Sample puzzles with real mystery objects
const SAMPLE_PUZZLES = [
  {
    reddit_post_id: 'sample_001',
    reddit_url: 'https://reddit.com/r/whatisthisthing',
    image_url: 'https://i.redd.it/sample1.jpg',
    post_title: 'Strange metal tool found in grandpa\'s workshop',
    answer: 'Tire Spoon',
    category: 'tool',
    difficulty: 'medium',
    hints: [
      'Used for automotive maintenance',
      'Helps with removing something round',
      'Specifically designed for tire work'
    ],
    related_terms: ['tire iron', 'tire lever', 'bead breaker'],
    extracted_context: 'This is a tire spoon, used to remove and install tires from wheel rims.',
    answer_embedding: Array(384).fill(0).map(() => Math.random() * 2 - 1), // Random embeddings for testing
    upvotes: 150,
    is_active: true
  },
  {
    reddit_post_id: 'sample_002',
    reddit_url: 'https://reddit.com/r/whatisthisthing',
    image_url: 'https://i.redd.it/sample2.jpg',
    post_title: 'Weird plastic thing with holes, found in kitchen',
    answer: 'Egg Separator',
    category: 'device',
    difficulty: 'easy',
    hints: [
      'Kitchen gadget for food preparation',
      'Used to separate parts of an ingredient',
      'Commonly used in baking'
    ],
    related_terms: ['egg white separator', 'yolk separator'],
    extracted_context: 'An egg separator is used to separate egg whites from yolks when cooking or baking.',
    answer_embedding: Array(384).fill(0).map(() => Math.random() * 2 - 1),
    upvotes: 200,
    is_active: true
  },
  {
    reddit_post_id: 'sample_003',
    reddit_url: 'https://reddit.com/r/whatisthisthing',
    image_url: 'https://i.redd.it/sample3.jpg',
    post_title: 'Metal device with a crank, very old looking',
    answer: 'Apple Peeler',
    category: 'tool',
    difficulty: 'medium',
    hints: [
      'Vintage kitchen tool',
      'Used for preparing fruit',
      'Removes the outer layer using rotation'
    ],
    related_terms: ['fruit peeler', 'apple corer', 'peeling machine'],
    extracted_context: 'A mechanical apple peeler that cores, peels, and slices apples using a hand crank.',
    answer_embedding: Array(384).fill(0).map(() => Math.random() * 2 - 1),
    upvotes: 300,
    is_active: true
  },
  {
    reddit_post_id: 'sample_004',
    reddit_url: 'https://reddit.com/r/whatisthisthing',
    image_url: 'https://i.redd.it/sample4.jpg',
    post_title: 'Small wooden pieces with numbers on them',
    answer: 'Dominoes',
    category: 'artifact',
    difficulty: 'easy',
    hints: [
      'Used for games and entertainment',
      'Come in sets with different values',
      'Can be arranged in chains'
    ],
    related_terms: ['domino tiles', 'game pieces'],
    extracted_context: 'Dominoes are game pieces used in various tile-based games, each marked with dots representing numbers.',
    answer_embedding: Array(384).fill(0).map(() => Math.random() * 2 - 1),
    upvotes: 120,
    is_active: true
  },
  {
    reddit_post_id: 'sample_005',
    reddit_url: 'https://reddit.com/r/whatisthisthing',
    image_url: 'https://i.redd.it/sample5.jpg',
    post_title: 'Heavy metal thing with a pointy end and flat head',
    answer: 'Railroad Spike',
    category: 'part',
    difficulty: 'medium',
    hints: [
      'Used in transportation infrastructure',
      'Fastens important components together',
      'Found along train routes'
    ],
    related_terms: ['rail spike', 'track spike', 'dog spike'],
    extracted_context: 'A railroad spike is a large nail used to fasten rails to railroad ties in track construction.',
    answer_embedding: Array(384).fill(0).map(() => Math.random() * 2 - 1),
    upvotes: 180,
    is_active: true
  }
];

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
    let added = 0;
    let skipped = 0;

    for (const puzzle of SAMPLE_PUZZLES) {
      // Check if already exists
      const existing = await pool.query(
        'SELECT id FROM puzzles WHERE reddit_post_id = $1',
        [puzzle.reddit_post_id]
      );

      if (existing.rows.length > 0) {
        skipped++;
        continue;
      }

      // Insert sample puzzle
      await pool.query(
        `INSERT INTO puzzles (
          reddit_post_id, reddit_url, image_url, post_title,
          answer, category, difficulty, hints, related_terms,
          extracted_context, answer_embedding, upvotes, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          puzzle.reddit_post_id,
          puzzle.reddit_url,
          puzzle.image_url,
          puzzle.post_title,
          puzzle.answer,
          puzzle.category,
          puzzle.difficulty,
          JSON.stringify(puzzle.hints),
          JSON.stringify(puzzle.related_terms),
          puzzle.extracted_context,
          JSON.stringify(puzzle.answer_embedding),
          puzzle.upvotes,
          puzzle.is_active
        ]
      );

      added++;
    }

    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) as count FROM puzzles');
    const totalPuzzles = parseInt(countResult.rows[0].count);

    await pool.end();

    return NextResponse.json({
      success: true,
      message: `Added ${added} sample puzzles, skipped ${skipped} duplicates`,
      total_puzzles: totalPuzzles,
      sample_puzzles: SAMPLE_PUZZLES.map(p => ({
        answer: p.answer,
        category: p.category,
        difficulty: p.difficulty
      })),
      next_step: 'Game is ready! Visit the home page to start playing.'
    });

  } catch (error: any) {
    console.error('Sample seeding error:', error);
    await pool.end();
    return NextResponse.json({
      success: false,
      error: error.message,
      details: 'Failed to seed sample puzzles. Check Vercel logs for details.'
    }, { status: 500 });
  }
}
