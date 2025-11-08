/**
 * Component for displaying guess history.
 */
import React from 'react';

export function GuessHistory({ guesses }) {
  if (guesses.length === 0) {
    return null;
  }

  return (
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
  );
}
