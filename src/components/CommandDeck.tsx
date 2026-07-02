'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { normalizeSearchText } from '@/lib/search/search-normalize';
import type { GlobalSearchResult } from '@/lib/search/search.types';
import styles from './CommandDeck.module.scss';

type CommandAction = {
  kind: 'action';
  icon: string;
  name: string;
  desc: string;
  command: string;
  keywords: string[];
  defaultVisible: boolean;
  run: () => void;
};

type ResultItem = CommandAction | { kind: 'result'; result: GlobalSearchResult } | { kind: 'separator'; label: string };

interface CommandDeckProps {
  open: boolean;
  onClose: () => void;
  initialQuery?: string;
  isHackerMode?: boolean;
  onOpenSettings?: () => void;
}

export function CommandDeck({
  open,
  onClose,
  initialQuery = '',
  isHackerMode = false,
  onOpenSettings,
}: CommandDeckProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GlobalSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Ctrl/Cmd+K + Escape ─────────────
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isCommand = event.metaKey || event.ctrlKey;
      if (isCommand && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (open) onClose();
        else window.dispatchEvent(new CustomEvent('strubloid-open-command-deck'));
      }
      if (event.key === 'Escape' && open) {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    }
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [open, onClose]);

  // ── Open / close lifecycle ──────────
  useEffect(() => {
    if (!open) {
      setQuery('');
      setSearchResults([]);
      setSelectedIndex(0);
      return;
    }
    setQuery(initialQuery);
  }, [open, initialQuery]);

  // Focus input when opening
  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  // ── 300ms debounced search for global records ──
  useEffect(() => {
    if (!open || !query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    let cancelled = false;
    setIsSearching(true);
    debounceTimerRef.current = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query.trim())}&limit=12`)
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled) setSearchResults(data.results ?? []);
        })
        .catch(() => {
          if (!cancelled) setSearchResults([]);
        })
        .finally(() => {
          if (!cancelled) setIsSearching(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [open, query]);

  // ── Reset selection when results change ──
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, searchResults]);

  const openSettings = useCallback(() => {
    if (onOpenSettings) {
      onOpenSettings();
      return;
    }
    router.push('/settings');
  }, [onOpenSettings, router]);

  const openBrainRegistry = useCallback(() => {
    router.push('/projects');
  }, [router]);

  async function createRandomChat() {
    setIsCreating(true);
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat', isRandom: true }),
      });
      const chat = await res.json();
      window.dispatchEvent(new CustomEvent('sidebar-refresh'));
      onClose();

      if (isHackerMode) {
        window.dispatchEvent(
          new CustomEvent('strubloid-open-hacker-chat', {
            detail: { chatId: chat.id, title: chat.title, isRandom: true },
          })
        );
        return;
      }

      router.push(`/chat/${chat.id}`);
    } finally {
      setIsCreating(false);
    }
  }

  // ── Commands ──
  const commands: CommandAction[] = useMemo(
    () => [
      {
        kind: 'action',
        icon: '✦',
        name: 'New random capture',
        desc: 'Start a fast inbox-style chat outside any project.',
        command: 'capture.new',
        keywords: ['new', 'random', 'capture', 'chat', 'inbox'],
        defaultVisible: true,
        run: createRandomChat,
      },
      {
        kind: 'action',
        icon: '🧠',
        name: 'Open brain registry',
        desc: 'Browse project brains, memory containers, and latest signals.',
        command: 'brain.open',
        keywords: ['brain', 'registry', 'project', 'projects', 'memory'],
        defaultVisible: true,
        run: openBrainRegistry,
      },
      {
        kind: 'action',
        icon: '⚙',
        name: 'Settings',
        desc: 'Open Strubloid settings, providers, model routing, memory, and project preferences.',
        command: 'settings.open',
        keywords: ['settings', 'sys', 'system', 'providers', 'models', 'routing', 'preferences'],
        defaultVisible: true,
        run: openSettings,
      },
      {
        kind: 'action',
        icon: '📋',
        name: 'Clean random memory',
        desc: 'Review and compact random chat memory.',
        command: 'memory.clean',
        keywords: ['clean', 'compact', 'random', 'memory', 'summaries'],
        defaultVisible: false,
        run: openSettings,
      },
    ],
    [openBrainRegistry, openSettings, isHackerMode]
  );

  // ── Build flat results list ──
  const results: ResultItem[] = useMemo(() => {
    const list: ResultItem[] = [];
    const q = normalizeSearchText(query);

    const matchedCommands = q
      ? commands.filter((cmd) => normalizeSearchText(`${cmd.name} ${cmd.desc} ${cmd.command} ${cmd.keywords.join(' ')}`).includes(q))
      : commands.filter((cmd) => cmd.defaultVisible);

    if (matchedCommands.length > 0) {
      list.push({ kind: 'separator', label: 'Actions' });
      for (const cmd of matchedCommands) list.push(cmd);
    }

    const grouped = new Map<string, GlobalSearchResult[]>();
    for (const result of searchResults) {
      const label = resultSectionLabel(result);
      grouped.set(label, [...(grouped.get(label) ?? []), result]);
    }
    for (const [label, items] of grouped) {
      list.push({ kind: 'separator', label });
      for (const result of items) list.push({ kind: 'result', result });
    }

    return list;
  }, [query, commands, searchResults]);

  // ── Navigate to an item ──
  function activateItem(item: ResultItem) {
    if (item.kind === 'separator') return;
    if (item.kind === 'action') {
      item.run();
      if (item.name !== 'New random capture') onClose();
      return;
    }
    onClose();
    if (item.kind === 'result') {
      if (isHackerMode && (item.result.type === 'chat' || item.result.type === 'message')) {
        const chatId = getResultChatId(item.result);
        if (chatId) {
          window.dispatchEvent(
            new CustomEvent('strubloid-open-hacker-chat', {
              detail: {
                chatId,
                title: item.result.title,
                projectId: item.result.metadata?.projectId,
                isRandom: item.result.metadata?.isRandom,
              },
            })
          );
          return;
        }
      }
      router.push(item.result.href);
    }
  }

  // ── Keyboard handlers ──
  const selectableCount = useMemo(() => results.filter((r) => r.kind !== 'separator').length, [results]);

  function handleInputKeyDown(e: React.KeyboardEvent) {
    e.stopPropagation();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, selectableCount - 1));
      scrollIntoView();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
      scrollIntoView();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selectable = results.filter((r) => r.kind !== 'separator');
      const idx = Math.min(selectedIndex, selectable.length - 1);
      if (idx >= 0 && selectable[idx]) activateItem(selectable[idx]);
    }
  }

  function scrollIntoView() {
    requestAnimationFrame(() => {
      const active = resultsRef.current?.querySelector(`.${styles.active}`);
      active?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }

  function selectableIndexOf(flatIndex: number): number {
    let count = 0;
    for (let i = 0; i <= flatIndex; i++) {
      if (results[i].kind !== 'separator') count++;
    }
    return count - 1;
  }

  if (!open) return null;

  const hasTypedQuery = Boolean(query.trim());
  const hasOnlyDefaultActions = !hasTypedQuery;

  return (
    <div
      className={`${styles.overlay} ${isHackerMode ? styles.hackerOverlay : styles.normalOverlay}`}
      role="dialog"
      aria-modal="true"
      aria-label="Strubloid command deck"
      onMouseDown={onClose}
    >
      <div className={styles.deck} data-mode={isHackerMode ? 'hacker' : 'normal'} onMouseDown={(event) => event.stopPropagation()}>
        <header className={styles.header}>
          <div>
            <div className={styles.eyebrow}>CMD DECK / COGNITIVE OPERATING LAYER</div>
            <h2 className={styles.title}>Operate Strubloid without hunting through pages.</h2>
            <p className={styles.copy}>Search chats, project brains, memory, settings, and actions from one command surface.</p>
          </div>
          <div className={styles.statusCluster} aria-hidden="true">
            <span>READY</span>
            <span>{isHackerMode ? 'HACKER' : 'LOCAL'}</span>
          </div>
          <button className={styles.close} onClick={onClose} aria-label="Close command deck">
            ×
          </button>
        </header>

        <div className={styles.search}>
          <div className={styles.promptWrap}>
            <span className={styles.promptPrefix}>{hasTypedQuery ? '>' : '/'}</span>
            <input
              ref={inputRef}
              className={styles.input}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="search actions, projects, chats, memory..."
            />
          </div>
          <div className={styles.searchMeta}>
            <span>{isSearching ? 'SCANNING SIGNALS' : hasTypedQuery ? 'FILTER ACTIVE' : 'DEFAULT ACTIONS'}</span>
            <span>Actions · Random chats · Project chats · Project brains · Memory · Settings</span>
          </div>
        </div>

        <div className={styles.results} ref={resultsRef}>
          {results.length === 0 && hasTypedQuery && isSearching && (
            <div className={styles.empty}>
              <div className={styles.emptyCode}>[ searching ]</div>
              <p className={styles.emptyDesc}>Scanning commands, projects, chats, memory, and routing...</p>
            </div>
          )}
          {results.length === 0 && hasTypedQuery && !isSearching && (
            <div className={styles.empty}>
              <div className={styles.emptyCode}>No signal found.</div>
              <p className={styles.emptyDesc}>Try a project name, chat title, memory keyword, or command.</p>
            </div>
          )}
          {hasOnlyDefaultActions && <div className={styles.defaultHint}>Default command surface · type to search every indexed signal.</div>}
          {results.map((item, flatIdx) => {
            if (item.kind === 'separator') {
              return (
                <div key={`sep-${item.label}`} className={styles.separator}>
                  <span>{item.label}</span>
                </div>
              );
            }

            const selIdx = selectableIndexOf(flatIdx);
            const isActive = selIdx === selectedIndex;

            return (
              <button
                key={`${item.kind}-${item.kind === 'action' ? item.command : item.result.id}`}
                className={`${styles.item} ${isActive ? styles.active : ''}`}
                data-selected={isActive}
                onClick={() => activateItem(item)}
                onMouseEnter={() => setSelectedIndex(selIdx)}
                disabled={isCreating && item.kind === 'action' && item.name === 'New random capture'}
              >
                {item.kind === 'action' && (
                  <>
                    <span className={styles.iconSpan}>{item.icon}</span>
                    <span className={styles.itemBody}>
                      <span className={styles.itemName}><Highlight value={item.name} query={query} /></span>
                      <span className={styles.itemDesc}>{item.desc}</span>
                    </span>
                    <span className={styles.badge}>{item.command}</span>
                    <span className={styles.kbd}>⏎</span>
                  </>
                )}
                {item.kind === 'result' && (
                  <>
                    {item.result.type === 'project' ? (
                      <span
                        className={styles.projectDot}
                        style={{
                          color: String(item.result.metadata?.color ?? '#9ad933'),
                          backgroundColor: String(item.result.metadata?.color ?? '#9ad933'),
                        }}
                      />
                    ) : (
                      <span className={styles.iconSpan}>{resultIcon(item.result)}</span>
                    )}
                    <span className={styles.itemBody}>
                      <span className={styles.itemName}><Highlight value={item.result.title} query={query} /></span>
                      <span className={styles.itemDesc}><Highlight value={item.result.snippet ?? item.result.subtitle ?? ''} query={query} /></span>
                    </span>
                    <span className={styles.badge}>{resultBadge(item.result)}</span>
                    <span className={styles.kbd}>⏎</span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Highlight({ value, query }: { value: string; query: string }) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return <>{value}</>;

  const normalizedValue = normalizeSearchText(value);
  const index = normalizedValue.indexOf(normalizedQuery);
  if (index < 0) return <>{value}</>;

  const before = value.slice(0, index);
  const match = value.slice(index, index + query.trim().length);
  const after = value.slice(index + query.trim().length);
  return (
    <>
      {before}<mark className={styles.match}>{match}</mark>{after}
    </>
  );
}

function resultSectionLabel(result: GlobalSearchResult): string {
  if (result.type === 'project') return 'Project brains';
  if (result.type === 'memory') return 'Memory';
  if (result.type === 'model') return 'Settings';
  if (result.type === 'chat' || result.type === 'message') {
    return result.metadata?.isRandom === false ? 'Project chats' : 'Random chats';
  }
  return 'Results';
}

function resultIcon(result: GlobalSearchResult): string {
  if (result.type === 'chat' || result.type === 'message') return result.metadata?.isRandom === false ? '◆' : '⌕';
  if (result.type === 'memory') return '🧠';
  if (result.type === 'model') return '⚙';
  return '✦';
}

function resultBadge(result: GlobalSearchResult): string {
  if (result.type === 'project') return 'PROJECT';
  if (result.type === 'memory') return 'MEMORY';
  if (result.type === 'model') return 'SYS';
  if (result.type === 'chat' || result.type === 'message') return result.metadata?.isRandom === false ? 'PROJECT' : 'LOCAL';
  return 'SIGNAL';
}

function getResultChatId(result: GlobalSearchResult): string | null {
  if (result.type === 'chat') return result.id;
  if (result.type === 'message' && typeof result.metadata?.chatId === 'string') return result.metadata.chatId;
  return null;
}
