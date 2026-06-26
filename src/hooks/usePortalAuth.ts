'use client'

import { useEffect, useState } from 'react'
import { usePortalStore } from '@/stores/portal.store'

const AUTH_STORAGE_KEY = 'strubloid_portal_user'

interface AuthState {
  username: string | null
  isReturning: boolean
  isLoading: boolean
}

/**
 * Manages portal authentication state.
 * - First visit: returns null → show auth input
 * - Returning: reads from localStorage → show "continue as"
 * - On submit: persists to localStorage
 */
export function usePortalAuth() {
  const [auth, setAuth] = useState<AuthState>({
    username: null,
    isReturning: false,
    isLoading: true,
  })

  const setUsername = usePortalStore((s) => s.setUsername)
  const setReturningUser = usePortalStore((s) => s.setReturningUser)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY)
      if (stored) {
        setAuth({
          username: stored,
          isReturning: true,
          isLoading: false,
        })
        setUsername(stored)
        setReturningUser(true)
      } else {
        setAuth((prev) => ({ ...prev, isLoading: false }))
      }
    } catch {
      // localStorage may be blocked in some environments
      setAuth((prev) => ({ ...prev, isLoading: false }))
    }
  }, [setUsername, setReturningUser])

  const submitUsername = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return

    try {
      localStorage.setItem(AUTH_STORAGE_KEY, trimmed)
    } catch {
      // non-critical
    }

    setUsername(trimmed)
    setReturningUser(false)
    setAuth({ username: trimmed, isReturning: false, isLoading: false })
  }

  return { ...auth, submitUsername }
}
