'use client';

import { useEffect, useState } from 'react';

const PHASE_LABELS: Record<string, string> = {
  'context-building': 'Warming up…',
  'model-selected': 'Recalling memory…',
  'token-start': 'Thinking…',
};

const PHASE_BULLETS: Record<string, number> = {
  'context-building': 1,
  'model-selected': 2,
  'token-start': 3,
};

/**
 * Animated thinking indicator with 4 phases:
 * - Warming up…   → ●○○ pulsing  (routing/model lookup)
 * - Recalling…    → ●●○         (brain/randoms queries)
 * - Thinking…     → ●●●         (waiting for first token)
 * - Composing…    → ▊ cursor    (actively streaming tokens)
 */
export function ThinkingIndicator({ phase }: { phase: string }) {
  const [pulseKey, setPulseKey] = useState(0);

  // Cycle the pulsing bullet through the 3 dots
  useEffect(() => {
    if (phase === 'composing') return;
    const interval = setInterval(() => setPulseKey((k) => (k + 1) % 3), 600);
    return () => clearInterval(interval);
  }, [phase]);

  if (phase === 'composing') {
    return <span className="thinking-composing-cursor ml-1 animate-pulse">▊</span>;
  }

  const label = PHASE_LABELS[phase] || 'Thinking…';
  const activeBullets = PHASE_BULLETS[phase] ?? 1;

  return (
    <span className="inline-flex items-center gap-1 text-sm text-[--color-text-dim]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`inline-block h-2 w-2 rounded-full ${
            i < activeBullets
              ? 'bg-current'
              : 'bg-current/20'
          } ${pulseKey === i ? 'animate-pulse opacity-100' : ''}`}
        />
      ))}
      <span className="ml-1">{label}</span>
    </span>
  );
}
