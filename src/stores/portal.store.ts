import { create } from 'zustand'

export type PortalPhase = 'landing' | 'auth' | 'transition' | 'interior'

export interface PortalState {
  // Current phase of the experience
  phase: PortalPhase

  // Scroll progress across entire experience (0 → 1)
  scrollProgress: number

  // Derived portal scale (1 → 80)
  portalScale: number

  // How far the camera has moved forward (0 → -500)
  cameraDepth: number

  // Interior hallway position (0 → hallwayLength)
  hallwayPosition: number

  // Which wall is currently active/focused
  activeWall: 'left' | 'right' | 'center' | null

  // Auth
  username: string | null
  isReturningUser: boolean

  // Active selections
  activeChatId: string | null
  activeProjectId: string | null

  // Actions
  setPhase: (phase: PortalPhase) => void
  setScrollProgress: (progress: number, scale: number, depth: number) => void
  setHallwayPosition: (position: number) => void
  setActiveWall: (wall: PortalState['activeWall']) => void
  setUsername: (username: string) => void
  setReturningUser: (isReturning: boolean) => void
  setActiveChat: (chatId: string | null) => void
  setActiveProject: (projectId: string | null) => void
  reset: () => void
}

const initialState = {
  phase: 'landing' as PortalPhase,
  scrollProgress: 0,
  portalScale: 1,
  cameraDepth: 0,
  hallwayPosition: 0,
  activeWall: null as PortalState['activeWall'],
  username: null as string | null,
  isReturningUser: false,
  activeChatId: null as string | null,
  activeProjectId: null as string | null,
}

export const usePortalStore = create<PortalState>((set) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),

  setScrollProgress: (scrollProgress, portalScale, cameraDepth) =>
    set({ scrollProgress, portalScale, cameraDepth }),

  setHallwayPosition: (position) =>
    set({ hallwayPosition: Math.max(0, position) }),

  setActiveWall: (wall) => set({ activeWall: wall }),

  setUsername: (username) => set({ username }),

  setReturningUser: (isReturning) => set({ isReturningUser: isReturning }),

  setActiveChat: (chatId) => set({ activeChatId: chatId }),

  setActiveProject: (projectId) => set({ activeProjectId: projectId }),

  reset: () => set(initialState),
}))
