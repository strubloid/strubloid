'use client'

import { motion } from 'framer-motion'

/**
 * PortalGlow — the glowing circular portal at the center of the landing page.
 *
 * A dramatic dark-core portal with rotating green neon rings.
 * The deep black aperture creates contrast against the light Apple-style bg.
 */
export function PortalGlow() {
  const ringDuration = [80, 50, 28, 18, 10]

  return (
    <div className="portal-glow" style={{ width: 420, height: 420 }}>
      {/* Deep void aperture — the portal opening */}
      <div className="portal-aperture" />

      {/* Outer glow wash behind rings */}
      <div className="portal-glow-wash" />

      {/* Ring 1 — outermost, widest, slowest */}
      <svg className="portal-ring" viewBox="0 0 300 300">
        <motion.circle
          cx="150" cy="150" r="130"
          fill="none"
          stroke="rgba(0, 160, 35, 0.35)"
          strokeWidth="1.2"
          animate={{ rotate: 360 }}
          transition={{ duration: ringDuration[0], repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
        />
        <motion.circle
          cx="150" cy="150" r="124"
          fill="none"
          stroke="rgba(0, 180, 40, 0.2)"
          strokeWidth="0.5"
          animate={{ rotate: -360 }}
          transition={{ duration: ringDuration[0] * 0.7, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
        />
      </svg>

      {/* Ring 2 */}
      <svg className="portal-ring" viewBox="0 0 300 300">
        <motion.circle
          cx="150" cy="150" r="104"
          fill="none"
          stroke="rgba(0, 190, 42, 0.45)"
          strokeWidth="1.6"
          animate={{ rotate: -360 }}
          transition={{ duration: ringDuration[1], repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
        />
        <motion.circle
          cx="150" cy="150" r="98"
          fill="none"
          stroke="rgba(0, 200, 48, 0.2)"
          strokeWidth="0.5"
          animate={{ rotate: 360 }}
          transition={{ duration: ringDuration[1] * 0.6, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
        />
      </svg>

      {/* Ring 3 — solid green */}
      <svg className="portal-ring" viewBox="0 0 300 300">
        <motion.circle
          cx="150" cy="150" r="78"
          fill="none"
          stroke="#00cc33"
          strokeWidth="2.2"
          animate={{ rotate: 360 }}
          transition={{ duration: ringDuration[2], repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
        />
      </svg>

      {/* Ring 4 — bright, tight */}
      <svg className="portal-ring" viewBox="0 0 300 300">
        <motion.circle
          cx="150" cy="150" r="56"
          fill="none"
          stroke="#00e63a"
          strokeWidth="2.8"
          animate={{ rotate: -360 }}
          transition={{ duration: ringDuration[3], repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
        />
      </svg>

      {/* Ring 5 — innermost, brightest */}
      <svg className="portal-ring" viewBox="0 0 300 300">
        <motion.circle
          cx="150" cy="150" r="36"
          fill="none"
          stroke="#00ff41"
          strokeWidth="3"
          animate={{ rotate: 360 }}
          transition={{ duration: ringDuration[4], repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
        />
      </svg>

      {/* Ghost ring — pulsing */}
      <svg className="portal-ring" viewBox="0 0 300 300" style={{ opacity: 0.3 }}>
        <motion.circle
          cx="150" cy="150" r="88"
          fill="none"
          stroke="rgba(0, 255, 65, 0.15)"
          strokeWidth="6"
          animate={{
            rotate: 360,
            scale: [1, 1.08, 1],
          }}
          transition={{
            rotate: { duration: 40, repeat: Infinity, ease: 'linear' },
            scale: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
          }}
          style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
        />
      </svg>

      {/* Center dot — portal core */}
      <div className="portal-dot" />
    </div>
  )
}
