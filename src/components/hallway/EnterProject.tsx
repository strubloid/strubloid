'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CameraTransition } from './CameraTransition'
import { usePortalStore } from '@/stores/portal.store'

interface EnterProjectProps {
  projectId: string
  children: React.ReactNode
}

/**
 * EnterProject — wraps a project card with camera transition animation.
 * Camera moves closer and toward the right wall before navigating.
 */
export function EnterProject({ projectId, children }: EnterProjectProps) {
  const [transitioning, setTransitioning] = useState(false)
  const setActiveProject = usePortalStore((s) => s.setActiveProject)
  const setActiveWall = usePortalStore((s) => s.setActiveWall)
  const router = useRouter()

  const handleComplete = useCallback(() => {
    setActiveProject(projectId)
    setActiveWall('right')
    router.push(`/projects/${projectId}`)
  }, [projectId, setActiveProject, setActiveWall, router])

  return (
    <div onClick={() => setTransitioning(true)}>
      <CameraTransition
        direction="right"
        active={transitioning}
        onComplete={handleComplete}
      >
        {children}
      </CameraTransition>
    </div>
  )
}
