'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { EnterProject } from './EnterProject'
import { ProjectCard } from './ProjectCard'

interface Project {
  id: string
  name: string
  description?: string
  chatCount: number
  memoryCount: number
  memberCount: number
  health?: 'green' | 'yellow' | 'red'
  isPinned: boolean
}

interface WallRightProps {
  onEnterProject: (projectId: string) => void
}

/**
 * Right wall — Projects.
 * Each card is wrapped in EnterProject for the camera transition.
 */
export function WallRight({ onEnterProject }: WallRightProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch('/api/projects')
        if (res.ok) {
          const data = await res.json()
          setProjects(data.projects || data || [])
        }
      } catch {
        // API may not exist yet
      } finally {
        setLoading(false)
      }
    }
    fetchProjects()
  }, [])

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'var(--portal-text-dim)' }}>
        Loading...
      </div>
    )
  }

  return (
    <AnimatePresence>
      {projects.length === 0 ? (
        <motion.div
          key="empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="wall-empty-state"
          onClick={() => onEnterProject('new')}
        >
          <span>
            No projects yet.<br />Start something meaningful.
          </span>
          <div
            style={{
              marginTop: 12,
              fontSize: 11,
              color: 'var(--accent-green-soft, #9ad933)',
            }}
          >
            + New Project
          </div>
        </motion.div>
      ) : (
        projects.map((project, i) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: i * 0.05,
              duration: 0.5,
              ease: [0.34, 1.56, 0.64, 1],
            }}
            style={{
              transform: `translateZ(${-i * 6}px)`,
              opacity: 1 - i * 0.015,
            }}
          >
            <EnterProject projectId={project.id}>
              <ProjectCard project={project} onClick={() => {}} />
            </EnterProject>
          </motion.div>
        ))
      )}
    </AnimatePresence>
  )
}
