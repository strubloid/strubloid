'use client'

import { useRef, useState, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface CameraTransitionProps {
  children: ReactNode
  /** Wall direction the camera moves toward */
  direction?: 'left' | 'right' | 'center'
  /** Whether the transition is currently active */
  active: boolean
  /** Called when the transition animation starts */
  onStart?: () => void
  /** Called when the transition animation completes */
  onComplete?: () => void
}

/**
 * CameraTransition — animates the camera moving toward a wall
 * before navigating to a chat or project.
 *
 * The parent container shifts perspective-origin toward the target wall,
 * the wall rotates slightly toward the user, and the card scales up.
 */
export function CameraTransition({
  children,
  direction = 'center',
  active,
  onStart,
  onComplete,
}: CameraTransitionProps) {
  const [animating, setAnimating] = useState(false)

  const originX = direction === 'left' ? '20%' : direction === 'right' ? '80%' : '50%'
  const wallRotateY = direction === 'left' ? 10 : direction === 'right' ? -10 : 0

  return (
    <motion.div
      style={{
        perspective: '1200px',
        perspectiveOrigin: originX,
        transformStyle: 'preserve-3d',
        width: '100%',
        height: '100%',
      }}
      animate={
        active
          ? {
              perspectiveOrigin: originX,
            }
          : {}
      }
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <motion.div
        animate={
          active
            ? {
                rotateY: wallRotateY,
                scale: 1.05,
              }
            : {
                rotateY: 0,
                scale: 1,
              }
        }
        transition={{
          type: 'spring',
          stiffness: 80,
          damping: 20,
          mass: 1.2,
        }}
        onAnimationStart={() => {
          if (active) {
            setAnimating(true)
            onStart?.()
          }
        }}
        onAnimationComplete={() => {
          if (active && animating) {
            setTimeout(() => {
              onComplete?.()
              setAnimating(false)
            }, 200)
          }
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}
