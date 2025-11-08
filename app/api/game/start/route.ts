/**
 * API Route: POST /api/game/start
 * Start a new game session
 */

import { NextResponse } from 'next/server';
import { getPuzzleById, createGameSession } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { puzzle_id } = await request.json();

    if (!puzzle_id) {
      return NextResponse.json(
        { error: 'puzzle_id is required' },
        { status: 400 }
      );
    }

    // Verify puzzle exists
    const puzzle = await getPuzzleById(puzzle_id);
    if (!puzzle) {
      return NextResponse.json(
        { error: 'Puzzle not found' },
        { status: 404 }
      );
    }

    // Create session
    const session = await createGameSession(puzzle_id);

    return NextResponse.json({
      session_id: session.id,
      puzzle_id: session.puzzle_id,
      max_guesses: 8,
      started_at: session.started_at.toISOString(),
    });
  } catch (error) {
    console.error('Error starting game:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
