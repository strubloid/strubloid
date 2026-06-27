'use client';

import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type FocusItem =
  | {
      type: 'random';
      id: string;
      title: string;
      subtitle: string;
      detail: string;
      meta: string;
      accentColor?: string;
    }
  | {
      type: 'project';
      id: string;
      title: string;
      subtitle: string;
      detail: string;
      meta: string;
      accentColor?: string;
    }
  | {
      type: 'projectChat';
      id: string;
      projectId: string;
      title: string;
      subtitle: string;
      detail: string;
      meta: string;
      accentColor?: string;
      projectName?: string;
    };

type WallSide = 'left' | 'right';

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
  color?: string;
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

interface CorridorCard {
  key: string;
  side: WallSide;
  z: number;
  item: FocusItem;
}

const CARD_GAP = 600;
const RIB_GAP = 420;
const FAR_LIMIT = 2700;
const BEHIND_CAMERA_Z = 320;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  const progress = clamp((value - inMin) / (inMax - inMin), 0, 1);
  return outMin + (outMax - outMin) * progress;
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

function cardDepthStyle(
  z: number,
  travel: number
): {
  localZ: number;
  opacity: number;
  blur: number;
  scale: number;
  interactive: boolean;
} {
  const localZ = z + travel;

  if (localZ > BEHIND_CAMERA_Z) {
    return { localZ, opacity: 0, blur: 8, scale: 1.08, interactive: false };
  }

  const distance = Math.abs(localZ);
  const farFade = clamp(1 - distance / FAR_LIMIT, 0, 1);
  const nearWindow = localZ > -520 && localZ < 180 ? 1 : 0;
  const opacity = clamp(0.14 + farFade * 0.72 + nearWindow * 0.14, 0, 1);
  const blur = mapRange(distance, 180, FAR_LIMIT, 0, 4.5);
  const scale = mapRange(distance, 0, FAR_LIMIT, 1, 0.74);

  return { localZ, opacity, blur, scale, interactive: opacity > 0.12 && localZ < BEHIND_CAMERA_Z };
}

function cardVars(card: CorridorCard, travel: number, isNearest: boolean): CSSProperties {
  const depth = cardDepthStyle(card.z, travel);
  return {
    '--z': `${card.z}px`,
    '--depth-opacity': `${depth.opacity}`,
    '--depth-blur': `${depth.blur}px`,
    '--depth-scale': `${depth.scale}`,
    '--card-accent': card.item.accentColor || '#9ad933',
    pointerEvents: depth.interactive ? 'auto' : 'none'
  } as CSSProperties;
}

function WallTravelCard({
  card,
  travel,
  isNearest,
  onFocus
}: {
  card: CorridorCard;
  travel: number;
  isNearest: boolean;
  onFocus: (item: FocusItem) => void;
}) {
  const style = cardVars(card, travel, isNearest);

  return (
    <button
      className={`corridor-travel-card corridor-travel-card--${card.side} ${isNearest ? 'corridor-travel-card--nearest' : ''}`}
      style={style}
      onClick={() => onFocus(card.item)}
      aria-label={`Open ${card.item.title}`}
    >
      <span className="corridor-travel-card__bezel" aria-hidden="true" />
      {card.side === 'right' && (
        <span className="corridor-travel-card__project-color" aria-hidden="true" />
      )}
      <span className="corridor-travel-card__header">
        <span>
          {card.side === 'left'
            ? 'Random Access Memory'
            : card.item.type === 'project'
              ? 'Project Folder'
              : 'Project Chat'}
        </span>
        <span>{card.item.meta}</span>
      </span>
      <span className="corridor-travel-card__body">
        <span className="corridor-travel-card__icon" aria-hidden="true" />
        <span className="corridor-travel-card__copy">
          <strong>{card.item.title}</strong>
          <span>{card.item.subtitle}</span>
        </span>
      </span>
    </button>
  );
}

