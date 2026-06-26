'use client'

import { useCallback } from 'react'
import { motion } from 'framer-motion'

/**
 * ExitButton — a floating button to return to the hallway.
 * Shown on chat/project pages.
 * "×" or "Back to Hallway" depending on viewport.
 */
export function ExitButton() {
  const handleExit = useCallback(() => {
    // Dispatch a custom event so the layout can handle the transition
    window.dispatchEvent(new CustomEvent('strubloid-exit-to-hallway'))
    // Fallback: navigate to root
    window.location.href = '/'
  }, [])

  return (
    <motion.button
      onClick={handleExit}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 0.4, x: 0 }}
      whileHover={{ opacity: 0.8, scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      style={{
        position: 'fixed',
        top: 16,
        left: 16,
        zIndex: 100,
        background: 'var(--glass-bg, rgba(255,255,255,0.08))',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--glass-border, rgba(255,255,255,0.12))',
        borderRadius: 10,
        padding: '8px 14px',
        cursor: 'pointer',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 12,
        color: 'var(--portal-text-dim, #6b7280)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        boxShadow: 'var(--shadow-card, 0 2px 4px rgba(0,0,0,0.04))',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 7H2M6 3L2 7L6 11" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="exit-label">Hallway</span>
    </motion.button>
  )
}
