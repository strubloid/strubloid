'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/components/LayoutShell/LayoutShell';
import styles from './HeaderBar.module.scss';

interface AiModel {
  modelId: string;
  name: string;
  isFree: boolean;
}

interface HeaderBarProps {
  selectedModelId?: string;
  onModelChange?: (modelId: string) => void;
  useAiBrain?: boolean;
  useRandomChats?: boolean;
  onToggleBrain?: () => void;
  onToggleRandomChats?: () => void;
  onOpenCommandDeck?: (query?: string) => void;
  hideSidebarToggle?: boolean;
  isHackerMode?: boolean;
  onToggleHackerMode?: () => void;
  onOpenHackerSettings?: () => void;
}

export function HeaderBar({
  selectedModelId,
  onModelChange,
  useAiBrain,
  useRandomChats,
  onToggleBrain,
  onToggleRandomChats,
  onOpenCommandDeck,
  hideSidebarToggle = false,
  isHackerMode = false,
  onToggleHackerMode,
  onOpenHackerSettings
}: HeaderBarProps) {
  const { toggle, setMobileOpen, mobileOpen } = useSidebar();
  const pathname = usePathname();
  const [models, setModels] = useState<AiModel[]>([]);
  const [mobileControlsExpanded, setMobileControlsExpanded] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  // Load models for the model selector
  useEffect(() => {
    fetch('/api/ai/models')
      .then((r) => r.json())
      .then((data) => {
        if (data.models) setModels(data.models);
      })
      .catch(() => {});
  }, []);

  // Only show model/toggle controls on chat pages
  const isChatPage = pathname.startsWith('/chat');

  // Determine if a model selector should be shown
  const showModelSelector = isChatPage && onModelChange;

  // Determine if brain/random toggles should be shown
  const showToggles = isChatPage && onToggleBrain !== undefined;

  return (
    <header className={styles.header}>
      {/* Mobile hamburger */}
      {!hideSidebarToggle && (
        <button
          className={styles.hamburger}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle sidebar"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            {mobileOpen ? (
              <path d="M6 18L18 6M6 6l12 12" />
            ) : (
              <>
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
              </>
            )}
          </svg>
        </button>
      )}

      {/* Desktop sidebar toggle */}
      {!hideSidebarToggle && (
        <button
          className={styles['sidebar-toggle-desktop']}
          onClick={toggle}
          title="Toggle sidebar mode"
          aria-label="Toggle sidebar mode"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 3v18" />
          </svg>
        </button>
      )}

      {/* Logo */}
      <Link href="/chat" className={styles.logo}>
        <div className={styles['logo-icon']}>S</div>
        <span className={styles['logo-text']}>Strubloid</span>
      </Link>

      <div className={styles.spacer} />

      <form
        className={styles.globalSearch}
        onSubmit={(event) => {
          event.preventDefault();
          onOpenCommandDeck?.(globalSearch.trim());
        }}
      >
        <span className={styles.searchGlyph}>⌕</span>
        <input
          value={globalSearch}
          onChange={(event) => setGlobalSearch(event.target.value)}
          placeholder="Search everything..."
          aria-label="Global search"
        />
        <span className={styles.searchKey}>⌘K</span>
      </form>

      <button
        className={styles.commandButton}
        onClick={() => onOpenCommandDeck?.(globalSearch.trim())}
        title="Open command deck (Ctrl/Cmd+K)"
        aria-label="Open command deck"
      >
        <span className={styles.commandMark}>⌘</span>
        <span className={styles.commandLabel}>Command</span>
        <span className={styles.commandKey}>K</span>
      </button>

      {/* Controls */}
      <div className={`${styles.controls} ${mobileControlsExpanded ? styles.expanded : ''}`}>
        {showModelSelector && models.length > 0 && (
          <select
            value={selectedModelId || ''}
            onChange={(e) => onModelChange(e.target.value)}
            className={styles['model-select']}
            title="Select AI model"
          >
            {models.map((model) => (
              <option key={model.modelId} value={model.modelId}>
                {model.name} {model.isFree ? '(Free)' : ''}
              </option>
            ))}
          </select>
        )}

        {showToggles && (
          <>
            <button
              onClick={onToggleBrain}
              className={`toggle-pill ${useAiBrain ? 'active-brain' : ''}`}
              title={useAiBrain ? 'AI Brain is active' : 'Enable AI Brain'}
            >
              🧠 {useAiBrain ? 'ON' : 'Brain'}
            </button>

            {onToggleRandomChats && (
              <button
                onClick={onToggleRandomChats}
                className={`toggle-pill ${useRandomChats ? 'active-random' : ''}`}
                title={
                  useRandomChats ? 'Random Chat summaries active' : 'Include random chat summaries'
                }
              >
                📋 {useRandomChats ? 'ON' : 'Randoms'}
              </button>
            )}
          </>
        )}

        {onToggleHackerMode && (
          <button
            type="button"
            className={`${styles.hackerSwitch} ${isHackerMode ? styles.hackerSwitchActive : ''}`}
            onClick={onToggleHackerMode}
            aria-pressed={isHackerMode}
            title={isHackerMode ? 'Exit hacker mode' : 'Enter hacker mode'}
          >
            <span className={styles.hackerSwitchLight} aria-hidden="true" />
            <span>Hacker Mode</span>
          </button>
        )}

        {isHackerMode ? (
          <button
            type="button"
            className={`${styles['header-btn']} ${styles.hackerSettingsButton}`}
            title="Open hacker settings console"
            aria-label="Open hacker settings console"
            onClick={onOpenHackerSettings}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span className={styles.hackerSettingsText}>SYS</span>
          </button>
        ) : (
          <Link href="/settings" className={styles['header-btn']} title="Settings">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>
        )}
      </div>
    </header>
  );
}
