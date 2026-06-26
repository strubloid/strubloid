'use client'

import { useEffect, useRef } from 'react'
import { usePortalStore } from '@/stores/portal.store'

interface PortalScrollOptions {
  /** Scroll range for the portal entry animation (0 → 1 proportion) */
  enterThreshold?: number
  /** Total scroll range (vh units) for the hallway */
  hallwayScrollRange?: number
}

/**
 * Tracks scroll progress across the portal experience:
 * - 0 → enterThreshold: portal growth phase
 * - enterThreshold → 0.5: transition moment
 * - 0.5 → 1: hallway interior phase
 */
export function usePortalScroll(options: PortalScrollOptions = {}) {
  const {
    enterThreshold = 0.4,
    hallwayScrollRange = 300,
  } = options

  const setScrollProgress = usePortalStore((s) => s.setScrollProgress)
  const setHallwayPosition = usePortalStore((s) => s.setHallwayPosition)
  const setPhase = usePortalStore((s) => s.setPhase)
  const phase = usePortalStore((s) => s.phase)

  const rafId = useRef<number>(0)

  useEffect(() => {
    const bodyHeight = () => hallwayScrollRange * window.innerHeight / 100

    const handleScroll = () => {
      // We use requestAnimationFrame to throttle
      if (rafId.current) cancelAnimationFrame(rafId.current)

      rafId.current = requestAnimationFrame(() => {
        const scrollY = window.scrollY
        const totalScroll = bodyHeight()
        const progress = Math.min(scrollY / totalScroll, 1)

        let phase: 'landing' | 'auth' | 'transition' | 'interior'

        if (progress < 0.05) {
          phase = 'landing'
        } else if (progress < 0.05) { // quick auth window
          phase = 'auth'
        } else if (progress < enterThreshold) {
          phase = 'transition'
        } else {
          phase = 'interior'
        }

        // Portal scale: 1 → 80 during the enter phase
        const enterProgress = Math.min(progress / enterThreshold, 1)
        const portalScale = 1 + enterProgress * 79

        // Camera depth: 0 → -500
        const cameraDepth = -enterProgress * 500

        // Hallway position: derived from progress beyond enterThreshold
        const hallwayP = Math.max(0, (progress - enterThreshold) / (1 - enterThreshold))
        const hallwayPos = hallwayP * hallwayScrollRange * 10 // arbitrary units

        setScrollProgress(progress, portalScale, cameraDepth)
        setHallwayPosition(hallwayPos)

        // Phase transitions
        if (progress >= enterThreshold && phase !== 'interior') {
          setPhase('interior')
        }

        // Update the DOM for CSS perspective
        document.documentElement.style.setProperty(
          '--portal-scale',
          String(portalScale)
        )
        document.documentElement.style.setProperty(
          '--camera-depth',
          String(cameraDepth)
        )
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // initial

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (rafId.current) cancelAnimationFrame(rafId.current)
    }
  }, [enterThreshold, hallwayScrollRange, setScrollProgress, setHallwayPosition, setPhase])

  return { phase }
}
