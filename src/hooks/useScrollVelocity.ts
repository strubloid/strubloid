'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Tracks scroll velocity in pixels per frame (normalized to ~60fps).
 * Returns a value between 0 and ~20.
 * Used to modulate animation speed based on scroll intensity.
 */
export function useScrollVelocity() {
  const [velocity, setVelocity] = useState(0)
  const lastY = useRef(0)
  const lastTime = useRef(0)
  const rafId = useRef(0)

  useEffect(() => {
    const handleScroll = () => {
      if (rafId.current) cancelAnimationFrame(rafId.current)

      rafId.current = requestAnimationFrame(() => {
        const now = performance.now()
        const deltaY = Math.abs(window.scrollY - lastY.current)
        const deltaT = now - lastTime.current

        if (deltaT > 0) {
          // Normalize to ~60fps frame interval
          const v = (deltaY / deltaT) * 16
          setVelocity(Math.min(v, 20))
        }

        lastY.current = window.scrollY
        lastTime.current = now
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (rafId.current) cancelAnimationFrame(rafId.current)
    }
  }, [])

  return velocity
}
