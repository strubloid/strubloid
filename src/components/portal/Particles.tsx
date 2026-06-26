'use client'

import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  hue: number // 120–160 green range
  life: number
  maxLife: number
}

interface ParticlesProps {
  count?: number
}

/**
 * Canvas 2D particle system.
 * Floating green-teal dots that drift upward from the bottom.
 * Larger, brighter, and more numerous for a rich portal atmosphere.
 */
export function Particles({ count = 80 }: ParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Initialize particles — visible on light bg
    const particles: Particle[] = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -Math.random() * 0.3 - 0.08,
      size: Math.random() * 3 + 0.8,
      opacity: Math.random() * 0.4 + 0.2,  // 0.2–0.6
      hue: 120 + Math.random() * 40,        // 120 (green) – 160 (teal)
      life: 0,
      maxLife: Math.random() * 600 + 300,
    }))
    particlesRef.current = particles

    let animId: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        p.life++

        // Soft fade at end of life
        const fadeOpacity = Math.min(1, (p.maxLife - p.life) / 80)

        // Glow halo — larger, softer
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue}, 80%, 50%, ${p.opacity * fadeOpacity * 0.15})`
        ctx.fill()

        // Secondary glow
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue}, 85%, 55%, ${p.opacity * fadeOpacity * 0.3})`
        ctx.fill()

        // Main dot
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue}, 90%, 60%, ${p.opacity * fadeOpacity})`
        ctx.fill()

        // Reset when off-screen or expired
        if (
          p.y < -20 ||
          p.x < -20 ||
          p.x > canvas.width + 20 ||
          p.life > p.maxLife
        ) {
          p.x = Math.random() * canvas.width
          p.y = canvas.height + 20
          p.vx = (Math.random() - 0.5) * 0.4
          p.vy = -Math.random() * 0.3 - 0.08
          p.life = 0
          p.opacity = Math.random() * 0.4 + 0.2
          p.size = Math.random() * 3 + 0.8
        }
      }

      animId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [count])

  return (
    <canvas
      ref={canvasRef}
      className="portal-particles"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
      }}
    />
  )
}
