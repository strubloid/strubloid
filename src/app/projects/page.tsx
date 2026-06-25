'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProjectCard } from '@/components/ProjectCard';
import { ListSkeleton } from '@/components/LoadingSkeleton';

interface ChatPreview {
  id: string;
  title: string;
  updatedAt: string;
  messages: { id: string }[];
}

interface Project {
  id: string;
  name: string;
  color: string;
  isStarred: boolean;
  chatCount: number;
  lastChat?: { title: string; updatedAt: string } | null;
}

interface ProjectDetail extends Project {
  chats: ChatPreview[];
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

  // Accordion state
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [expandedProjectData, setExpandedProjectData] = useState<ProjectDetail | null>(null);
  const [loadingExpanded, setLoadingExpanded] = useState(false);

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
      handleProjectClick(project.id);
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

      if (expandedProjectData?.id === projectId) {
        setExpandedProjectData((prev) => prev ? { ...prev, isStarred } : null);
      }
    } catch (error) {
      console.error('Failed to toggle star', error);
    }
  }

  async function createChatInProject(projectId: string) {
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, title: 'New Chat' }),
      });
      if (!res.ok) throw new Error('Failed to create chat');
      const chat = await res.json();
      router.push(`/chat/${chat.id}`);
    } catch (error) {
      console.error('Failed to create chat', error);
    }
  }

  async function handleProjectClick(projectId: string) {
    if (expandedProjectId === projectId) {
      setExpandedProjectId(null);
      setExpandedProjectData(null);
      return;
    }

    setExpandedProjectId(projectId);
    setLoadingExpanded(true);
    setExpandedProjectData(null);

    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error('Failed to load project');
      const data = await res.json();
      setExpandedProjectData(data);
    } catch (error) {
      console.error('Failed to load project details', error);
      setExpandedProjectId(null);
    } finally {
      setLoadingExpanded(false);
    }
  }

  async function handleDeleteChat(chatId: string, projectId: string) {
    try {
      const res = await fetch(`/api/chats/${chatId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete chat');
      setExpandedProjectData((prev) =>
        prev && prev.id === projectId
          ? { ...prev, chats: prev.chats.filter((c) => c.id !== chatId), chatCount: prev.chatCount - 1 }
          : prev
      );
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, chatCount: Math.max(0, p.chatCount - 1) } : p))
      );
    } catch (error) {
      console.error('Failed to delete chat', error);
    }
  }

  return (
    <main className="flex-1 overflow-y-auto bg-[--color-bg]">
      <div className="mx-auto max-w-4xl p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Projects</h1>
            <p className="mt-1 text-sm text-[--color-text-dim]">
              Organize your conversations into projects
            </p>
          </div>

          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Project
          </button>
        </div>

        {/* Create form */}
        {showCreateForm && (
          <div className="mb-8 rounded-lg border border-[--color-border] bg-[--color-bg-secondary] p-4">
            <h3 className="mb-4 font-semibold">Create New Project</h3>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-[--color-text-dim]">
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
                <label className="mb-2 block text-sm text-[--color-text-dim]">
                  Color
                </label>
                <div className="flex gap-2">
                  {PROJECT_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewProjectColor(color)}
                      className={`h-8 w-8 rounded-full transition-transform ${
                        newProjectColor === color ? 'scale-110 ring-2 ring-white' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCreateProject}
                  className="btn-primary rounded-lg px-4 py-2"
                  disabled={!newProjectName.trim()}
                >
                  Create
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="btn-secondary rounded-lg px-4 py-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Projects list with accordion */}
        {isLoading ? (
          <ListSkeleton count={6} />
        ) : projects.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mb-4 text-6xl opacity-20">📁</div>
            <h3 className="mb-2 text-xl font-semibold">No projects yet</h3>
            <p className="mb-6 text-[--color-text-dim]">
              Create your first project to organize your conversations
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-primary rounded-lg px-4 py-2"
            >
              Create Project
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => {
              const isExpanded = expandedProjectId === project.id;
              return (
                <div key={project.id} className="overflow-hidden rounded-lg">
                  {/* Project card — clicking toggles expand */}
                  <ProjectCard
                    {...project}
                    onToggleStar={(isStarred) => handleToggleStar(project.id, isStarred)}
                    onClick={() => handleProjectClick(project.id)}
                  />

                  {/* Expanded chat list */}
                  {isExpanded && (
                    <div className="border-x border-b border-[--color-border] rounded-b-lg bg-[--color-bg-secondary] px-3 pb-3">
                      {loadingExpanded ? (
                        <div className="chat-item opacity-50">Loading chats...</div>
                      ) : expandedProjectData ? (
                        expandedProjectData.chats.length === 0 ? (
                          <div className="py-4 text-center">
                            <p className="mb-2 text-sm text-[--color-text-dim]">
                              No chats in this project yet
                            </p>
                            <button
                              onClick={() => createChatInProject(project.id)}
                              className="text-xs text-[--color-accent] hover:underline"
                            >
                              Create first chat
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-0.5 pt-2">
                            {expandedProjectData.chats.map((chat) => (
                              <div key={chat.id} className="group flex items-center gap-1">
                                <Link
                                  href={`/chat/${chat.id}`}
                                  className="chat-item block flex-1 truncate"
                                >
                                  {chat.title}
                                </Link>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    handleDeleteChat(chat.id, project.id);
                                  }}
                                  className="flex-shrink-0 rounded p-1 text-[--color-text-dim] opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                                  title="Delete chat"
                                  aria-label="Delete chat"
                                >
                                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        )
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