function ReadableNearestPreview({
  card,
  onInspect,
  onOpen
}: {
  card: CorridorCard | undefined;
  onInspect: (item: FocusItem) => void;
  onOpen: (item: FocusItem) => void;
}) {
  if (!card) return null;

  const wallLabel = (() => {
    if (card.side === 'left') return 'nearest random memory';
    if (card.item.type === 'project') return 'nearest project folder';
    if (card.item.type === 'projectChat' && 'projectName' in card.item) {
      return `${card.item.projectName || 'project'} chat signal`;
    }
    return 'nearest wall signal';
  })();

  return (
    <div
      className={`corridor-readable-preview corridor-readable-preview--${card.side}`}
      style={{ '--card-accent': card.item.accentColor || '#9ad933' } as CSSProperties}
    >
      <button className="corridor-readable-preview__content" onClick={() => onInspect(card.item)}>
        <span className="corridor-readable-preview__kicker">{wallLabel}</span>
        <strong>{card.item.title}</strong>
        <span>{card.item.detail}</span>
        <small>{card.item.meta}</small>
      </button>
      <button className="corridor-readable-preview__open" onClick={() => onOpen(card.item)}>
        Open →
      </button>
    </div>
  );
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

function buildCards(data: HallwayData): CorridorCard[] {
  const randomCards: CorridorCard[] = data.randomChats.slice(0, 18).map((chat, index) => ({
    key: `random-${chat.id}`,
    side: 'left',
    z: -index * CARD_GAP,
    item: {
      type: 'random',
      id: chat.id,
      title: chat.title || 'Untitled random',
      subtitle: getPreview(chat),
      detail: getPreview(chat),
      meta: `${timeAgo(chat.updatedAt)} · ${chat.messages?.length ?? 0} msgs`,
      accentColor: '#9ad933'
    }
  }));

  const rightItems: FocusItem[] = data.projects.flatMap((project) => {
    const projectColor = project.color || '#9ad933';
    const projectItem: FocusItem = {
      type: 'project',
      id: project.id,
      title: project.name,
      subtitle: project.description || project.lastChat?.title || 'Project space',
      detail: project.description || 'Open this project wall to inspect its chats.',
      meta: `${project.chatCount ?? project.chats.length} chats`,
      accentColor: projectColor
    };

    const chatItems: FocusItem[] = project.chats.slice(0, 5).map((chat) => ({
      type: 'projectChat',
      id: chat.id,
      projectId: project.id,
      title: chat.title || 'Untitled project chat',
      subtitle: getPreview(chat),
      detail: getPreview(chat),
      meta: `${project.name} · ${timeAgo(chat.updatedAt)}`,
      accentColor: projectColor,
      projectName: project.name
    }));

    return [projectItem, ...chatItems];
  });

  const projectCards: CorridorCard[] = rightItems.slice(0, 18).map((item, index) => ({
    key: `${item.type}-${item.id}-${index}`,
    side: 'right',
    z: -index * CARD_GAP - CARD_GAP * 0.5,
    item
  }));

  const fallbackCards: CorridorCard[] = [
    {
      key: 'empty-random',
      side: 'left',
      z: 0,
      item: {
        type: 'random',
        id: 'new',
        title: 'No random chats yet',
        subtitle: 'Create a random chat and it will become a wall-mounted memory display.',
        detail: 'This side of the corridor is reserved for Random Access Memory.',
        meta: 'empty wall',
        accentColor: '#9ad933'
      }
    },
    {
      key: 'empty-project',
      side: 'right',
      z: -CARD_GAP * 0.5,
      item: {
        type: 'project',
        id: 'projects',
        title: 'No projects yet',
        subtitle: 'Create a project and the right wall becomes your project index.',
        detail: 'This side of the corridor is reserved for project navigation.',
        meta: 'empty index',
        accentColor: '#9ad933'
      }
    }
  ];

  const cards = [...randomCards, ...projectCards];
  return cards.length ? cards : fallbackCards;
}

export function Hallway() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const targetTravelRef = useRef(0);
  const currentTravelRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const [travel, setTravel] = useState(0);
  const [data, setData] = useState<HallwayData>({ randomChats: [], projects: [] });
  const [loading, setLoading] = useState(true);
  const [focusItem, setFocusItem] = useState<FocusItem | null>(null);
  const [cameraTilt, setCameraTilt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadHallway() {
      try {
        const [randomRes, projectsRes] = await Promise.all([
          fetch('/api/chats?isRandom=true&limit=80'),
          fetch('/api/projects?limit=30')
        ]);

        const randomJson = randomRes.ok ? await randomRes.json() : { chats: [] };
        const projectsJson = projectsRes.ok ? await projectsRes.json() : { projects: [] };
        const projects: ApiProject[] = projectsJson.projects || [];

        const projectsWithChats = await Promise.all(
          projects.map(async (project) => {
            const chatRes = await fetch(`/api/chats?projectId=${project.id}&limit=12`);
            const chatJson = chatRes.ok ? await chatRes.json() : { chats: [] };
            return { ...project, chats: chatJson.chats || [] };
          })
        );

        if (!cancelled) {
          setData({ randomChats: randomJson.chats || [], projects: projectsWithChats });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadHallway();
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = useMemo(() => buildCards(data), [data]);
  const maxTravel = useMemo(() => {
    const farthest = Math.max(...cards.map((card) => Math.abs(card.z)), CARD_GAP * 4);
    return farthest + CARD_GAP;
  }, [cards]);

  const nearestCard = useMemo(() => {
    return cards.reduce<{ card: CorridorCard; distance: number } | null>((nearest, card) => {
      const localZ = card.z + travel;
      if (localZ > BEHIND_CAMERA_Z || localZ < -FAR_LIMIT) return nearest;
      const distance = Math.abs(localZ);
      if (!nearest || distance < nearest.distance) return { card, distance };
      return nearest;
    }, null)?.card;
  }, [cards, travel]);

  const nearestCardKey = nearestCard?.key;

  const sectionCount = Math.ceil((maxTravel + FAR_LIMIT) / RIB_GAP);
  const sections = useMemo(
    () => Array.from({ length: sectionCount }, (_, index) => 360 - index * RIB_GAP),
    [sectionCount]
  );

  useEffect(() => {
    targetTravelRef.current = clamp(targetTravelRef.current, 0, maxTravel);
  }, [maxTravel]);

  useEffect(() => {
    if (focusItem) {
      setCameraTilt(focusItem.type === 'random' ? -8 : 8);
    } else {
      setCameraTilt(0);
    }
  }, [focusItem]);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (loading) return;
      setFocusItem(null);
      targetTravelRef.current = clamp(targetTravelRef.current + event.deltaY * 1.2, 0, maxTravel);
    };

    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, [loading, maxTravel]);

  useEffect(() => {
    const animate = () => {
      const target = reducedMotion === 'reduce' ? targetTravelRef.current : targetTravelRef.current;
      const current = currentTravelRef.current;
      const next = reducedMotion === 'reduce' ? target : current + (target - current) * 0.08;
      currentTravelRef.current = Math.abs(next - target) < 0.1 ? target : next;
      setTravel(currentTravelRef.current);
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [reducedMotion]);

  const openItem = (item: FocusItem) => {
    if (item.type === 'project') router.push(`/projects/${item.id}`);
    else if (item.id === 'new') router.push('/chat');
    else if (item.id === 'projects') router.push('/projects');
    else router.push(`/chat/${item.id}`);
  };

  const openFocusedItem = () => {
    if (!focusItem) return;
    openItem(focusItem);
  };

  const travelProgress = maxTravel > 0 ? Math.round((travel / maxTravel) * 100) : 0;

  return (
    <div ref={wrapperRef} className="hallway-wrapper corridor-wrapper">
      <div className="corridor-bg" />
      <div className="corridor-depth-fog" />
      <div className="corridor-vanishing-line" />
      <div className="hallway-portal-glint" />
      <div className="corridor-particles corridor-particles--near" />
      <div className="corridor-particles corridor-particles--far" />

      <motion.div
        className="corridor-scene"
        style={{ '--travel': `${travel}px` } as CSSProperties}
        animate={{ rotateY: cameraTilt }}
        transition={{ type: 'spring', stiffness: 100, damping: 22 }}
      >
        <div className="corridor-world">
          <div className="corridor-floor-grid" aria-hidden="true" />
          <div className="corridor-ceiling-grid" aria-hidden="true" />
          {sections.map((z) => (
            <CorridorSection key={z} z={z} />
          ))}
          {cards.map((card) => (
            <WallTravelCard
              key={card.key}
              card={card}
              travel={travel}
              isNearest={nearestCardKey === card.key}
              onFocus={setFocusItem}
            />
          ))}
        </div>
      </motion.div>

      {nearestCard && !focusItem ? (
        <ReadableNearestPreview card={nearestCard} onInspect={setFocusItem} onOpen={openItem} />
      ) : (
        <motion.div className="corridor-center-copy" animate={{ opacity: focusItem ? 0.18 : 1 }}>
          <span className="corridor-kicker">hacker zone</span>
          <h1>You are inside.</h1>
        </motion.div>
      )}

      <AnimatePresence>
        {focusItem && (
          <motion.div
            className={`corridor-focus corridor-focus--${focusItem.type === 'random' ? 'left' : 'right'}`}
            initial={{
              opacity: 0,
              scale: 0.82,
              x: focusItem.type === 'random' ? -160 : 160,
              rotateY: focusItem.type === 'random' ? 18 : -18
            }}
            animate={{ opacity: 1, scale: 1, x: 0, rotateY: 0 }}
            exit={{ opacity: 0, scale: 0.86, x: focusItem.type === 'random' ? -120 : 120 }}
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          >
            <button
              className="corridor-focus__close"
              onClick={() => setFocusItem(null)}
              aria-label="Close preview"
            >
              ×
            </button>
            <span className="corridor-kicker">
              {focusItem.type === 'random'
                ? 'random memory pulled from left wall'
                : 'project signal pulled from right wall'}
            </span>
            <h2>{focusItem.title}</h2>
            <p>{focusItem.detail}</p>
            <div className="corridor-focus__meta">{focusItem.meta}</div>
            <button className="corridor-focus__open" onClick={openFocusedItem}>
              Open {focusItem.type === 'project' ? 'project' : 'chat'} →
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="corridor-travel-status">
        <span>{loading ? 'loading wall memory' : 'wheel to walk forward through the hall'}</span>
        <span>{travelProgress}% corridor travel</span>
      </div>
    </div>
  );
}
