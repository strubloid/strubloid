'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface Project {
  id: string;
  name: string;
  color: string;
}

interface BrainPanelProps {
  brainProjectId: string | null;
  onSelectProject: (projectId: string | null) => void;
}

export function BrainPanel({ brainProjectId, onSelectProject }: BrainPanelProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const panelRef = useRef<HTMLElement>(null);

  const loadProjects = useCallback(async () => {
    if (loaded) return;
    try {
      const res = await fetch('/api/projects?limit=50');
      const data = await res.json();
      if (data.projects) {
        setProjects(data.projects);
        setLoaded(true);
      }
    } catch {
      // ignore
    }
  }, [loaded]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (collapsed) return;

    const collapseOnOutsideClick = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target)) return;
      setCollapsed(true);
    };

    document.addEventListener('pointerdown', collapseOnOutsideClick);
    return () => document.removeEventListener('pointerdown', collapseOnOutsideClick);
  }, [collapsed]);

  const selectedProject = projects.find((p) => p.id === brainProjectId);

  return (
    <aside ref={panelRef} className={`brain-panel ${collapsed ? 'brain-panel--collapsed' : ''}`}>
      <button
        type="button"
        className="brain-panel__toggle"
        onClick={(event) => {
          event.stopPropagation();
          setCollapsed((value) => !value);
        }}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Expand brain settings' : 'Collapse brain settings'}
        title={collapsed ? 'Expand brain settings' : 'Collapse brain settings'}
      >
        <svg
          className="brain-panel__toggle-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 4.5a3 3 0 0 0-3 3v.8A3.6 3.6 0 0 0 4 11.5c0 1.3.7 2.4 1.7 3A3.2 3.2 0 0 0 9 19.5" />
          <path d="M15 4.5a3 3 0 0 1 3 3v.8a3.6 3.6 0 0 1 2 3.2c0 1.3-.7 2.4-1.7 3a3.2 3.2 0 0 1-3.3 5" />
          <path d="M9 4.5v15" />
          <path d="M15 4.5v15" />
          <path d="M9 9h2" />
          <path d="M13 12h2" />
          <path d="M9 15h2" />
        </svg>
      </button>

      <div className="brain-panel__content mt-2" aria-hidden={collapsed}>
        <p className="brain-panel__hint">
          This chat isn't in a project. Select a project to query its brain memories.
        </p>
        <div className="brain-panel__selector-group">
          <label className="brain-panel__label" htmlFor="brain-project-select">
            Project to read memories from:
          </label>
          <select
            id="brain-project-select"
            className="brain-panel__select"
            value={brainProjectId ?? ''}
            onChange={(e) => onSelectProject(e.target.value || null)}
            onFocus={loadProjects}
          >
            <option value="">— None selected —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {selectedProject && (
          <div className="brain-panel__status">
            <span className="brain-panel__dot" style={{ background: selectedProject.color }} />
            <span>
              Using memories from <strong>{selectedProject.name}</strong>
            </span>
          </div>
        )}

        {!brainProjectId && (
          <p className="brain-panel__no-selection">
            Brain is ON but no project selected. AI will not have any brain context.
          </p>
        )}
      </div>
    </aside>
  );
}
