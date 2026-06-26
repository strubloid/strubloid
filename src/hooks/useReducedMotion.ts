'use client'

import { useEffect, useState } from 'react'

type MotionPreference = 'no-preference' | 'reduce' | 'unknown'

/**
 * Detect user's prefers-reduced-motion setting.
 * When 'reduce', flatten all 3D perspective and disable scroll animations.
 */
export function useReducedMotion(): MotionPreference {
  const [preference, setPreference] = useState<MotionPreference>('unknown')

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')

    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setPreference(e.matches ? 'reduce' : 'no-preference')
    }

    handler(mq)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return preference
}
