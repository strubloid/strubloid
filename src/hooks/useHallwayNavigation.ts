'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePortalStore } from '@/stores/portal.store'

type WallTarget = 'left' | 'right' | 'center'

/**
 * Hook for hallway navigation logic.
 * Controls wall focus, entry into chats/projects, and return to hallway.
 */
export function useHallwayNavigation() {
  const activeWall = usePortalStore((s) => s.activeWall)
  const setActiveWall = usePortalStore((s) => s.setActiveWall)
  const setActiveChat = usePortalStore((s) => s.setActiveChat)
  const setActiveProject = usePortalStore((s) => s.setActiveProject)
  const router = useRouter()

  const focusWall = (wall: WallTarget) => {
    setActiveWall(wall)
  }

  const enterChat = (chatId: string) => {
    setActiveChat(chatId)
    setActiveWall('left')

    // After a brief moment, navigate to the chat
    setTimeout(() => {
      router.push(`/chat/${chatId}`)
    }, 400)
  }

  const enterProject = (projectId: string) => {
    setActiveProject(projectId)
    setActiveWall('right')

    setTimeout(() => {
      router.push(`/projects/${projectId}`)
    }, 400)
  }

  const exitToHallway = () => {
    setActiveWall(null)
    setActiveChat(null)
    setActiveProject(null)
    router.push('/')
  }

  // Keyboard shortcut: 1=left, 2=center, 3=right
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === '1') focusWall('left')
      else if (e.key === '2') focusWall('center')
      else if (e.key === '3') focusWall('right')
      else if (e.key === 'Escape') exitToHallway()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { activeWall, focusWall, enterChat, enterProject, exitToHallway }
}
