'use client'

import { useEffect, useRef, useCallback } from 'react'
import { usePortalStore } from '@/stores/portal.store'

type SwipeDirection = 'up' | 'down' | 'left' | 'right' | null

interface TouchNavigationOptions {
  /** Min distance in px to register as a swipe */
  threshold?: number
  /** Whether to prevent default scroll on swipe */
  preventScroll?: boolean
}

/**
 * Hook that detects swipe gestures on mobile.
 * Maps swipes to portal navigation actions:
 * - Swipe up/down: hallway scroll
 * - Swipe left: focus right wall
 * - Swipe right: focus left wall
 */
export function useTouchNavigation(options: TouchNavigationOptions = {}) {
  const { threshold = 30, preventScroll = false } = options

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const setActiveWall = usePortalStore((s) => s.setActiveWall)
  const activeWall = usePortalStore((s) => s.activeWall)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    }
  }, [])

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!touchStartRef.current) return

      const touch = e.changedTouches[0]
      const dx = touch.clientX - touchStartRef.current.x
      const dy = touch.clientY - touchStartRef.current.y
      const dt = Date.now() - touchStartRef.current.time

      // Reset
      touchStartRef.current = null

      // Only process quick swipes (< 300ms)
      if (dt > 300) return

      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)

      let direction: SwipeDirection = null

      if (absDx > absDy && absDx > threshold) {
        direction = dx > 0 ? 'right' : 'left'
      } else if (absDy > absDx && absDy > threshold) {
        direction = dy > 0 ? 'down' : 'up'
      }

      if (!direction) return

      // Map direction to wall focus
      switch (direction) {
        case 'left':
          // Swipe left → look at right wall (you swipe toward what you want to see)
          setActiveWall('right')
          break
        case 'right':
          setActiveWall('left')
          break
        case 'up':
          // Currently just focus center
          setActiveWall('center')
          break
        case 'down':
          setActiveWall('center')
          break
      }

      if (preventScroll && direction !== null) {
        e.preventDefault()
      }
    },
    [threshold, preventScroll, setActiveWall]
  )

  useEffect(() => {
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: !preventScroll })

    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchEnd, preventScroll])

  return { activeWall }
}
