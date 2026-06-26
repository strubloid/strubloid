'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'

type FocusItem =
  | { type: 'random'; id: string; title: string; subtitle: string; detail: string; meta: string }
  | { type: 'project'; id: string; title: string; subtitle: string; detail: string; meta: string }
  | { type: 'projectChat'; id: string; projectId: string; title: string; subtitle: string; detail: string; meta: string }

interface ApiMessage {
  content: string
  role: string
  createdAt: string
}

interface ApiChat {
  id: string
  title: string
  updatedAt: string
  createdAt: string
  isRandom: boolean
  projectId?: string | null
  messages?: ApiMessage[]
}

interface ApiProject {
  id: string
  name: string
  description?: string | null
  color?: string
  chatCount?: number
  memoryCount?: number
  lastChat?: ApiChat | null
}

interface ProjectLane extends ApiProject {
  chats: ApiChat[]
}

interface HallwayData {
  randomChats: ApiChat[]
  projects: ProjectLane[]
}

const RANDOMS_PER_WALL = 8
const PROJECT_CHATS_PER_WALL = 6
const DEPTH_GAP = 620

function getPreview(chat: ApiChat): string {
  const message = chat.messages?.[0]
  if (!message?.content) return 'No messages yet — an empty room waiting for a thought.'
  return message.content.replace(/\s+/g, ' ').slice(0, 180)
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.max(0, now - then)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks.length ? chunks : [[]]
}

function WallCard({ item, side, onFocus }: { item: FocusItem; side: 'left' | 'right'; onFocus: (item: FocusItem) => void }) {
  return (
    <button className={`corridor-card corridor-card--${side}`} onClick={() => onFocus(item)}>
      <span className="corridor-card__kicker">{item.meta}</span>
      <strong>{item.title}</strong>
      <span>{item.subtitle}</span>
    </button>
  )
}

function RandomWall({ chats, pageIndex, onFocus }: { chats: ApiChat[]; pageIndex: number; onFocus: (item: FocusItem) => void }) {
  return (
    <div className="corridor-wall-content">
      <div className="corridor-wall-heading">
        <span>left wall</span>
        <strong>Random chats · slab {pageIndex + 1}</strong>
      </div>
      <div className="corridor-card-grid corridor-card-grid--randoms">
        {chats.length === 0 ? (
          <div className="corridor-empty">No random chats on this wall yet.</div>
        ) : (
          chats.map((chat) => (
            <WallCard
              key={chat.id}
              side="left"
              item={{
                type: 'random',
                id: chat.id,
                title: chat.title || 'Untitled random',
                subtitle: getPreview(chat),
                detail: getPreview(chat),
                meta: `${timeAgo(chat.updatedAt)} · ${chat.messages?.length ?? 0} recent msgs`,
              }}
              onFocus={onFocus}
            />
          ))
        )}
      </div>
    </div>
  )
}

function ProjectsOverviewWall({ projects, onFocus }: { projects: ProjectLane[]; onFocus: (item: FocusItem) => void }) {
  return (
    <div className="corridor-wall-content">
      <div className="corridor-wall-heading">
        <span>right wall</span>
        <strong>Projects index</strong>
      </div>
      <div className="corridor-card-grid corridor-card-grid--projects">
        {projects.length === 0 ? (
          <div className="corridor-empty">No projects yet. Create one to give this wall structure.</div>
        ) : (
          projects.map((project) => (
            <WallCard
              key={project.id}
              side="right"
              item={{
                type: 'project',
                id: project.id,
                title: project.name,
                subtitle: project.description || project.lastChat?.title || 'Project space',
                detail: project.description || 'Open this project wall to inspect its chats.',
                meta: `${project.chatCount ?? project.chats.length} chats`,
              }}
              onFocus={onFocus}
            />
          ))
        )}
      </div>
    </div>
  )
}

