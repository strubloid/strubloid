'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePortalAuth } from '@/hooks/usePortalAuth'

/**
 * AuthOverlay — "Who are you?" input integrated into the portal.
 *
 * After a brief delay, a glassmorphism input appears:
 * "Who are you?" / "Enter your name" placeholder.
 * On submit or Enter, stores the username and shows a "Continue" button.
 *
 * Avoids feeling like a login form — feels like identifying yourself to the portal.
 */
export function AuthOverlay() {
  const [showInput, setShowInput] = useState(false)
  const [username, setUsername] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { username: storedUsername, submitUsername, isReturning, isLoading } = usePortalAuth()
  const isAuthenticated = storedUsername !== null

  // Show input after landing animation completes
  useEffect(() => {
    const timer = setTimeout(() => setShowInput(true), 1500)
    return () => clearTimeout(timer)
  }, [])

  const handleSubmit = () => {
    if (username.trim()) {
      submitUsername(username.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <AnimatePresence>
      {!isAuthenticated && showInput && (
        <motion.div
          key="auth"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{
            position: 'relative',
            zIndex: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
            marginTop: 32,
          }}
        >
          <p
            style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: 300,
              fontSize: 13,
              color: 'var(--portal-text-dim)',
              letterSpacing: '0.02em',
            }}
          >
            Who are you?
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              ref={inputRef}
              className="portal-auth-input"
              type="text"
              placeholder="Enter your name..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            {username.trim() && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="portal-btn"
                onClick={handleSubmit}
                style={{
                  padding: '14px 20px',
                  whiteSpace: 'nowrap',
                  background: 'var(--glass-solid)',
                  border: '1px solid var(--accent-green-dim)',
                  color: 'var(--accent-green)',
                }}
              >
                Enter
              </motion.button>
            )}
          </div>
        </motion.div>
      )}

      {isAuthenticated && (
        <motion.div
          key="authenticated"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: 'relative',
            zIndex: 3,
            marginTop: 24,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 13,
            color: 'var(--portal-text-dim)',
            opacity: 0.5,
          }}
        >
          Welcome back.
        </motion.div>
      )}
    </AnimatePresence>
  )
}
