/**
 * API Route: POST /api/game/give-up/[sessionId]
 * Give up and reveal the answer
 */

import { NextResponse } from 'next/server';
import { getGameSession, getPuzzleById } from '@/lib/db';
import { sql } from '@vercel/postgres';

export async function POST(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = parseInt(params.sessionId);

    if (isNaN(sessionId)) {
      return NextResponse.json(
        { error: 'Invalid session ID' },
        { status: 400 }
      );
    }

    // Get session
    const session = await getGameSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Game session not found' },
        { status: 404 }
      );
    }

    // Get puzzle
    const puzzle = await getPuzzleById(session.puzzle_id);
    if (!puzzle) {
      return NextResponse.json(
        { error: 'Puzzle not found' },
        { status: 404 }
      );
    }

    // Mark session as completed (not won)
    await sql`
      UPDATE game_sessions
      SET won = false, completed_at = NOW()
      WHERE id = ${sessionId}
    `;

    return NextResponse.json({
      answer: puzzle.answer,
      category: puzzle.category,
      explanation: puzzle.extracted_context,
      reddit_url: puzzle.reddit_url,
      guesses_made: session.guesses?.length || 0,
    });
  } catch (error) {
    console.error('Error giving up:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
