/**
 * Component for guess input and submission.
 */
import React from 'react';

export function GuessInput({
  value,
  onChange,
  onSubmit,
  disabled,
  maxGuesses,
  currentGuessCount
}) {
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !disabled && value.trim()) {
      onSubmit();
    }
  };

  return (
    <div className="guess-input-container">
      <div className="guess-counter">
        Guess {currentGuessCount + 1} / {maxGuesses}
      </div>
      <div className="input-group">
        <input
          type="text"
          className="guess-input"
          placeholder="What is it?"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={disabled}
          autoFocus
        />
        <button
          className="submit-button"
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
        >
          Guess
        </button>
      </div>
    </div>
  );
}
