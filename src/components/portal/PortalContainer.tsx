'use client'

import { motion } from 'framer-motion'
import { PortalGlow } from './PortalGlow'
import { Particles } from './Particles'
import { Branding } from './Branding'
import { AuthOverlay } from './AuthOverlay'

/**
 * PortalContainer — the landing page experience.
 * A fixed overlay showing the portal entrance with particles.
 */
export function PortalContainer() {
  return (
    <motion.div
      className="portal-container"
      initial={{ opacity: 1 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--portal-bg, #f5f5f7)',
      }}
    >
      <Particles count={60} />

      <div style={{ position: 'relative', zIndex: 2 }}>
        <PortalGlow />
      </div>

      <div style={{ position: 'relative', zIndex: 2 }}>
        <Branding />
      </div>

      <AuthOverlay />
    </motion.div>
  )
}
