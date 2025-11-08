/**
 * API Route: GET /api/puzzle/random
 * Returns a random puzzle (without answer/embeddings)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRandomPuzzle } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const difficulty = searchParams.get('difficulty');

    const puzzle = await getRandomPuzzle(difficulty || undefined);

    if (!puzzle) {
      return NextResponse.json(
        { error: 'No puzzles available' },
        { status: 404 }
      );
    }

    // Return puzzle without answer and embeddings
    return NextResponse.json({
      id: puzzle.id,
      image_url: puzzle.image_url,
      category: puzzle.category,
      difficulty: puzzle.difficulty,
      hint_count: puzzle.hints?.length || 0,
    });
  } catch (error) {
    console.error('Error getting random puzzle:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
