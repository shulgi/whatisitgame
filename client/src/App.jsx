/**
 * Main App component for What Is It? game.
 */
import React, { useEffect, useState } from 'react';
import { useGameState } from './hooks/useGameState';
import { ImageDisplay } from './components/ImageDisplay';
import { GuessInput } from './components/GuessInput';
import { GuessHistory } from './components/GuessHistory';
import { HintDisplay } from './components/HintDisplay';
import { GameOverModal } from './components/GameOverModal';
import './App.css';

function App() {
  const {
    puzzle,
    guesses,
    hints,
    gameStatus,
    currentGuess,
    error,
    isSubmitting,
    setCurrentGuess,
    startNewGame,
    submitGuess,
    requestHint,
    giveUp,
  } = useGameState();

  const [answer, setAnswer] = useState(null);

  // Start game on mount
  useEffect(() => {
    startNewGame();
  }, []);

  // Handle game over
  const handlePlayAgain = () => {
    setAnswer(null);
    startNewGame();
  };

  const handleGiveUp = async () => {
    if (window.confirm('Are you sure you want to give up?')) {
      const result = await giveUp();
      if (result) {
        setAnswer(result.answer);
      }
    }
  };

  // Check if can request hint
  const canRequestHint = guesses.length >= 3 && gameStatus === 'playing';

  // Get answer when game is over
  useEffect(() => {
    if (gameStatus === 'won' && guesses.length > 0) {
      const lastGuess = guesses[guesses.length - 1];
      if (lastGuess.isCorrect) {
        setAnswer(lastGuess.text);
      }
    }
  }, [gameStatus, guesses]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>What Is It?</h1>
        <p className="subtitle">Guess the mystery object from r/whatisthisthing</p>
      </header>

      <main className="app-main">
        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

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
            <ImageDisplay
              imageUrl={puzzle.image_url}
              isLoading={false}
            />

            {gameStatus === 'playing' && (
              <div className="game-controls">
                <GuessInput
                  value={currentGuess}
                  onChange={setCurrentGuess}
                  onSubmit={submitGuess}
                  disabled={isSubmitting || gameStatus !== 'playing'}
                  maxGuesses={8}
                  currentGuessCount={guesses.length}
                />

                <div className="action-buttons">
                  <button
                    className="give-up-button"
                    onClick={handleGiveUp}
                    disabled={gameStatus !== 'playing'}
                  >
                    Give Up
                  </button>
                </div>
              </div>
            )}

            <div className="game-info">
              <HintDisplay
                hints={hints}
                onRequestHint={requestHint}
                canRequestHint={canRequestHint}
                guessCount={guesses.length}
              />

              <GuessHistory guesses={guesses} />
            </div>
          </>
        )}
      </main>

      {(gameStatus === 'won' || gameStatus === 'lost') && answer && (
        <GameOverModal
          status={gameStatus}
          answer={answer}
          guessCount={guesses.length}
          onPlayAgain={handlePlayAgain}
        />
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

export default App;