function ProjectDetailWall({ project, onFocus }: { project: ProjectLane | undefined; onFocus: (item: FocusItem) => void }) {
  if (!project) {
    return (
      <div className="corridor-wall-content">
        <div className="corridor-wall-heading">
          <span>right wall</span>
          <strong>Project depth</strong>
        </div>
        <div className="corridor-empty">More project walls appear here as your archive grows.</div>
      </div>
    )
  }

  return (
    <div className="corridor-wall-content">
      <div className="corridor-wall-heading">
        <span>project wall</span>
        <strong>{project.name}</strong>
      </div>
      <p className="corridor-wall-note">{project.description || 'Chats inside this project are mounted as readable plaques on this wall.'}</p>
      <div className="corridor-card-grid corridor-card-grid--project-chats">
        {project.chats.length === 0 ? (
          <div className="corridor-empty">No chats in this project yet.</div>
        ) : (
          project.chats.slice(0, PROJECT_CHATS_PER_WALL).map((chat) => (
            <WallCard
              key={chat.id}
              side="right"
              item={{
                type: 'projectChat',
                id: chat.id,
                projectId: project.id,
                title: chat.title || 'Untitled project chat',
                subtitle: getPreview(chat),
                detail: getPreview(chat),
                meta: `${timeAgo(chat.updatedAt)} · ${chat.messages?.length ?? 0} recent msgs`,
              }}
              onFocus={onFocus}
            />
          ))
        )}
      </div>
    </div>
  )
}

