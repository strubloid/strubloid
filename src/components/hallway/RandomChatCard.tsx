'use client'

import { motion } from 'framer-motion'

interface RandomChat {
  id: string
  name: string
  lastMessage?: string
  messageCount: number
  updatedAt: string
  hasMemory: boolean
  isPinned: boolean
}

interface RandomChatCardProps {
  chat: RandomChat
  onClick: () => void
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

/**
 * Random Chat card — lightweight, quick feel.
 * Mounted on the left hallway wall.
 */
export function RandomChatCard({ chat, onClick }: RandomChatCardProps) {
  return (
    <motion.div
      className="wall-card wall-card--random"
      onClick={onClick}
      whileHover={{ scale: 1.02, z: 3 }}
      whileTap={{ scale: 0.99 }}
      layoutId={`chat-${chat.id}`}
    >
      <h3>{chat.name}</h3>
      {chat.lastMessage && <p>{chat.lastMessage}</p>}
      <div className="card-meta">
        <span>{timeAgo(chat.updatedAt)}</span>
        <span>{chat.messageCount} msgs</span>
        {chat.hasMemory && <span className="memory-badge">🧠</span>}
      </div>
    </motion.div>
  )
}
