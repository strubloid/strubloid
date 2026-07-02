'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { normalizeSearchText } from '@/lib/search/search-normalize';
import type { GlobalSearchResult } from '@/lib/search/search.types';
import styles from './CommandDeck.module.scss';

type ResultItem =
  | { kind: 'action'; icon: string; name: string; desc: string; run: () => void }
  | { kind: 'result'; result: GlobalSearchResult }
  | { kind: 'separator'; label: string };

interface CommandDeckProps {
  open: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export function CommandDeck({ open, onClose, initialQuery = '' }: CommandDeckProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GlobalSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      if (event.key === 'Escape' && open) onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
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
    if (open) {
      // small rAF to let the DOM paint first
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // ── 300ms debounced search for global records ──
  useEffect(() => {
    if (!open || !query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

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
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [open, query]);

  // ── Reset selection when results change ──
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, searchResults]);

  // ── Commands ──
  const commands = useMemo(() => [
    { icon: '✦', name: 'New random capture', desc: 'Start a fast inbox-style chat outside any project.', hotkey: 'N', run: createRandomChat },
    { icon: '🧠', name: 'Open project brain registry', desc: 'See all memory containers and their latest signals.', hotkey: 'P', run: () => router.push('/projects') },
    { icon: '⚙', name: 'Open systems console', desc: 'Tune providers, model routing, and memory hygiene.', hotkey: 'S', run: () => router.push('/settings') },
    { icon: '📋', name: 'Clean random memory', desc: 'Jump to the Randoms cleanup controls.', hotkey: 'R', run: () => router.push('/settings') },
  ], [router]);

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
      router.push(`/chat/${chat.id}`);
    } finally {
      setIsCreating(false);
    }
  }

  // ── Build flat results list ──
  const results: ResultItem[] = useMemo(() => {
    const list: ResultItem[] = [];
    const q = normalizeSearchText(query);

    // Filtered commands
    const matchedCommands = commands.filter((cmd) =>
      normalizeSearchText(`${cmd.name} ${cmd.desc}`).includes(q)
    );
    if (matchedCommands.length > 0) {
      list.push({ kind: 'separator', label: 'Actions' });
      for (const cmd of matchedCommands) {
        list.push({ ...cmd, kind: 'action' });
      }
    }

    const sectionLabels: Record<GlobalSearchResult['type'], string> = {
      project: 'Projects',
      chat: 'Chats',
      message: 'Chats',
      memory: 'Memory',
      model: 'Models & Routing',
    };
    const grouped = new Map<string, GlobalSearchResult[]>();
    for (const result of searchResults) {
      const label = sectionLabels[result.type];
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
      router.push(item.result.href);
    }
  }

  // ── Keyboard handlers ──
  const selectableCount = useMemo(
    () => results.filter((r) => r.kind !== 'separator').length,
    [results]
  );

  function handleInputKeyDown(e: React.KeyboardEvent) {
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
      if (idx >= 0 && selectable[idx]) {
        activateItem(selectable[idx]);
      }
    }
  }

  function scrollIntoView() {
    // small rAF to let the DOM update the highlight first
    requestAnimationFrame(() => {
      const active = resultsRef.current?.querySelector(`.${styles.active}`);
      active?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }

  // ── Map flat index to selectable index ──
  function selectableIndexOf(flatIndex: number): number {
    let count = 0;
    for (let i = 0; i <= flatIndex; i++) {
      if (results[i].kind !== 'separator') count++;
    }
    return count - 1;
  }

  if (!open) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Strubloid command deck" onMouseDown={onClose}>
      <div className={styles.deck} onMouseDown={(event) => event.stopPropagation()}>
        <header className={styles.header}>
          <div>
            <div className={styles.eyebrow}>cmd deck / cognitive operating layer</div>
            <h2 className={styles.title}>Operate Strubloid without hunting through pages.</h2>
            <p className={styles.copy}>
              Search project brains, start a random capture, jump into model routing, or inspect memory systems from one command surface.
            </p>
          </div>
          <button className={styles.close} onClick={onClose} aria-label="Close command deck">×</button>
        </header>

        <div className={styles.search}>
          <input
            ref={inputRef}
            className={styles.input}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search everything — commands, projects, chats..."
          />
        </div>

        <div className={styles.results} ref={resultsRef}>
          {results.length === 0 && query.trim() && isSearching && (
            <div className={styles.empty}>
              <div className={styles.emptyCode}>[ searching ]</div>
              <p className={styles.emptyDesc}>Scanning commands, projects, chats, memory, and routing...</p>
            </div>
          )}
          {results.length === 0 && query.trim() && !isSearching && (
            <div className={styles.empty}>
              <div className={styles.emptyCode}>[ no results ]</div>
              <p className={styles.emptyDesc}>Nothing matches &ldquo;{query}&rdquo; across commands, projects, chats, memory, or routing.</p>
            </div>
          )}
          {results.length === 0 && !query.trim() && (
            <div className={styles.empty}>
              <div className={styles.emptyCode}>[ type to search ]</div>
              <p className={styles.emptyDesc}>Start typing to filter commands, project brains, and chat history.</p>
            </div>
          )}
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
                key={`${item.kind}-${item.kind === 'action' ? item.name : item.result.id}`}
                className={`${styles.item} ${isActive ? styles.active : ''}`}
                onClick={() => activateItem(item)}
                onMouseEnter={() => setSelectedIndex(selIdx)}
                disabled={isCreating && item.kind === 'action' && item.name === 'New random capture'}
              >
                {item.kind === 'action' && (
                  <>
                    <span className={styles.iconSpan}>{item.icon}</span>
                    <span className={styles.itemBody}>
                      <span className={styles.itemName}>{item.name}</span>
                      <span className={styles.itemDesc}>{item.desc}</span>
                    </span>
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
                      <span className={styles.iconSpan}>{resultIcon(item.result.type)}</span>
                    )}
                    <span className={styles.itemBody}>
                      <span className={styles.itemName}>{item.result.title}</span>
                      <span className={styles.itemDesc}>{item.result.snippet ?? item.result.subtitle}</span>
                    </span>
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

function resultIcon(type: GlobalSearchResult['type']): string {
  if (type === 'chat' || type === 'message') return '⌕';
  if (type === 'memory') return '🧠';
  if (type === 'model') return '⚙';
  return '✦';
}
