'use client'

import { motion } from 'framer-motion'

/**
 * "STRUBLOID" branding — centered below the portal.
 * Clean, ultra-light weight, wide tracking.
 * Matches the Apple-inspired minimal design.
 */
export function Branding() {
  return (
    <motion.p
      className="portal-branding"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.2, ease: 'easeOut', delay: 0.5 }}
    >
      STRUBLOID
    </motion.p>
  )
}
