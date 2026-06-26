'use client'

/**
 * ScrollHint — "SCROLL TO ENTER" with a mouse icon animation.
 * Positioned at the bottom of the viewport.
 * Fades in after the portal entrance animation.
 */
export function ScrollHint() {
  return (
    <div className="portal-scroll-hint">
      <svg
        className="mouse-icon"
        width="16"
        height="24"
        viewBox="0 0 16 24"
        fill="none"
        stroke="var(--portal-text-dim)"
        strokeWidth="1.2"
      >
        <rect x="1" y="1" width="14" height="22" rx="7" />
        <circle cx="8" cy="8" r="2" fill="var(--portal-text-dim)" />
      </svg>
      <span
        style={{
          fontSize: 10,
          fontFamily: 'Inter, system-ui, sans-serif',
          letterSpacing: '0.15em',
          color: 'var(--portal-text-dim)',
        }}
      >
        SCROLL TO ENTER
      </span>
    </div>
  )
}
