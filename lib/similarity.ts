/**
 * Semantic similarity utilities
 *
 * This file handles similarity calculations WITHOUT loading models.
 * Embeddings are pre-computed during curation and stored in the database.
 */

/**
 * Calculate cosine similarity between two vectors
 * Returns value between 0 and 1
 */
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  norm1 = Math.sqrt(norm1);
  norm2 = Math.sqrt(norm2);

  if (norm1 === 0 || norm2 === 0) {
    return 0;
  }

  const similarity = dotProduct / (norm1 * norm2);

  // Ensure between 0 and 1
  return Math.max(0, Math.min(1, similarity));
}

/**
 * Convert similarity (0-1) to percentage
 */
export function similarityToPercentage(similarity: number): number {
  return Math.round(similarity * 1000) / 10; // Round to 1 decimal
}

/**
 * Get temperature label based on similarity percentage
 */
export function getTemperatureLabel(percentage: number): string {
  if (percentage >= 90) return '🔥🔥🔥 VERY HOT!';
  if (percentage >= 75) return '🔥🔥 Hot';
  if (percentage >= 60) return '🔥 Warm';
  if (percentage >= 40) return '🌡️ Cool';
  if (percentage >= 20) return '❄️ Cold';
  return '🧊 Ice Cold';
}

/**
 * Check if guess matches answer (exact or very close)
 */
export function isCorrectGuess(
  guess: string,
  answer: string,
  relatedTerms: string[] | null,
  similarity: number
): boolean {
  const guessLower = guess.toLowerCase().trim();
  const answerLower = answer.toLowerCase().trim();

  // Exact match
  if (guessLower === answerLower) {
    return true;
  }

  // Related terms match
  if (relatedTerms && relatedTerms.some(term => term.toLowerCase() === guessLower)) {
    return true;
  }

  // High similarity threshold
  if (similarity >= 0.90) {
    return true;
  }

  return false;
}

/**
 * Game configuration constants
 */
export const GAME_CONFIG = {
  MAX_GUESSES: 8,
  SIMILARITY_THRESHOLD_WIN: 0.90,
  HINT_UNLOCK_GUESSES: [3, 5, 7],
};
