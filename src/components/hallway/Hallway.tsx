'use client';

import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { HackerChatPanel } from '@/app/hall/components/chat/HackerChatPanel';

type WallSide = 'left' | 'right';

type FocusItem = {
  type: 'random' | 'projectChat' | 'projectEmpty';
  id: string;
  title: string;
  subtitle: string;
  detail: string;
  meta: string;
  accentColor: string;
  projectId?: string;
  projectName?: string;
};

type SelectedHallChat = {
  id: string;
  type: 'random' | 'project';
  projectId?: string;
  title: string;
  accentColor: string;
  projectName?: string;
};

type SelectedHallProject = {
  id: string;
  name: string;
  description: string;
  color: string;
  chatCount: number;
};

interface ApiMessage {
  content: string;
  role: string;
  createdAt: string;
}

interface ApiChat {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
  isRandom: boolean;
  projectId?: string | null;
  messages?: ApiMessage[];
}

interface ApiProject {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  chatCount?: number;
  memoryCount?: number;
  lastChat?: ApiChat | null;
}

interface ProjectLane extends ApiProject {
  chats: ApiChat[];
}

interface HallwayData {
  randomChats: ApiChat[];
  projects: ProjectLane[];
}

interface WallPage {
  key: string;
  side: WallSide;
  title: string;
  eyebrow: string;
  countLabel: string;
  accentColor: string;
  projectId?: string;
  projectName?: string;
  projectDescription?: string | null;
  items: FocusItem[];
}

interface WallMotionState {
  target: number;
  current: number;
  max: number;
}

interface ProjectCreatorState {
  open: boolean;
  name: string;
  color: string;
  isSaving: boolean;
  error?: string;
}

interface ProjectEditorState {
  id: string;
  name: string;
  description: string;
  color: string;
  chatCount: number;
  isSaving: boolean;
  error?: string;
}

const PAGE_WIDTH = 450;
const PAGE_GAP = 54;
const PAGE_STRIDE = PAGE_WIDTH + PAGE_GAP;
const RIB_GAP = 420;
const SECTION_COUNT = 11;
const PROJECT_PALETTE = ['#d8f45d', '#55d8ff', '#ff67c4', '#ffb24d', '#a78bfa', '#5eead4'];

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function chunk<T>(items: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    pages.push(items.slice(index, index + size));
  }
  return pages;
}

