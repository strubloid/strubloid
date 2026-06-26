'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { EnterChat } from './EnterChat'
import { RandomChatCard } from './RandomChatCard'

interface RandomChat {
  id: string
  name: string
  lastMessage?: string
  messageCount: number
  updatedAt: string
  hasMemory: boolean
  isPinned: boolean
}

interface WallLeftProps {
  onEnterChat: (chatId: string) => void
}

/**
 * Left wall — Random Chats.
 * Each card is wrapped in EnterChat for the camera transition.
 */
export function WallLeft({ onEnterChat }: WallLeftProps) {
  const [chats, setChats] = useState<RandomChat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchChats() {
      try {
        const res = await fetch('/api/chats?limit=20')
        if (res.ok) {
          const data = await res.json()
          setChats(data.chats || data || [])
        }
      } catch {
        // API may not exist yet — show empty state
      } finally {
        setLoading(false)
      }
    }
    fetchChats()
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
      {chats.length === 0 ? (
        <motion.div
          key="empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="wall-empty-state"
          onClick={() => onEnterChat('new')}
        >
          <span>
            A casual thought?<br />It goes here.
          </span>
          <div
            style={{
              marginTop: 12,
              fontSize: 11,
              color: 'var(--accent-green-soft, #9ad933)',
            }}
          >
            + New Random Chat
          </div>
        </motion.div>
      ) : (
        chats.map((chat, i) => (
          <motion.div
            key={chat.id}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: i * 0.04,
              duration: 0.4,
              ease: 'easeOut',
            }}
            style={{
              transform: `translateZ(${-i * 8}px)`,
              opacity: 1 - i * 0.02,
            }}
          >
            <EnterChat chatId={chat.id}>
              <RandomChatCard chat={chat} onClick={() => {}} />
            </EnterChat>
          </motion.div>
        ))
      )}
    </AnimatePresence>
  )
}
