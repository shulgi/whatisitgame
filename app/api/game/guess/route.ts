/**
 * API Route: POST /api/game/guess
 * Submit a guess and get similarity feedback
 *
 * Uses Hugging Face Inference API to get embeddings for guesses (free tier).
 * Answer embeddings are pre-computed during curation and stored in database.
 */

import { NextResponse } from 'next/server';
import { getGameSession, getPuzzleById, addGuessToSession, markSessionWon } from '@/lib/db';
import { cosineSimilarity, similarityToPercentage, getTemperatureLabel, isCorrectGuess, GAME_CONFIG } from '@/lib/similarity';
import { getEmbedding } from '@/lib/embeddings';

export async function POST(request: Request) {
  try {
    const { session_id, guess } = await request.json();

    if (!session_id || !guess) {
      return NextResponse.json(
        { error: 'session_id and guess are required' },
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
    if (!puzzle) {
      return NextResponse.json(
        { error: 'Puzzle not found' },
        { status: 404 }
      );
    }

    // Check if game is already over
    const guessCount = session.guesses?.length || 0;
    if (session.won || guessCount >= GAME_CONFIG.MAX_GUESSES) {
      return NextResponse.json(
        { error: 'Game is already over' },
        { status: 400 }
      );
    }

    // Get embedding for guess using Hugging Face API (free tier)
    const hfApiKey = process.env.HUGGINGFACE_API_KEY; // Optional, for higher rate limits
    let similarity: number;

    try {
      const guessEmbedding = await getEmbedding(guess, hfApiKey);
      similarity = cosineSimilarity(guessEmbedding, puzzle.answer_embedding);
    } catch (error) {
      console.error('Error getting embedding, using fallback:', error);
      // Fallback to simple string matching if HF API fails
      similarity = calculateSimpleSimilarity(guess, puzzle.answer, puzzle.related_terms || []);
    }

    const similarityPercentage = similarityToPercentage(similarity);
    const temperature = getTemperatureLabel(similarityPercentage);
    const isCorrect = isCorrectGuess(guess, puzzle.answer, puzzle.related_terms, similarity);

    // Create guess record
    const guessRecord = {
      guess,
      similarity: similarityPercentage,
      temperature,
      is_correct: isCorrect,
    };

    // Add guess to session
    await addGuessToSession(session_id, guessRecord);

    // Mark as won if correct
    if (isCorrect) {
      await markSessionWon(session_id);
    }

    const newGuessCount = guessCount + 1;
    const gameOver = isCorrect || newGuessCount >= GAME_CONFIG.MAX_GUESSES;

    const response: any = {
      guess,
      similarity: similarityPercentage,
      temperature,
      is_correct: isCorrect,
      guess_number: newGuessCount,
      max_guesses: GAME_CONFIG.MAX_GUESSES,
      game_over: gameOver,
    };

    // Include answer if game over
    if (gameOver) {
      response.answer = puzzle.answer;
      response.answer_explanation = puzzle.extracted_context;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error processing guess:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Simple similarity calculation (fallback when embeddings not available)
 * This is a temporary solution - in production use actual embeddings
 */
function calculateSimpleSimilarity(guess: string, answer: string, relatedTerms: string[]): number {
  const guessLower = guess.toLowerCase().trim();
  const answerLower = answer.toLowerCase().trim();

  // Exact match
  if (guessLower === answerLower) {
    return 1.0;
  }

  // Related terms
  if (relatedTerms.some(term => term.toLowerCase() === guessLower)) {
    return 0.95;
  }

  // Contains answer
  if (guessLower.includes(answerLower) || answerLower.includes(guessLower)) {
    return 0.80;
  }

  // Word overlap
  const guessWords = guessLower.split(/\s+/);
  const answerWords = answerLower.split(/\s+/);
  const commonWords = guessWords.filter(word => answerWords.includes(word));

  if (commonWords.length > 0) {
    return 0.60 + (commonWords.length * 0.10);
  }

  // Levenshtein distance for single words
  if (guessWords.length === 1 && answerWords.length === 1) {
    const distance = levenshteinDistance(guessLower, answerLower);
    const maxLen = Math.max(guessLower.length, answerLower.length);
    return Math.max(0, 1 - (distance / maxLen));
  }

  // Default low similarity
  return 0.20;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}
