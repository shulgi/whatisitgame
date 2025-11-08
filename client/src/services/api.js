/**
 * API service for communicating with the backend.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function handleResponse(response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new ApiError(error.detail || 'Request failed', response.status);
  }
  return response.json();
}

export const api = {
  /**
   * Get a random puzzle
   */
  async getRandomPuzzle(difficulty = null) {
    const url = new URL(`${API_BASE_URL}/puzzle/random`, window.location.origin);
    if (difficulty) {
      url.searchParams.append('difficulty', difficulty);
    }
    const response = await fetch(url);
    return handleResponse(response);
  },

  /**
   * Start a new game session
   */
  async startGame(puzzleId) {
    const response = await fetch(`${API_BASE_URL}/game/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ puzzle_id: puzzleId }),
    });
    return handleResponse(response);
  },

  /**
   * Make a guess
   */
  async makeGuess(sessionId, guess) {
    const response = await fetch(`${API_BASE_URL}/game/guess`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
        guess: guess.trim(),
      }),
    });
    return handleResponse(response);
  },

  /**
   * Get a hint
   */
  async getHint(sessionId) {
    const response = await fetch(`${API_BASE_URL}/game/hint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ session_id: sessionId }),
    });
    return handleResponse(response);
  },

  /**
   * Give up and reveal answer
   */
  async giveUp(sessionId) {
    const response = await fetch(`${API_BASE_URL}/game/give-up/${sessionId}`, {
      method: 'POST',
    });
    return handleResponse(response);
  },

  /**
   * Get session details
   */
  async getSession(sessionId) {
    const response = await fetch(`${API_BASE_URL}/game/session/${sessionId}`);
    return handleResponse(response);
  },

  /**
   * Get puzzle count
   */
  async getPuzzleCount() {
    const response = await fetch(`${API_BASE_URL}/puzzle/stats/count`);
    return handleResponse(response);
  },
};
