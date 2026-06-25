'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './ChatHeaderBar.module.scss';

interface ChatHeaderBarProps {
  title: string;
  isEditing: boolean;
  editedTitle: string;
  onEditedTitleChange: (value: string) => void;
  titleError: string | null;
  onStartEdit: () => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  isRandom: boolean;
  scrollContainerRef: React.RefObject<HTMLElement | null>;
}

export function ChatHeaderBar({
  title,
  isEditing,
  editedTitle,
  onEditedTitleChange,
  titleError,
  onStartEdit,
  onSave,
  onCancelEdit,
  onDelete,
  isRandom,
  scrollContainerRef,
}: ChatHeaderBarProps) {
  const [hidden, setHidden] = useState(false);
  const lastScrollYRef = useRef(0);
  const tickingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts, without scrolling
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus({ preventScroll: true });
    }
  }, [isEditing]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;

      requestAnimationFrame(() => {
        const currentScrollY = el.scrollTop;
        const isAtTop = currentScrollY < 10;
        const isNearBottom = currentScrollY > el.scrollHeight - el.clientHeight - 20;

        // Always show at top or bottom
        if (isAtTop || isNearBottom) {
          setHidden(false);
        } else if (currentScrollY > lastScrollYRef.current + 5) {
          setHidden(true);   // scrolling down past threshold
        } else if (currentScrollY < lastScrollYRef.current - 5) {
          setHidden(false);  // scrolling up past threshold
        }

        lastScrollYRef.current = currentScrollY;
        tickingRef.current = false;
      });
    };

    lastScrollYRef.current = el.scrollTop;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [scrollContainerRef]);

  return (
    <header className={`${styles.header} ${hidden ? styles.hidden : ''}`}>
      <div className={styles.titleSection}>
        {isEditing ? (
          <div className={styles.editGroup}>
            <input
              ref={inputRef}
              type="text"
              value={editedTitle}
              onChange={(e) => onEditedTitleChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onSave();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  onCancelEdit();
                }
              }}
              onBlur={onCancelEdit}
              maxLength={200}
              className={styles.editInput}
              aria-label="Edit chat title"
            />
            {titleError && (
              <p className={styles.error} role="alert">
                {titleError}
              </p>
            )}
          </div>
        ) : (
          <div className={styles.titleRow}>
            <h1
              className={styles.title}
              title={title}
              onDoubleClick={onStartEdit}
            >
              {title}
            </h1>
            <button
              onClick={onStartEdit}
              className={styles.iconBtn}
              title="Rename chat"
              aria-label="Rename chat"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536M9 13l6-6 3 3-6 6H9v-3zM4 20h4l10-10-4-4L4 16v4z"
                />
              </svg>
            </button>
          </div>
        )}
        <p className={styles.subtitle}>
          {isRandom ? 'Random Chat' : 'Project Chat'}
        </p>
      </div>

      <div className={styles.actions}>
        <button
          onClick={onDelete}
          className={styles.deleteBtn}
          title="Delete chat"
          aria-label="Delete chat"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