function getPreview(chat: ApiChat): string {
  const message = chat.messages?.[0];
  if (!message?.content) return 'No messages yet — an empty room waiting for a thought.';
  return message.content.replace(/\s+/g, ' ').slice(0, 180);
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function projectColor(project: ApiProject, index: number): string {
  return project.color || PROJECT_PALETTE[index % PROJECT_PALETTE.length];
}

function nextProjectColor(seed: number): string {
  return PROJECT_PALETTE[Math.abs(seed) % PROJECT_PALETTE.length];
}

function chatItem(chat: ApiChat, accentColor: string, project?: ProjectLane): FocusItem {
  return {
    type: project ? 'projectChat' : 'random',
    id: chat.id,
    projectId: project?.id,
    projectName: project?.name,
    title: chat.title || (project ? 'Untitled project chat' : 'Untitled random'),
    subtitle: getPreview(chat),
    detail: getPreview(chat),
    meta: project
      ? `${project.name} · ${timeAgo(chat.updatedAt)} · ${chat.messages?.length ?? 0} msgs`
      : `${timeAgo(chat.updatedAt)} · ${chat.messages?.length ?? 0} msgs`,
    accentColor
  };
}

function buildRandomPages(chats: ApiChat[]): WallPage[] {
  const source = chats.length ? chats : [];
  const pages = chunk(source, 6).map((pageChats, index) => ({
    key: `random-wall-${index}`,
    side: 'left' as const,
    title: `Random Chats Wall ${index + 1}`,
    eyebrow: 'Random Access Memory',
    countLabel: `${pageChats.length} chats`,
    accentColor: '#9ad933',
    items: pageChats.map((chat) => chatItem(chat, '#9ad933'))
  }));

  if (pages.length) return pages;

  return [
    {
      key: 'random-wall-empty',
      side: 'left',
      title: 'Random Chats Wall',
      eyebrow: 'Random Access Memory',
      countLabel: '0 chats',
      accentColor: '#9ad933',
      items: [
        {
          type: 'random',
          id: 'new',
          title: 'No random chats yet',
          subtitle: 'Create a random chat and it will become part of this left wall group.',
          detail: 'The left side of the hall is reserved for Random Chats grouped into wall pages.',
          meta: 'empty wall',
          accentColor: '#9ad933'
        }
      ]
    }
  ];
}

function buildProjectPages(projects: ProjectLane[]): WallPage[] {
  const pages = projects.flatMap((project, projectIndex) => {
    const accentColor = projectColor(project, projectIndex);
    const chatPages = chunk(project.chats, 6);

    if (!chatPages.length) {
      return [
        {
          key: `project-wall-${project.id}-empty`,
          side: 'right' as const,
          title: project.name,
          eyebrow: 'Project Wall',
          countLabel: '0 chats',
          accentColor,
          projectId: project.id,
          projectName: project.name,
          projectDescription: project.description,
          items: [
            {
              type: 'projectEmpty' as const,
              id: project.id,
              projectId: project.id,
              projectName: project.name,
              title: project.name,
              subtitle: project.description || 'Project wall waiting for its first chat.',
              detail: project.description || 'This right-side wall belongs only to this project.',
              meta: 'project wall · 0 chats',
              accentColor
            }
          ]
        }
      ];
    }

    return chatPages.map((pageChats, pageIndex) => ({
      key: `project-wall-${project.id}-${pageIndex}`,
      side: 'right' as const,
      title: project.name,
      eyebrow: pageIndex === 0 ? 'Project Wall' : `Project Wall ${pageIndex + 1}`,
      countLabel: `${pageChats.length} chats`,
      accentColor,
      projectId: project.id,
      projectName: project.name,
      projectDescription: project.description,
      items: pageChats.map((chat) => chatItem(chat, accentColor, project))
    }));
  });

  if (pages.length) return pages;

  return [
    {
      key: 'project-wall-empty',
      side: 'right',
      title: 'Project Walls',
      eyebrow: 'Project Index',
      countLabel: '0 chats',
      accentColor: '#d8f45d',
      items: [
        {
          type: 'projectEmpty',
          id: 'projects',
          title: 'No projects yet',
          subtitle: 'Create a project and its chats will live on their own color-coded wall.',
          detail: 'The right side of the hall is reserved for project-scoped chat walls.',
          meta: 'empty index',
          accentColor: '#d8f45d'
        }
      ]
    }
  ];
}

function CorridorSection({ z }: { z: number }) {
  return (
    <div
      className="corridor-section"
      style={{ '--z': `${z}px` } as CSSProperties}
      aria-hidden="true"
    >
      <div className="corridor-section__rib corridor-section__rib--left" />
      <div className="corridor-section__rib corridor-section__rib--right" />
      <div className="corridor-section__rib corridor-section__rib--ceiling" />
      <div className="corridor-section__rib corridor-section__rib--floor" />
      <div className="corridor-section__circuit corridor-section__circuit--left" />
      <div className="corridor-section__circuit corridor-section__circuit--right" />
    </div>
  );
}

function WallPanelCard({
  item,
  selected,
  onInspect
}: {
  item: FocusItem;
  selected: boolean;
  onInspect: (item: FocusItem) => void;
}) {
  return (
    <button
      className={`corridor-wall-panel ${selected ? 'corridor-wall-panel--selected' : ''}`}
      onClick={() => onInspect(item)}
      type="button"
      aria-pressed={selected}
    >
      <span className="corridor-wall-panel__icon" aria-hidden="true" />
      <span className="corridor-wall-panel__copy">
        <strong>{item.title}</strong>
        <span>{item.subtitle}</span>
      </span>
      <small>{item.meta}</small>
    </button>
  );
}

function HallWall({
  side,
  pages,
  offset,
  progress,
  activeSide,
  selectedChatId,
  onCreateRandomChat,
  onCreateProject,
  onCreateProjectChat,
  onEditProject,
  onInspect
}: {
  side: WallSide;
  pages: WallPage[];
  offset: number;
  progress: number;
  activeSide: WallSide | null;
  selectedChatId?: string | null;
  onCreateRandomChat: () => void;
  onCreateProject: () => void;
  onCreateProjectChat: (projectId: string) => void;
  onEditProject: (project: SelectedHallProject) => void;
  onInspect: (item: FocusItem) => void;
}) {
  const isPassive = activeSide !== null && activeSide !== side;

  return (
    <div className={`corridor-wall-zone corridor-wall-zone--${side} ${isPassive ? 'corridor-wall-zone--passive' : ''}`}>
      <div className="corridor-wall-surface" aria-hidden="true" />
      <div
        className="corridor-wall-mover"
        data-side={side}
        style={
          {
            '--wall-offset': `${-offset}px`,
            '--wall-progress': `${progress}%`
          } as CSSProperties
        }
      >
        {pages.map((page, index) => (
          <section
            key={page.key}
            className="corridor-wall-page"
            style={{ '--card-accent': page.accentColor } as CSSProperties}
            aria-label={`${side} wall page ${index + 1}: ${page.title}`}
          >
            <header className="corridor-wall-page__header">
              <span>{page.eyebrow}</span>
              <span>{page.countLabel}</span>
            </header>
            <div className="corridor-wall-page__title-row">
              <h2>{page.title}</h2>
              <div className="corridor-wall-page__actions">
                {side === 'left' ? (
                  <button type="button" onClick={onCreateRandomChat} title="Create random chat">
                    + random
                  </button>
                ) : (
                  <>
                    <button type="button" onClick={onCreateProject} title="Create project">
                      + project
                    </button>
                    {page.projectId && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            onEditProject({
                              id: page.projectId!,
                              name: page.projectName ?? page.title,
                              description: page.projectDescription ?? '',
                              color: page.accentColor,
                              chatCount: page.items.length
                            })
                          }
                          title={`Edit ${page.projectName ?? page.title}`}
                        >
                          edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onCreateProjectChat(page.projectId!)}
                          title={`Create chat in ${page.projectName ?? page.title}`}
                        >
                          + chat
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
              <span className="corridor-wall-page__page">wall {index + 1}</span>
            </div>
            <div className="corridor-wall-page__items">
              {page.items.map((item) => (
                <WallPanelCard
                  key={`${page.key}-${item.id}`}
                  item={item}
                  selected={selectedChatId === item.id}
                  onInspect={onInspect}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="corridor-wall-progress" aria-hidden="true">
        <span />
      </div>
    </div>
  );
}

function progressFor(offset: number, max: number): number {
  if (max <= 0) return 0;
  return Math.round((offset / max) * 100);
}

export function Hallway() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const leftRef = useRef<WallMotionState>({ target: 0, current: 0, max: 0 });
  const rightRef = useRef<WallMotionState>({ target: 0, current: 0, max: 0 });
  const [leftOffset, setLeftOffset] = useState(0);
  const [rightOffset, setRightOffset] = useState(0);
  const [leftMax, setLeftMax] = useState(0);
  const [rightMax, setRightMax] = useState(0);
  const [activeSide, setActiveSide] = useState<WallSide | null>(null);
  const [data, setData] = useState<HallwayData>({ randomChats: [], projects: [] });
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<SelectedHallChat | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectEditorState | null>(null);
  const [projectCreator, setProjectCreator] = useState<ProjectCreatorState>({
    open: false,
    name: '',
    color: PROJECT_PALETTE[0],
    isSaving: false
  });
  const [isHackerMode] = useState(true);

  const loadHallway = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const [randomRes, projectsRes] = await Promise.all([
        fetch('/api/chats?isRandom=true&limit=80', { signal }),
        fetch('/api/projects?limit=30', { signal })
      ]);

      const randomJson = randomRes.ok ? await randomRes.json() : { chats: [] };
      const projectsJson = projectsRes.ok ? await projectsRes.json() : { projects: [] };
      const projects: ApiProject[] = projectsJson.projects || [];

      const projectsWithChats = await Promise.all(
        projects.map(async (project) => {
          const chatRes = await fetch(`/api/chats?projectId=${project.id}&limit=80`, { signal });
          const chatJson = chatRes.ok ? await chatRes.json() : { chats: [] };
          return { ...project, chats: chatJson.chats || [] };
        })
      );

      setData({ randomChats: randomJson.chats || [], projects: projectsWithChats });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        console.error('[Hallway] Failed to load hallway data', error);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => loadHallway(controller.signal));

    const refresh = () => loadHallway();
    window.addEventListener('hallway-refresh', refresh);

    return () => {
      controller.abort();
      window.removeEventListener('hallway-refresh', refresh);
    };
  }, [loadHallway]);

  const leftPages = useMemo(() => buildRandomPages(data.randomChats), [data.randomChats]);
  const rightPages = useMemo(() => buildProjectPages(data.projects), [data.projects]);
  const sections = useMemo(() => Array.from({ length: SECTION_COUNT }, (_, index) => 360 - index * RIB_GAP), []);

  useEffect(() => {
    leftRef.current.max = Math.max(0, (leftPages.length - 1) * PAGE_STRIDE);
    rightRef.current.max = Math.max(0, (rightPages.length - 1) * PAGE_STRIDE);
    leftRef.current.target = clamp(leftRef.current.target, 0, leftRef.current.max);
    rightRef.current.target = clamp(rightRef.current.target, 0, rightRef.current.max);
    setLeftMax(leftRef.current.max);
    setRightMax(rightRef.current.max);
  }, [leftPages.length, rightPages.length]);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;

    const sideFromClientX = (clientX: number): WallSide => {
      const rect = element.getBoundingClientRect();
      return clientX - rect.left < rect.width / 2 ? 'left' : 'right';
    };

    const moveSide = (side: WallSide, delta: number) => {
      if (loading) return;
      const state = side === 'left' ? leftRef.current : rightRef.current;
      state.target = clamp(state.target + delta, 0, state.max);
      setActiveSide(side);
    };

    const eventStartedInsideChat = (target: EventTarget | null) =>
      target instanceof Element && Boolean(target.closest('.hacker-chat-panel, .hacker-project-dialog'));

    const handleWheel = (event: WheelEvent) => {
      if (eventStartedInsideChat(event.target)) return;
      event.preventDefault();
      moveSide(sideFromClientX(event.clientX), event.deltaY * 0.55);
    };

    let touchStartY = 0;
    let touchSide: WallSide = 'left';

    const handleTouchStart = (event: TouchEvent) => {
      if (eventStartedInsideChat(event.target)) return;
      const touch = event.touches[0];
      if (!touch) return;
      touchStartY = touch.clientY;
      touchSide = sideFromClientX(touch.clientX);
      setActiveSide(touchSide);
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (eventStartedInsideChat(event.target)) return;
      const touch = event.touches[0];
      if (!touch) return;
      event.preventDefault();
      const deltaY = touchStartY - touch.clientY;
      touchStartY = touch.clientY;
      moveSide(touchSide, deltaY * 1.8);
    };

    element.addEventListener('wheel', handleWheel, { passive: false });
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => {
      element.removeEventListener('wheel', handleWheel);
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
    };
  }, [loading]);

  useEffect(() => {
    const animate = () => {
      const ease = reducedMotion === 'reduce' ? 1 : 0.08;
      const left = leftRef.current;
      const right = rightRef.current;
      left.current = Math.abs(left.current - left.target) < 0.1 ? left.target : left.current + (left.target - left.current) * ease;
      right.current = Math.abs(right.current - right.target) < 0.1 ? right.target : right.current + (right.target - right.current) * ease;
      setLeftOffset(left.current);
      setRightOffset(right.current);
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [reducedMotion]);

  const routeToNormalExperience = (item: FocusItem) => {
    if (item.id === 'new') router.push('/chat');
    else if (item.id === 'projects') router.push('/projects');
    else if (item.type === 'projectEmpty') router.push(`/projects/${item.id}`);
    else router.push(`/chat/${item.id}`);
  };

  const createInlineChat = async (item: FocusItem) => {
    const createRes = await fetch('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: item.type === 'projectEmpty' ? 'New Project Chat' : 'New Chat',
        ...(item.projectId ? { projectId: item.projectId } : {})
      })
    });

    if (!createRes.ok) throw new Error('Failed to create chat');
    const chat: ApiChat = await createRes.json();
    window.dispatchEvent(new CustomEvent('sidebar-refresh'));
    await loadHallway();
    return chat;
  };

  const openCreatedChat = useCallback((chat: ApiChat, accentColor: string, projectName?: string) => {
    setSelectedChat({
      id: chat.id,
      type: chat.projectId ? 'project' : 'random',
      projectId: chat.projectId ?? undefined,
      title: chat.title || (chat.projectId ? 'New Project Chat' : 'New Chat'),
      accentColor,
      projectName
    });
  }, []);

  const createChatFromHall = useCallback(
    async (projectId?: string, accentColor = '#9ad933', projectName?: string) => {
      const createRes = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: projectId ? 'New Project Chat' : 'New Chat',
          ...(projectId ? { projectId } : {})
        })
      });

      if (!createRes.ok) throw new Error('Failed to create chat');
      const chat: ApiChat = await createRes.json();
      window.dispatchEvent(new CustomEvent('sidebar-refresh'));
      await loadHallway();
      openCreatedChat(chat, accentColor, projectName);
    },
    [loadHallway, openCreatedChat]
  );

  const handleCreateRandomChat = useCallback(() => {
    void createChatFromHall().catch((error) => console.error('[Hallway] Failed to create random chat', error));
  }, [createChatFromHall]);

  const handleCreateProject = useCallback(() => {
    setSelectedChat(null);
    setSelectedProject(null);
    setProjectCreator({
      open: true,
      name: '',
      color: nextProjectColor(data.projects.length),
      isSaving: false
    });
  }, [data.projects.length]);

  const submitProjectCreator = useCallback(() => {
    const trimmed = projectCreator.name.trim();
    if (!trimmed) {
      setProjectCreator((current) => ({ ...current, error: 'Name the project first.' }));
      return;
    }

    setProjectCreator((current) => ({ ...current, isSaving: true, error: undefined }));
    void Promise.resolve()
      .then(async () => {
        const projectRes = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmed, color: projectCreator.color })
        });

        if (!projectRes.ok) throw new Error('Failed to create project');
        window.dispatchEvent(new CustomEvent('sidebar-refresh'));
        await loadHallway();
        setProjectCreator({ open: false, name: '', color: nextProjectColor(data.projects.length + 1), isSaving: false });
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Failed to create project';
        setProjectCreator((current) => ({ ...current, isSaving: false, error: message }));
      });
  }, [data.projects.length, loadHallway, projectCreator.color, projectCreator.name]);

  const handleCreateProjectChat = useCallback(
    (projectId: string) => {
      const projectIndex = data.projects.findIndex((project) => project.id === projectId);
      const project = data.projects[projectIndex];
      const accentColor = project ? projectColor(project, projectIndex) : '#d8f45d';
      void createChatFromHall(projectId, accentColor, project?.name).catch((error) =>
        console.error('[Hallway] Failed to create project chat', error)
      );
    },
    [createChatFromHall, data.projects]
  );

  const handleEditProject = useCallback((project: SelectedHallProject) => {
    setSelectedChat(null);
    setProjectCreator((current) => ({ ...current, open: false, error: undefined }));
    setSelectedProject({ ...project, isSaving: false });
  }, []);

  const submitProjectEditor = useCallback(() => {
    if (!selectedProject) return;
    const trimmed = selectedProject.name.trim();
    if (!trimmed) {
      setSelectedProject((current) => (current ? { ...current, error: 'Project name cannot be empty.' } : current));
      return;
    }

    setSelectedProject((current) => (current ? { ...current, isSaving: true, error: undefined } : current));
    void Promise.resolve()
      .then(async () => {
        const projectRes = await fetch(`/api/projects/${selectedProject.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: trimmed,
            description: selectedProject.description,
            color: selectedProject.color
          })
        });

        if (!projectRes.ok) throw new Error('Failed to update project');
        window.dispatchEvent(new CustomEvent('sidebar-refresh'));
        await loadHallway();
        setSelectedProject((current) => (current ? { ...current, name: trimmed, isSaving: false } : current));
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Failed to update project';
        setSelectedProject((current) => (current ? { ...current, isSaving: false, error: message } : current));
      });
  }, [loadHallway, selectedProject]);

  const handleItemSelect = async (item: FocusItem) => {
    if (!isHackerMode) {
      routeToNormalExperience(item);
      return;
    }

    if (item.id === 'projects') {
      routeToNormalExperience(item);
      return;
    }

    try {
      setSelectedProject(null);
      const chat = item.id === 'new' || item.type === 'projectEmpty' ? await createInlineChat(item) : null;
      const chatId = chat?.id ?? item.id;
      setSelectedChat({
        id: chatId,
        type: item.type === 'random' ? 'random' : 'project',
        projectId: item.projectId ?? chat?.projectId ?? undefined,
        title: chat?.title ?? item.title,
        accentColor: item.accentColor,
        projectName: item.projectName
      });
    } catch (error) {
      console.error('[Hallway] Failed to open inline chat', error);
      routeToNormalExperience(item);
    }
  };

  const leftProgress = progressFor(leftOffset, leftMax);
  const rightProgress = progressFor(rightOffset, rightMax);

  return (
    <div ref={wrapperRef} className="hallway-wrapper corridor-wrapper">
      <div className="corridor-bg" />
      <div className="corridor-depth-fog" />
      <div className="corridor-vanishing-line" />
      <div className="hallway-portal-glint" />
      <div className="corridor-particles corridor-particles--near" />
      <div className="corridor-particles corridor-particles--far" />

      <div className="corridor-scene" style={{ '--left-travel': `${leftOffset}px`, '--right-travel': `${rightOffset}px` } as CSSProperties}>
        <div className="corridor-world">
          <div className="corridor-floor-grid" aria-hidden="true" />
          <div className="corridor-ceiling-grid" aria-hidden="true" />
          {sections.map((z) => (
            <CorridorSection key={z} z={z} />
          ))}
        </div>

        <HallWall
          side="left"
          pages={leftPages}
          offset={leftOffset}
          progress={leftProgress}
          activeSide={activeSide}
          selectedChatId={selectedChat?.id}
          onCreateRandomChat={handleCreateRandomChat}
          onCreateProject={handleCreateProject}
          onCreateProjectChat={handleCreateProjectChat}
          onEditProject={handleEditProject}
          onInspect={handleItemSelect}
        />
        <HallWall
          side="right"
          pages={rightPages}
          offset={rightOffset}
          progress={rightProgress}
          activeSide={activeSide}
          selectedChatId={selectedChat?.id}
          onCreateRandomChat={handleCreateRandomChat}
          onCreateProject={handleCreateProject}
          onCreateProjectChat={handleCreateProjectChat}
          onEditProject={handleEditProject}
          onInspect={handleItemSelect}
        />
      </div>

      <motion.div className="corridor-center-copy" animate={{ opacity: selectedChat || selectedProject ? 0.12 : 1 }}>
        <span className="corridor-kicker">hacker zone</span>
        <h1>{loading ? 'Loading wall memory.' : selectedChat ? 'Chat stream open.' : selectedProject ? 'Project wall selected.' : 'You are inside.'}</h1>
      </motion.div>

      <AnimatePresence>
        {projectCreator.open && (
          <motion.form
            className="hacker-project-dialog"
            style={{ '--project-draft-accent': projectCreator.color } as CSSProperties}
            initial={{ opacity: 0, y: 22, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 160, damping: 22 }}
            onSubmit={(event) => {
              event.preventDefault();
              submitProjectCreator();
            }}
            aria-label="Create project"
          >
            <div className="hacker-project-dialog__header">
              <span className="corridor-kicker">new project wall</span>
              <button
                type="button"
                onClick={() => setProjectCreator((current) => ({ ...current, open: false, error: undefined }))}
                aria-label="Close project creator"
              >
                ×
              </button>
            </div>

            <label className="hacker-project-dialog__field">
              <span>Project name</span>
              <input
                value={projectCreator.name}
                onChange={(event) =>
                  setProjectCreator((current) => ({ ...current, name: event.target.value, error: undefined }))
                }
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setProjectCreator((current) => ({ ...current, open: false, error: undefined }));
                  }
                }}
                placeholder="Name the wall..."
                autoFocus
              />
            </label>

            <div className="hacker-project-dialog__palette" aria-label="Project color">
              {PROJECT_PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={projectCreator.color === color ? 'hacker-project-dialog__swatch--active' : ''}
                  style={{ '--swatch-color': color } as CSSProperties}
                  onClick={() => setProjectCreator((current) => ({ ...current, color }))}
                  aria-label={`Use project color ${color}`}
                />
              ))}
            </div>

            {projectCreator.error && <p className="hacker-project-dialog__error">{projectCreator.error}</p>}

            <div className="hacker-project-dialog__actions">
              <button
                type="button"
                onClick={() => setProjectCreator((current) => ({ ...current, open: false, error: undefined }))}
                disabled={projectCreator.isSaving}
              >
                Cancel
              </button>
              <button type="submit" disabled={projectCreator.isSaving}>
                {projectCreator.isSaving ? 'Creating…' : 'Create wall'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedProject && (
          <motion.form
            className="hacker-project-dialog hacker-project-dialog--editor"
            style={{ '--project-draft-accent': selectedProject.color } as CSSProperties}
            initial={{ opacity: 0, y: 22, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 160, damping: 22 }}
            onSubmit={(event) => {
              event.preventDefault();
              submitProjectEditor();
            }}
            aria-label="Edit current project"
          >
            <div className="hacker-project-dialog__header">
              <span className="corridor-kicker">edit project wall · {selectedProject.chatCount} chats</span>
              <button type="button" onClick={() => setSelectedProject(null)} aria-label="Close project editor">
                ×
              </button>
            </div>

            <label className="hacker-project-dialog__field">
              <span>Project name</span>
              <input
                value={selectedProject.name}
                onChange={(event) =>
                  setSelectedProject((current) =>
                    current ? { ...current, name: event.target.value, error: undefined } : current
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setSelectedProject(null);
                }}
                placeholder="Project wall name..."
                autoFocus
              />
            </label>

            <label className="hacker-project-dialog__field">
              <span>Description</span>
              <textarea
                value={selectedProject.description}
                onChange={(event) =>
                  setSelectedProject((current) =>
                    current ? { ...current, description: event.target.value, error: undefined } : current
                  )
                }
                placeholder="Optional project notes..."
                rows={3}
              />
            </label>

            <div className="hacker-project-dialog__palette" aria-label="Project color">
              {PROJECT_PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={selectedProject.color === color ? 'hacker-project-dialog__swatch--active' : ''}
                  style={{ '--swatch-color': color } as CSSProperties}
                  onClick={() => setSelectedProject((current) => (current ? { ...current, color } : current))}
                  aria-label={`Use project color ${color}`}
                />
              ))}
            </div>

            {selectedProject.error && <p className="hacker-project-dialog__error">{selectedProject.error}</p>}

            <div className="hacker-project-dialog__actions">
              <button type="button" onClick={() => setSelectedProject(null)} disabled={selectedProject.isSaving}>
                Cancel
              </button>
              <button type="submit" disabled={selectedProject.isSaving}>
                {selectedProject.isSaving ? 'Saving…' : 'Save project'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedChat && (
          <HackerChatPanel
            key={selectedChat.id}
            chatId={selectedChat.id}
            title={selectedChat.title}
            accentColor={selectedChat.accentColor}
            projectName={selectedChat.projectName}
            onClose={() => setSelectedChat(null)}
            onDelete={(chatId) => {
              setSelectedChat((current) => (current?.id === chatId ? null : current));
              void loadHallway();
            }}
            onChatTitleChange={(chatId, title) => {
              setSelectedChat((current) => (current?.id === chatId ? { ...current, title } : current));
            }}
          />
        )}
      </AnimatePresence>

      <div className="corridor-travel-status">
        <span>{loading ? 'loading wall memory' : `active side: ${activeSide ?? 'none'}`}</span>
        <span>LEFT {leftProgress}% · RIGHT {rightProgress}%</span>
      </div>
    </div>
  );
}
