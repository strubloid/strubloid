'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { ProjectCard } from '@/components/ProjectCard';

interface Project {
  id: string;
  name: string;
  color: string;
  isStarred: boolean;
  chatCount: number;
  lastChat?: { title: string; updatedAt: string } | null;
}

const PROJECT_COLORS = [
  '#9ad933', // Green (default)
  '#ff6b6b', // Red
  '#4ecdc4', // Teal
  '#ffe66d', // Yellow
  '#95e1d3', // Mint
  '#f38181', // Coral
  '#aa96da', // Purple
  '#fcbad3', // Pink
];

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0]);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data.projects ?? []);
    } catch (error) {
      console.error('Failed to load projects', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateProject() {
    if (!newProjectName.trim()) return;

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName.trim(),
          color: newProjectColor,
        }),
      });

      if (!res.ok) throw new Error('Failed to create project');

      const project = await res.json();
      setProjects((prev) => [project, ...prev]);
      setNewProjectName('');
      setShowCreateForm(false);
      router.push(`/projects/${project.id}`);
    } catch (error) {
      console.error('Failed to create project', error);
    }
  }

  async function handleToggleStar(projectId: string, isStarred: boolean) {
    try {
      await fetch(`/api/projects/${projectId}/star`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred }),
      });

      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId ? { ...p, isStarred } : p
        )
      );
    } catch (error) {
      console.error('Failed to toggle star', error);
    }
  }

  return (
    <div className="flex h-screen">
      <Sidebar />

      <main className="flex-1 overflow-y-auto bg-[--color-bg]">
        <div className="max-w-4xl mx-auto p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold">Projects</h1>
              <p className="text-[--color-text-dim] text-sm mt-1">
                Organize your conversations into projects
              </p>
            </div>

            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Project
            </button>
          </div>

          {/* Create form */}
          {showCreateForm && (
            <div className="mb-8 p-4 rounded-lg border border-[--color-border] bg-[--color-bg-secondary]">
              <h3 className="font-semibold mb-4">Create New Project</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[--color-text-dim] mb-1">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="My Awesome Project"
                    className="w-full"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateProject();
                      if (e.key === 'Escape') setShowCreateForm(false);
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm text-[--color-text-dim] mb-2">
                    Color
                  </label>
                  <div className="flex gap-2">
                    {PROJECT_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewProjectColor(color)}
                        className={`w-8 h-8 rounded-full transition-transform ${
                          newProjectColor === color ? 'ring-2 ring-white scale-110' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleCreateProject}
                    className="btn-primary px-4 py-2 rounded-lg"
                    disabled={!newProjectName.trim()}
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="btn-secondary px-4 py-2 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Projects grid */}
          {isLoading ? (
            <div className="text-center py-12 text-[--color-text-dim]">
              Loading projects...
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4 opacity-20">📁</div>
              <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
              <p className="text-[--color-text-dim] mb-6">
                Create your first project to organize your conversations
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="btn-primary px-4 py-2 rounded-lg"
              >
                Create Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  {...project}
                  onToggleStar={(isStarred) => handleToggleStar(project.id, isStarred)}
                  onClick={() => router.push(`/projects/${project.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
