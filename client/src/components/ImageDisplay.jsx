/**
 * Component for displaying the mystery image.
 */
import React from 'react';

export function ImageDisplay({ imageUrl, isLoading }) {
  if (isLoading) {
    return (
      <div className="image-container loading">
        <div className="loading-spinner">Loading puzzle...</div>
      </div>
    );
  }

  return (
    <div className="image-container">
      <img
        src={imageUrl}
        alt="Mystery object - What is it?"
        className="mystery-image"
        loading="lazy"
      />
    </div>
  );
}
