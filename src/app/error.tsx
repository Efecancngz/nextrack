"use client";

import React from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container-content page-enter">
      <div className="error-page">
        <span className="error-code">Error</span>
        <h1 className="error-title">Something went wrong</h1>
        <p className="error-text">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <div className="error-actions">
          <button onClick={reset} className="btn btn-primary">Try Again</button>
        </div>
      </div>
    </div>
  );
}
