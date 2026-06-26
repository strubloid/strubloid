'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CameraTransition } from './CameraTransition'
import { usePortalStore } from '@/stores/portal.store'

interface EnterChatProps {
  chatId: string
  children: React.ReactNode
}

/**
 * EnterChat — wraps a chat card with camera transition animation.
 * When clicked, the camera moves toward the left wall before navigating.
 */
export function EnterChat({ chatId, children }: EnterChatProps) {
  const [transitioning, setTransitioning] = useState(false)
  const setActiveChat = usePortalStore((s) => s.setActiveChat)
  const setActiveWall = usePortalStore((s) => s.setActiveWall)
  const router = useRouter()

  const handleComplete = useCallback(() => {
    setActiveChat(chatId)
    setActiveWall('left')
    router.push(`/chat/${chatId}`)
  }, [chatId, setActiveChat, setActiveWall, router])

  return (
    <div onClick={() => setTransitioning(true)}>
      <CameraTransition
        direction="left"
        active={transitioning}
        onComplete={handleComplete}
      >
        {children}
      </CameraTransition>
    </div>
  )
}
