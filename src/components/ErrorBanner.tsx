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
    <div className="mx-4 my-2 p-3 rounded-lg bg-red-900/30 border border-red-700/50 flex items-start gap-3">
      <svg
        className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
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

      <div className="flex-1 min-w-0">
        <p className="text-red-300 text-sm font-medium">{error}</p>
        {code && (
          <p className="text-red-400/70 text-xs mt-1">
            Error code: {code}
            {isRetryable && ' • This error may be temporary'}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isRetryable && onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1 text-xs bg-red-800/50 hover:bg-red-800 text-red-200 rounded transition-colors"
          >
            Retry
          </button>
        )}

        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-red-400 hover:text-red-300 transition-colors"
          aria-label="Dismiss error"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
