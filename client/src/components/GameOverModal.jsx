/**
 * Component for game over modal (win or lose).
 */
import React from 'react';

export function GameOverModal({ status, answer, guessCount, onPlayAgain }) {
  const isWin = status === 'won';

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className={`modal-header ${isWin ? 'win' : 'lose'}`}>
          <h2>{isWin ? '🎉 You Won!' : '😔 Game Over'}</h2>
        </div>

        <div className="modal-body">
          <div className="answer-reveal">
            <p className="answer-label">The answer was:</p>
            <p className="answer-text">{answer}</p>
          </div>

          {isWin && (
            <p className="win-message">
              You guessed it in {guessCount} {guessCount === 1 ? 'try' : 'tries'}!
            </p>
          )}

          {!isWin && (
            <p className="lose-message">
              You made {guessCount} guesses but didn't get it.
              Better luck next time!
            </p>
          )}
        </div>

        <div className="modal-footer">
          <button className="play-again-button" onClick={onPlayAgain}>
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
}
