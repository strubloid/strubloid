'use client'

import { useState, useEffect } from 'react'
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  AnimatePresence,
} from 'framer-motion'
import { PortalGlow } from './PortalGlow'
import { Particles } from './Particles'
import { Branding } from './Branding'
import { AuthOverlay } from './AuthOverlay'
import { ScrollHint } from './ScrollHint'
import { usePortalStore } from '@/stores/portal.store'

/**
 * ScrollToEnter — the portal entry sequence.
 *
 * Cinematic scroll experience matching the vision:
 * 1. Landing: portal at center, empty space, premium feel
 * 2. Scroll down: portal GROWS (1→6x), camera moves forward (depth -400),
 *    background darkens, outer elements fade out
 * 3. At ~70% scroll: portal fills viewport → bright flash → enter interior
 *
 * The flash creates the "crossing dimensions" moment.
 * After flash, phase='interior', and the Hallway appears in the main slot.
 */
export function ScrollToEnter() {
  const [flash, setFlash] = useState(false)

  const setPhase = usePortalStore((s) => s.setPhase)
  const setScrollProgress = usePortalStore((s) => s.setScrollProgress)

  // Track window scroll
  const { scrollYProgress } = useScroll()

  // --- Cinematic transform values ---

  // Portal scale: smaller + slower so entry takes longer and stays visually centered.
  const portalScale = useTransform(scrollYProgress, [0, 0.86], [1, 4.85])

  // Camera depth (z-translate): moves forward through the portal
  const cameraDepth = useTransform(scrollYProgress, [0, 0.86], [0, -520])

  // Background darkens as you approach the portal
  const bgOpacity = useTransform(scrollYProgress, [0, 0.78], [0, 0.82])

  // Outer elements (tagline, scroll hint, status) fade out
  const uiOpacity = useTransform(scrollYProgress, [0, 0.66], [1, 0])

  // Portal aperture glow intensifies as you approach
  const glowIntensity = useTransform(scrollYProgress, [0, 0.86], [1, 1.35])

  // Smooth everything
  const smoothScale = useSpring(portalScale, { stiffness: 40, damping: 18 })
  const smoothDepth = useSpring(cameraDepth, { stiffness: 40, damping: 18 })

  const [transitioned, setTransitioned] = useState(false)

  useEffect(() => {
    const unsubscribe = scrollYProgress.on('change', (latest) => {
      const scale = portalScale.get()
      const depth = cameraDepth.get()
      setScrollProgress(latest, scale, depth)

      if (latest >= 0.86 && !transitioned) {
        setTransitioned(true)
        setFlash(true)
        setTimeout(() => {
          setFlash(false)
          setPhase('interior')
        }, 280)
      }
    })
    return () => unsubscribe()
  }, [scrollYProgress, portalScale, cameraDepth, setScrollProgress, transitioned, setPhase])

  return (
    <>
      {/* Scroll spacer — longer runway so entering the portal takes time */}
      <div style={{ height: '380vh', pointerEvents: 'none' }} />

      {/* Background image layer — ChatGPT-generated backdrop */}
      <div className="portal-bg-image" />

      {/* Ambient light rays overlay */}
      <div className="portal-rays" />

      {/* Darkening overlay — background goes dark as you approach portal */}
      <motion.div
        className="portal-bg-deep"
        style={{ opacity: bgOpacity }}
      />

      {/* Vignette */}
      <div className="portal-vignette" />

      {/* Portal content — fixed overlay */}
      <div
        className="portal-stage"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          pointerEvents: 'none',
        }}
      >
        {/* Particles — fade out as portal grows */}
        <motion.div style={{ opacity: uiOpacity }}>
          <Particles count={80} />
        </motion.div>

        {/* Portal glow with cinematic animation */}
        <motion.div
          className="portal-core-stage"
          style={{
            zIndex: 2,
            pointerEvents: 'none',
          }}
        >
          <motion.div style={{ scale: smoothScale, transformOrigin: 'center center' }}>
          <motion.div style={{ scale: glowIntensity, transformOrigin: 'center center' }}>
            <PortalGlow />
          </motion.div>
          </motion.div>
        </motion.div>

        {/* Branding — fades out during approach */}
        <motion.div
          className="portal-copy-stage"
          style={{
            zIndex: 2,
            pointerEvents: 'none',
            opacity: uiOpacity,
          }}
        >
          <Branding />
        </motion.div>

        {/* Tagline */}
        <motion.p
          className="portal-tagline"
          style={{
            pointerEvents: 'none',
            opacity: uiOpacity,
          }}
        >
          your AI workspace
        </motion.p>

        {/* Auth */}
        <motion.div
          className="portal-auth-area"
          style={{ pointerEvents: 'auto', opacity: uiOpacity }}
        >
          <AuthOverlay />
        </motion.div>

        {/* Scroll hint — fades out early */}
        <motion.div style={{ pointerEvents: 'auto', opacity: uiOpacity }}>
          <ScrollHint />
        </motion.div>

        {/* Status */}
        <motion.div
          className="portal-status"
          style={{ pointerEvents: 'none', opacity: uiOpacity }}
        >
          <span className="dot" />
          <span>online</span>
        </motion.div>
      </div>

      {/* Flash overlay — "crossing dimensions" moment */}
      <AnimatePresence>
        {flash && (
          <motion.div
            key="flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 200,
              background: '#fff',
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
