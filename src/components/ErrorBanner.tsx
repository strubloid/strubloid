'use client';

import { useState } from 'react';

interface ErrorBannerProps {
  error: string | null;
  code?: string;
  isRetryable?: boolean;
  onRetry?: () => void;
}

export function ErrorBanner({ error, code, isRetryable, onRetry }: ErrorBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!error || dismissed) return null;

  return (
    <div className="error-message mx-4 my-2 flex items-start gap-3 rounded-lg border border-red-700/50 bg-red-900/30 p-3">
      <svg
        className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-red-300">{error}</p>
        {code && (
          <p className="mt-1 text-xs text-red-400/70">
            Error code: {code}
            {isRetryable && ' • This error may be temporary'}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isRetryable && onRetry && (
          <button
            onClick={onRetry}
            className="rounded bg-red-800/50 px-3 py-1 text-xs text-red-200 transition-colors hover:bg-red-800"
          >
            Retry
          </button>
        )}

        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-red-400 transition-colors hover:text-red-300"
          aria-label="Dismiss error"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
