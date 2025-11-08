/**
 * Component for displaying hints.
 */
import React from 'react';

export function HintDisplay({ hints, onRequestHint, canRequestHint, guessCount }) {
  const nextHintAt = [3, 5, 7].find(threshold => guessCount < threshold);

  return (
    <div className="hint-section">
      <div className="hint-header">
        <h3>Hints</h3>
        <button
          className="hint-button"
          onClick={onRequestHint}
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
  );
}
