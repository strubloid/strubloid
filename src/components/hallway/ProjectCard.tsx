'use client'

import { motion } from 'framer-motion'

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

interface ProjectCardProps {
  project: Project
  onClick: () => void
}

/**
 * Project card — heftier, more substantial than chat cards.
 * Mounted on the right hallway wall with slower animations.
 */
export function ProjectCard({ project, onClick }: ProjectCardProps) {
  return (
    <motion.div
      className="wall-card wall-card--project"
      onClick={onClick}
      whileHover={{ scale: 1.03, z: 5 }}
      whileTap={{ scale: 0.98 }}
      layoutId={`project-${project.id}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{ flex: 1 }}>{project.name}</h3>
        {project.health && (
          <span className={`health-dot health--${project.health}`} />
        )}
      </div>

      <div className="project-stats">
        <span>{project.chatCount} chats</span>
        <span>{project.memoryCount} memories</span>
        <span>{project.memberCount} members</span>
      </div>

      {project.description && <p>{project.description}</p>}
    </motion.div>
  )
}
