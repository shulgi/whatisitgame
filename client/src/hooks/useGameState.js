/**
 * Custom hook for managing game state.
 */
import { useState, useCallback } from 'react';
import { api } from '../services/api';

export function useGameState() {
  const [puzzle, setPuzzle] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [guesses, setGuesses] = useState([]);
  const [hints, setHints] = useState([]);
  const [gameStatus, setGameStatus] = useState('loading'); // loading, playing, won, lost
  const [currentGuess, setCurrentGuess] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Start a new game
   */
  const startNewGame = useCallback(async () => {
    setError(null);
    setGameStatus('loading');
    setGuesses([]);
    setHints([]);
    setCurrentGuess('');

    try {
      // Get random puzzle
      const puzzleData = await api.getRandomPuzzle();
      setPuzzle(puzzleData);

      // Start game session
      const session = await api.startGame(puzzleData.id);
      setSessionId(session.session_id);

      setGameStatus('playing');
    } catch (err) {
      setError(err.message || 'Failed to start game');
      setGameStatus('error');
    }
  }, []);

  /**
   * Submit a guess
   */
  const submitGuess = useCallback(async () => {
    if (!currentGuess.trim() || !sessionId || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await api.makeGuess(sessionId, currentGuess);

      // Add guess to history
      setGuesses(prev => [...prev, {
        text: currentGuess,
        similarity: result.similarity,
        temperature: result.temperature,
        isCorrect: result.is_correct,
      }]);

      // Clear input
      setCurrentGuess('');

      // Check game status
      if (result.is_correct) {
        setGameStatus('won');
      } else if (result.game_over) {
        setGameStatus('lost');
      }

    } catch (err) {
      setError(err.message || 'Failed to submit guess');
    } finally {
      setIsSubmitting(false);
    }
  }, [currentGuess, sessionId, isSubmitting]);

  /**
   * Request a hint
   */
  const requestHint = useCallback(async () => {
    if (!sessionId) return;

    setError(null);

    try {
      const result = await api.getHint(sessionId);
      setHints(prev => [...prev, result.hint]);
    } catch (err) {
      setError(err.message || 'No hints available yet');
    }
  }, [sessionId]);

  /**
   * Give up and show answer
   */
  const giveUp = useCallback(async () => {
    if (!sessionId) return;

    setError(null);

    try {
      const result = await api.giveUp(sessionId);
      setGameStatus('lost');
      return result;
    } catch (err) {
      setError(err.message || 'Failed to give up');
    }
  }, [sessionId]);

  return {
    // State
    puzzle,
    sessionId,
    guesses,
    hints,
    gameStatus,
    currentGuess,
    error,
    isSubmitting,

    // Actions
    setCurrentGuess,
    startNewGame,
    submitGuess,
    requestHint,
    giveUp,
  };
}
