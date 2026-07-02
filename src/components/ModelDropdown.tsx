'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface AiModel {
  modelId: string;
  name: string;
  isFree: boolean;
}

interface ModelDropdownProps {
  models: AiModel[];
  value: string;
  onChange: (modelId: string) => void;
  triggerClassName?: string;
  listClassName?: string;
  disabled?: boolean;
  accentColor?: string;
}

export function ModelDropdown({
  models,
  value,
  onChange,
  triggerClassName,
  listClassName,
  disabled,
  accentColor,
}: ModelDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [listPos, setListPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const rafRef = useRef<number>(0);

  const selectedModel = models.find((m) => m.modelId === value);

  // Compute position right before opening — runs in the same frame as setIsOpen(true)
  const open = useCallback(() => {
    if (disabled) return;
    rafRef.current = requestAnimationFrame(() => {
      const btn = containerRef.current?.querySelector('button');
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const LIST_HEIGHT = 320;
      const LIST_MIN_WIDTH = 220;
      const GAP = 6;

      // Flip above if not enough space below
      const flipUp = rect.bottom + LIST_HEIGHT + GAP > window.innerHeight;
      const top = flipUp ? rect.top - LIST_HEIGHT - GAP : rect.bottom + GAP;

      // Align left edge, clamp to viewport right edge
      const left = Math.min(rect.left, window.innerWidth - LIST_MIN_WIDTH - 8);

      setListPos({ top, left, width: rect.width });
      setIsOpen(true);
    });
  }, [disabled]);

  const close = useCallback(() => {
    setIsOpen(false);
    setHighlightedIndex(-1);
    setListPos(null);
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, close]);

  // Close on scroll / resize
  useEffect(() => {
    if (!isOpen) return;
    const handler = () => close();
    window.addEventListener('scroll', handler, { passive: true });
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler);
      window.removeEventListener('resize', handler);
    };
  }, [isOpen, close]);

  // Scroll highlighted into view
  useEffect(() => {
    if (!isOpen || highlightedIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-model-item]');
    (items[highlightedIndex] as HTMLElement)?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, isOpen]);

  // Cleanup raf on unmount
  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const handleSelect = useCallback(
    (modelId: string) => {
      onChange(modelId);
      close();
    },
    [onChange, close]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault();
          open();
          const currentIdx = models.findIndex((m) => m.modelId === value);
          setHighlightedIndex(currentIdx >= 0 ? currentIdx : 0);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((i) => Math.min(i + 1, models.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (highlightedIndex >= 0) handleSelect(models[highlightedIndex].modelId);
          break;
        case 'Escape':
          e.preventDefault();
          close();
          break;
      }
    },
    [isOpen, models, value, highlightedIndex, handleSelect, open, close]
  );

  const triggerStyle = accentColor
    ? ({ '--dropdown-accent': accentColor } as React.CSSProperties)
    : undefined;

  const listStyle = listPos
    ? ({
        '--dropdown-accent': accentColor ?? '#9ad933',
        top: listPos.top,
        left: listPos.left,
        width: listPos.width,
      } as React.CSSProperties)
    : ({ '--dropdown-accent': accentColor ?? '#9ad933' } as React.CSSProperties);

  return (
    <div ref={containerRef} className="model-dropdown" onKeyDown={handleKeyDown}>
      <button
        type="button"
        className={triggerClassName}
        onClick={open}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select AI model"
        title={selectedModel ? `${selectedModel.name}${selectedModel.isFree ? ' (Free)' : ''}` : 'Select AI model'}
        style={triggerStyle}
      >
        <span className="model-dropdown-label">
          {selectedModel ? (
            <>
              <span className="model-dropdown-name">{selectedModel.name}</span>
              {selectedModel.isFree && (
                <span className="model-dropdown-free">Free</span>
              )}
            </>
          ) : (
            <span className="model-dropdown-placeholder">Select model…</span>
          )}
        </span>
        <span className="model-dropdown-chevron" aria-hidden="true">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M2 3.5L5 6.5L8 3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {isOpen && listPos !== null && typeof document !== 'undefined'
        ? createPortal(
            <ul
              ref={listRef}
              className={`model-dropdown-list${listClassName ? ` ${listClassName}` : ''}`}
              role="listbox"
              aria-label="AI models"
              style={listStyle}
            >
              {models.map((model, idx) => (
                <li
                  key={model.modelId}
                  data-model-item
                  role="option"
                  aria-selected={model.modelId === value}
                  className={`model-dropdown-item${model.modelId === value ? ' selected' : ''}${idx === highlightedIndex ? ' highlighted' : ''}`}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(model.modelId); }}
                >
                  <span className="model-dropdown-item-name">{model.name}</span>
                  {model.isFree && (
                    <span className="model-dropdown-item-free">Free</span>
                  )}
                  {model.modelId === value && (
                    <span className="model-dropdown-item-check" aria-hidden="true">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path
                          d="M2 5.5L4 7.5L8 3"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  )}
                </li>
              ))}
            </ul>,
            document.body
          )
        : null}
    </div>
  );
}
