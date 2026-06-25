'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './CommandDeck.module.scss';

interface Project {
  id: string;
  name: string;
  color: string;
  chatCount: number;
  isStarred: boolean;
}

interface ChatResult {
  id: string;
  title: string;
  updatedAt: string;
}

interface CommandDeckProps {
  open: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export function CommandDeck({ open, onClose, initialQuery = '' }: CommandDeckProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [chatResults, setChatResults] = useState<ChatResult[]>([]);
  const [isCreating, setIsCreating] = useState(false);

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

  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery);
    fetch('/api/projects?limit=8')
      .then((res) => res.json())
      .then((data) => setProjects(data.projects ?? []))
      .catch(() => setProjects([]));
  }, [open, initialQuery]);

  useEffect(() => {
    if (!open || !query.trim()) {
      setChatResults([]);
      return;
    }

    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query.trim())}&limit=8`)
        .then((res) => res.json())
        .then((data) => setChatResults(data.chats ?? []))
        .catch(() => setChatResults([]));
    }, 150);

    return () => clearTimeout(timer);
  }, [open, query]);

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

  const commands = useMemo(() => [
    { icon: '✦', name: 'New random capture', desc: 'Start a fast inbox-style chat outside any project.', hotkey: 'N', run: createRandomChat },
    { icon: '🧠', name: 'Open project brain registry', desc: 'See all memory containers and their latest signals.', hotkey: 'P', run: () => router.push('/projects') },
    { icon: '⚙', name: 'Open systems console', desc: 'Tune providers, model routing, and memory hygiene.', hotkey: 'S', run: () => router.push('/settings') },
    { icon: '📋', name: 'Clean random memory', desc: 'Jump to the Randoms cleanup controls.', hotkey: 'R', run: () => router.push('/settings') },
  ], [router]);

  const filteredCommands = commands.filter((command) =>
    `${command.name} ${command.desc}`.toLowerCase().includes(query.toLowerCase())
  );
  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(query.toLowerCase())
  );

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
            autoFocus
            className={styles.input}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search commands, project brains, memory actions..."
          />
        </div>

        <div className={styles.grid}>
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <span>Actions</span>
              <span className={styles.kbd}>⌘K</span>
            </div>
            <div className={styles.list}>
              {filteredCommands.map((command) => (
                <button
                  key={command.name}
                  className={styles.action}
                  onClick={() => {
                    command.run();
                    if (command.name !== 'New random capture') onClose();
                  }}
                  disabled={isCreating && command.name === 'New random capture'}
                >
                  <span className={styles.icon}>{command.icon}</span>
                  <span>
                    <span className={styles.name}>{command.name}</span>
                    <span className={styles.desc}>{command.desc}</span>
                  </span>
                  <span className={styles.kbd}>{command.hotkey}</span>
                </button>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <span>Project brains</span>
              <span className={styles.kbd}>{projects.length}</span>
            </div>
            <div className={styles.statusGrid}>
              <div className={styles.status}>
                <span className={styles.value}>{projects.reduce((sum, p) => sum + p.chatCount, 0)}</span>
                <span className={styles.label}>project chats</span>
              </div>
              <div className={styles.status}>
                <span className={styles.value}>{projects.filter((p) => p.isStarred).length}</span>
                <span className={styles.label}>priority brains</span>
              </div>
            </div>
            <div className={styles.list}>
              {filteredProjects.map((project) => (
                <button
                  key={project.id}
                  className={styles.action}
                  onClick={() => {
                    onClose();
                    router.push(`/projects/${project.id}`);
                  }}
                >
                  <span className={styles.projectDot} style={{ color: project.color, backgroundColor: project.color }} />
                  <span>
                    <span className={styles.name}>{project.name}</span>
                    <span className={styles.desc}>{project.chatCount} chat{project.chatCount === 1 ? '' : 's'} in this memory container</span>
                  </span>
                  <span className={styles.kbd}>↵</span>
                </button>
              ))}
              {filteredProjects.length === 0 && (
                <div className={styles.desc}>No project brains match this search.</div>
              )}
            </div>
          </section>

          {query.trim() && (
            <section className={`${styles.panel} ${styles.fullPanel}`}>
              <div className={styles.panelHead}>
                <span>Global chat matches</span>
                <span className={styles.kbd}>{chatResults.length}</span>
              </div>
              <div className={styles.list}>
                {chatResults.map((chat) => (
                  <button
                    key={chat.id}
                    className={styles.action}
                    onClick={() => {
                      onClose();
                      router.push(`/chat/${chat.id}`);
                    }}
                  >
                    <span className={styles.icon}>⌕</span>
                    <span>
                      <span className={styles.name}>{chat.title}</span>
                      <span className={styles.desc}>Chat or message match · open thread</span>
                    </span>
                    <span className={styles.kbd}>↵</span>
                  </button>
                ))}
                {chatResults.length === 0 && (
                  <div className={styles.desc}>No chat/message matches yet.</div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