export function Hallway() {
  const router = useRouter()
  const reducedMotion = useReducedMotion()
  const isFlat = reducedMotion === 'reduce'
  const [data, setData] = useState<HallwayData>({ randomChats: [], projects: [] })
  const [loading, setLoading] = useState(true)
  const [stage, setStage] = useState(0)
  const [focusItem, setFocusItem] = useState<FocusItem | null>(null)
  const [wheelLocked, setWheelLocked] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadHallway() {
      try {
        const [randomRes, projectsRes] = await Promise.all([
          fetch('/api/chats?isRandom=true&limit=80'),
          fetch('/api/projects?limit=30'),
        ])

        const randomJson = randomRes.ok ? await randomRes.json() : { chats: [] }
        const projectsJson = projectsRes.ok ? await projectsRes.json() : { projects: [] }
        const projects: ApiProject[] = projectsJson.projects || []

        const projectsWithChats = await Promise.all(
          projects.map(async (project) => {
            const chatRes = await fetch(`/api/chats?projectId=${project.id}&limit=12`)
            const chatJson = chatRes.ok ? await chatRes.json() : { chats: [] }
            return { ...project, chats: chatJson.chats || [] }
          })
        )

        if (!cancelled) {
          setData({ randomChats: randomJson.chats || [], projects: projectsWithChats })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadHallway()
    return () => {
      cancelled = true
    }
  }, [])

  const randomPages = useMemo(() => chunk(data.randomChats, RANDOMS_PER_WALL), [data.randomChats])
  const totalStages = Math.max(randomPages.length, data.projects.length + 1, 1)

  const moveStage = (direction: 1 | -1) => {
    setFocusItem(null)
    setStage((current) => Math.min(Math.max(current + direction, 0), totalStages - 1))
  }

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (loading || wheelLocked || Math.abs(event.deltaY) < 24) return
    setWheelLocked(true)
    moveStage(event.deltaY > 0 ? 1 : -1)
    window.setTimeout(() => setWheelLocked(false), 520)
  }

  const openFocusedItem = () => {
    if (!focusItem) return
    if (focusItem.type === 'project') router.push(`/projects/${focusItem.id}`)
    else router.push(`/chat/${focusItem.id}`)
  }

  return (
    <div className="hallway-wrapper corridor-wrapper" onWheel={handleWheel}>
      <div className="corridor-bg" />
      <div className="corridor-vanishing-line" />
      <div className="hallway-portal-glint" />

      <div className="corridor-depth-meter">
        <span>depth {stage + 1}/{totalStages}</span>
        <div>
          {Array.from({ length: totalStages }).map((_, index) => (
            <button
              key={index}
              aria-label={`Jump to hallway depth ${index + 1}`}
              className={index === stage ? 'active' : ''}
              onClick={() => {
                setFocusItem(null)
                setStage(index)
              }}
            />
          ))}
        </div>
      </div>

      <div className="corridor-scene" style={{ perspective: isFlat ? 'none' : '1300px' }}>
        <motion.div
          className="corridor-track"
          animate={{ z: isFlat ? 0 : stage * DEPTH_GAP }}
          transition={{ type: 'spring', stiffness: 72, damping: 22 }}
        >
          {Array.from({ length: totalStages }).map((_, index) => {
            const offsetZ = -index * DEPTH_GAP
            const isActive = index === stage
            const projectForStage = data.projects[index - 1]
            return (
              <div key={index} className={`corridor-slice ${isActive ? 'corridor-slice--active' : ''}`}>
                <motion.div
                  className="corridor-wall corridor-wall--left"
                  style={{ transform: isFlat ? undefined : `translate3d(-42vw, 0, ${offsetZ}px) rotateY(58deg)` }}
                  animate={{ opacity: Math.abs(index - stage) > 2 ? 0 : isActive ? 1 : 0.38 }}
                >
                  <RandomWall chats={randomPages[index] || []} pageIndex={index} onFocus={setFocusItem} />
                </motion.div>

                <motion.div
                  className="corridor-wall corridor-wall--right"
                  style={{ transform: isFlat ? undefined : `translate3d(42vw, 0, ${offsetZ}px) rotateY(-58deg)` }}
                  animate={{ opacity: Math.abs(index - stage) > 2 ? 0 : isActive ? 1 : 0.38 }}
                >
                  {index === 0 ? (
                    <ProjectsOverviewWall projects={data.projects} onFocus={setFocusItem} />
                  ) : (
                    <ProjectDetailWall project={projectForStage} onFocus={setFocusItem} />
                  )}
                </motion.div>
              </div>
            )
          })}
        </motion.div>
      </div>

      <motion.div
        className="corridor-center-copy"
        animate={{ opacity: focusItem ? 0.16 : 1, y: focusItem ? -16 : 0 }}
      >
        <span className="corridor-kicker">hacker zone</span>
        <h1>{stage === 0 ? 'You are inside.' : 'Keep moving through the archive.'}</h1>
        <p>
          Scroll forward or back. Random chats keep unfolding on the left; projects and their chat rooms unfold on the right.
        </p>
      </motion.div>

      <AnimatePresence>
        {focusItem && (
          <motion.div
            className={`corridor-focus corridor-focus--${focusItem.type === 'random' ? 'left' : 'right'}`}
            initial={{ opacity: 0, scale: 0.82, x: focusItem.type === 'random' ? -160 : 160, rotateY: focusItem.type === 'random' ? 18 : -18 }}
            animate={{ opacity: 1, scale: 1, x: 0, rotateY: 0 }}
            exit={{ opacity: 0, scale: 0.86, x: focusItem.type === 'random' ? -120 : 120 }}
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          >
            <button className="corridor-focus__close" onClick={() => setFocusItem(null)} aria-label="Close preview">
              ×
            </button>
            <span className="corridor-kicker">{focusItem.type === 'random' ? 'random chat pulled from left wall' : 'project wall pulled from right'}</span>
            <h2>{focusItem.title}</h2>
            <p>{focusItem.detail}</p>
            <div className="corridor-focus__meta">{focusItem.meta}</div>
            <button className="corridor-focus__open" onClick={openFocusedItem}>
              Open {focusItem.type === 'project' ? 'project' : 'chat'} →
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="corridor-controls">
        <button onClick={() => moveStage(-1)} disabled={stage === 0}>← back</button>
        <span>scroll / wheel to move through walls</span>
        <button onClick={() => moveStage(1)} disabled={stage >= totalStages - 1}>forward →</button>
      </div>

      {loading && <div className="corridor-loading">assembling corridor walls…</div>}
    </div>
  )
}
