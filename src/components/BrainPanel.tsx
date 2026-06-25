'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './BrainPanel.module.scss';

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

  const selectedProject = projects.find((p) => p.id === brainProjectId);

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.icon}>🧠</span>
        <span className={styles.title}>Brain Settings</span>
      </div>

      <p className={styles.hint}>
        This chat isn't in a project. Select a project to query its brain memories.
      </p>

      <div className={styles.selectorGroup}>
        <label className={styles.label} htmlFor="brain-project-select">
          Project to read memories from:
        </label>
        <select
          id="brain-project-select"
          className={styles.select}
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
        <div className={styles.status}>
          <span
            className={styles.dot}
            style={{ background: selectedProject.color }}
          />
          <span>
            Using memories from <strong>{selectedProject.name}</strong>
          </span>
        </div>
      )}

      {!brainProjectId && (
        <p className={styles.noSelection}>
          Brain is ON but no project selected. AI will not have any brain context.
        </p>
      )}
    </aside>
  );
}
