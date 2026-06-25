'use client';

import { useEffect, useState } from 'react';
import { ProjectCard } from '@/components/ProjectCard';
import { ListSkeleton } from '@/components/LoadingSkeleton';

interface Project {
  id: string;
  name: string;
  color: string;
  isStarred: boolean;
  chatCount: number;
  lastChat?: { title: string; updatedAt: string } | null;
}

export default function StarredProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const res = await fetch('/api/projects?starred=true&limit=100');
      const data = await res.json();
      setProjects(data.projects ?? []);
    } catch (error) {
      console.error('Failed to load starred projects', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleToggleStar(projectId: string, isStarred: boolean) {
    try {
      await fetch(`/api/projects/${projectId}/star`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred }),
      });

      setProjects((prev) => prev.filter((p) => !(p.id === projectId && !isStarred)));
    } catch (error) {
      console.error('Failed to toggle star', error);
    }
  }

  return (
    <main className="flex-1 overflow-y-auto bg-[var(--color-bg)]">
      <div className="mx-auto max-w-4xl p-8">
        <div className="mb-8">
          <h1 className="mb-1 text-2xl font-bold">Starred Projects</h1>
          <p className="text-sm text-[var(--color-text-dim)]">
            Your pinned projects show up here for quick access
          </p>
        </div>

        {isLoading ? (
          <ListSkeleton count={4} />
        ) : projects.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mb-4 text-6xl opacity-20">⭐</div>
            <h3 className="mb-2 text-xl font-semibold">No starred projects</h3>
            <p className="mb-6 text-[var(--color-text-dim)]">
              Star a project from the projects list to pin it here
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                {...project}
                onToggleStar={(isStarred) => handleToggleStar(project.id, isStarred)}
                onClick={() => (window.location.href = `/projects/${project.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
