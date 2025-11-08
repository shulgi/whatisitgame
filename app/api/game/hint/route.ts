/**
 * API Route: POST /api/game/hint
 * Request a hint for the current game
 */

import { NextResponse } from 'next/server';
import { getGameSession, getPuzzleById, updateHintsUsed } from '@/lib/db';
import { GAME_CONFIG } from '@/lib/similarity';

export async function POST(request: Request) {
  try {
    const { session_id } = await request.json();

    if (!session_id) {
      return NextResponse.json(
        { error: 'session_id is required' },
        { status: 400 }
      );
    }

    // Get session
    const session = await getGameSession(session_id);
    if (!session) {
      return NextResponse.json(
        { error: 'Game session not found' },
        { status: 404 }
      );
    }

    // Get puzzle
    const puzzle = await getPuzzleById(session.puzzle_id);
    if (!puzzle || !puzzle.hints) {
      return NextResponse.json(
        { error: 'No hints available for this puzzle' },
        { status: 404 }
      );
    }

    // Check if hints are available based on guess count
    const guessCount = session.guesses?.length || 0;
    const availableHints = GAME_CONFIG.HINT_UNLOCK_GUESSES.filter(
      threshold => guessCount >= threshold
    );

    if (availableHints.length === 0) {
      return NextResponse.json(
        { error: `Make at least ${GAME_CONFIG.HINT_UNLOCK_GUESSES[0]} guesses to unlock hints` },
        { status: 400 }
      );
    }

    // Get next hint
    const nextHintIndex = availableHints.length - 1;
    const hintsUsed = session.hints_used;

    if (nextHintIndex >= puzzle.hints.length || nextHintIndex < hintsUsed) {
      return NextResponse.json(
        { error: 'No more hints available' },
        { status: 400 }
      );
    }

    // Update hints used
    const newHintsUsed = nextHintIndex + 1;
    await updateHintsUsed(session_id, newHintsUsed);

    return NextResponse.json({
      hint: puzzle.hints[nextHintIndex],
      hints_used: newHintsUsed,
      guess_count: guessCount,
    });
  } catch (error) {
    console.error('Error getting hint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
