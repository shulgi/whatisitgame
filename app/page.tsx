'use client';

/**
 * Main game page for What Is It?
 * This is a client component that handles all the game logic
 */

import { useState, useEffect } from 'react';

// Types
interface Puzzle {
  id: number;
  image_url: string;
  category: string | null;
  difficulty: string;
  hint_count: number;
}

interface Guess {
  text: string;
  similarity: number;
  temperature: string;
  isCorrect: boolean;
}

// Main component
export default function Home() {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [hints, setHints] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameStatus, setGameStatus] = useState<'loading' | 'playing' | 'won' | 'lost' | 'error'>('loading');
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const MAX_GUESSES = 8;

  // Start new game
  const startNewGame = async () => {
    setGameStatus('loading');
    setGuesses([]);
    setHints([]);
    setCurrentGuess('');
    setAnswer(null);
    setError(null);

    try {
      // Get random puzzle
      const puzzleRes = await fetch('/api/puzzle/random');
      if (!puzzleRes.ok) throw new Error('Failed to get puzzle');
      const puzzleData = await puzzleRes.json();
      setPuzzle(puzzleData);

      // Start game session
      const sessionRes = await fetch('/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ puzzle_id: puzzleData.id }),
      });
      if (!sessionRes.ok) throw new Error('Failed to start game');
      const sessionData = await sessionRes.json();
      setSessionId(sessionData.session_id);

      setGameStatus('playing');
    } catch (err: any) {
      setError(err.message);
      setGameStatus('error');
    }
  };

  // Submit guess
  const submitGuess = async () => {
    if (!currentGuess.trim() || !sessionId || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/game/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, guess: currentGuess }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to submit guess');
      }

      const result = await res.json();

      setGuesses(prev => [
        ...prev,
        {
          text: currentGuess,
          similarity: result.similarity,
          temperature: result.temperature,
          isCorrect: result.is_correct,
        },
      ]);

      setCurrentGuess('');

      if (result.is_correct) {
        setGameStatus('won');
        setAnswer(result.answer);
      } else if (result.game_over) {
        setGameStatus('lost');
        setAnswer(result.answer);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Request hint
  const requestHint = async () => {
    if (!sessionId) return;

    try {
      const res = await fetch('/api/game/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error);
      }

      const result = await res.json();
      setHints(prev => [...prev, result.hint]);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Give up
  const giveUp = async () => {
    if (!sessionId || !confirm('Are you sure you want to give up?')) return;

    try {
      const res = await fetch(`/api/game/give-up/${sessionId}`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Failed to give up');

      const result = await res.json();
      setAnswer(result.answer);
      setGameStatus('lost');
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Start game on mount
  useEffect(() => {
    startNewGame();
  }, []);

  // Handle enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && currentGuess.trim() && gameStatus === 'playing') {
      submitGuess();
    }
  };

  const canRequestHint = guesses.length >= 3 && gameStatus === 'playing';
  const nextHintAt = [3, 5, 7].find(threshold => guesses.length < threshold);

  return (
    <div className="app">
      <header className="app-header">
        <h1>What Is It?</h1>
        <p className="subtitle">Guess the mystery object from r/whatisthisthing</p>
      </header>

      <main className="app-main">
        {error && <div className="error-message">⚠️ {error}</div>}

        {gameStatus === 'loading' && (
          <div className="loading-screen">
            <div className="loading-spinner">Loading puzzle...</div>
          </div>
        )}

        {gameStatus === 'error' && (
          <div className="error-screen">
            <p>Failed to load puzzle</p>
            <button onClick={startNewGame}>Try Again</button>
          </div>
        )}

        {puzzle && gameStatus !== 'loading' && gameStatus !== 'error' && (
          <>
            <div className="image-container">
              <img
                src={puzzle.image_url}
                alt="Mystery object"
                className="mystery-image"
              />
            </div>

            {gameStatus === 'playing' && (
              <div className="game-controls">
                <div className="guess-input-container">
                  <div className="guess-counter">
                    Guess {guesses.length + 1} / {MAX_GUESSES}
                  </div>
                  <div className="input-group">
                    <input
                      type="text"
                      className="guess-input"
                      placeholder="What is it?"
                      value={currentGuess}
                      onChange={(e) => setCurrentGuess(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={isSubmitting}
                      autoFocus
                    />
                    <button
                      className="submit-button"
                      onClick={submitGuess}
                      disabled={isSubmitting || !currentGuess.trim()}
                    >
                      {isSubmitting ? 'Submitting...' : 'Guess'}
                    </button>
                  </div>
                </div>

                <div className="action-buttons">
                  <button className="give-up-button" onClick={giveUp}>
                    Give Up
                  </button>
                </div>
              </div>
            )}

            <div className="game-info">
              {/* Hints */}
              <div className="hint-section">
                <div className="hint-header">
                  <h3>Hints</h3>
                  <button
                    className="hint-button"
                    onClick={requestHint}
                    disabled={!canRequestHint}
                  >
                    💡 Get Hint
                  </button>
                </div>

                {hints.length === 0 && (
                  <div className="hint-placeholder">
                    {nextHintAt ? (
                      <p>Hints unlock at {nextHintAt} guesses</p>
                    ) : (
                      <p>No hints available yet</p>
                    )}
                  </div>
                )}

                {hints.length > 0 && (
                  <div className="hint-list">
                    {hints.map((hint, index) => (
                      <div key={index} className="hint-item">
                        <span className="hint-icon">💡</span>
                        <span className="hint-text">{hint}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Guess History */}
              {guesses.length > 0 && (
                <div className="guess-history">
                  <h3>Your Guesses</h3>
                  <div className="guess-list">
                    {guesses.map((guess, index) => (
                      <div
                        key={index}
                        className={`guess-item ${guess.isCorrect ? 'correct' : ''}`}
                      >
                        <div className="guess-number">#{index + 1}</div>
                        <div className="guess-text">{guess.text}</div>
                        <div className="guess-feedback">
                          <div className="temperature">{guess.temperature}</div>
                          <div className="similarity">{guess.similarity}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Game Over Modal */}
      {(gameStatus === 'won' || gameStatus === 'lost') && answer && (
        <div className="modal-overlay">
          <div className="modal">
            <div className={`modal-header ${gameStatus === 'won' ? 'win' : 'lose'}`}>
              <h2>{gameStatus === 'won' ? '🎉 You Won!' : '😔 Game Over'}</h2>
            </div>
            <div className="modal-body">
              <div className="answer-reveal">
                <p className="answer-label">The answer was:</p>
                <p className="answer-text">{answer}</p>
              </div>
              {gameStatus === 'won' && (
                <p className="win-message">
                  You guessed it in {guesses.length} {guesses.length === 1 ? 'try' : 'tries'}!
                </p>
              )}
              {gameStatus === 'lost' && (
                <p className="lose-message">
                  You made {guesses.length} guesses but didn't get it. Better luck next time!
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="play-again-button" onClick={startNewGame}>
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="app-footer">
        <p>
          Data from{' '}
          <a href="https://reddit.com/r/whatisthisthing" target="_blank" rel="noopener noreferrer">
            r/whatisthisthing
          </a>
        </p>
      </footer>
    </div>
  );
}
