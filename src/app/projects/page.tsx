'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ListSkeleton } from '@/components/LoadingSkeleton';
import { Badge, BentoCard, BentoGrid, Button, EmptyState } from '@/components/ui';

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
  '#9ad933',
  '#ff6b6b',
  '#4ecdc4',
  '#ffe66d',
  '#95e1d3',
  '#f38181',
  '#aa96da',
  '#fcbad3',
];

function formatDate(value?: string | null) {
  if (!value) return 'No recent signal';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0]);

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
      window.dispatchEvent(new CustomEvent('sidebar-refresh'));
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
        prev.map((p) => (p.id === projectId ? { ...p, isStarred } : p))
      );
      window.dispatchEvent(new CustomEvent('sidebar-refresh'));

      if (expandedProjectData?.id === projectId) {
        setExpandedProjectData((prev) => (prev ? { ...prev, isStarred } : null));
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
        prev.map((p) =>
          p.id === projectId ? { ...p, chatCount: Math.max(0, p.chatCount - 1) } : p
        )
      );
    } catch (error) {
      console.error('Failed to delete chat', error);
    }
  }

  const totalChats = projects.reduce((sum, p) => sum + p.chatCount, 0);
  const starredProjects = projects.filter((p) => p.isStarred);
  const recentProjects = [...projects]
    .filter((p) => p.lastChat?.updatedAt)
    .sort(
      (a, b) =>
        new Date(b.lastChat!.updatedAt).getTime() -
        new Date(a.lastChat!.updatedAt).getTime()
    )
    .slice(0, 4);

  return (
    <main className="cw-page flex-1 overflow-y-auto">
      <div className="cw-container">
        <div className="cw-shell">
          <header className="cw-section">
            <div className="cw-eyebrow">workspace cockpit</div>
            <h1 className="cw-title">Your AI Command Center</h1>
            <p className="cw-subtitle">
              Projects are memory containers. Star critical contexts, spawn chats pre-wired to the right brain,
              and watch recent signals flare across your cockpit dashboard.
            </p>
            <div className="cw-actions">
              <Button variant="primary" onClick={() => setShowCreateForm((v) => !v)}>
                + New memory container
              </Button>
              <Button href="/chat">Open random capture</Button>
              <Button href="/settings">Tune model routing</Button>
            </div>
          </header>

          <section className="cw-section">
            <BentoGrid>
              {/* Cockpit Status */}
              <BentoCard span="featured" label="cockpit state" title="System readiness">
                <div className="cw-metric-row">
                  <div className="cw-metric">
                    <span className="cw-metric-value">{projects.length}</span>
                    <span className="cw-metric-label">memory containers</span>
                  </div>
                  <div className="cw-metric">
                    <span className="cw-metric-value">{totalChats}</span>
                    <span className="cw-metric-label">active threads</span>
                  </div>
                  <div className="cw-metric">
                    <span className="cw-metric-value">{starredProjects.length}</span>
                    <span className="cw-metric-label">priority pinned</span>
                  </div>
                </div>
                <div className="cw-actions">
                  <Button variant="primary" onClick={handleCreateProject}>
                    Spin up container
                  </Button>
                  <Button href="/settings">Cockpit controls</Button>
                </div>
              </BentoCard>

              {/* Recent Signals */}
              <BentoCard span="third" label="recent signals" title="Latest activity">
                {recentProjects.length === 0 ? (
                  <p className="text-[var(--cw-muted)]">No recent signals. Create a project to begin.</p>
                ) : (
                  <div className="space-y-3">
                    {recentProjects.map((project) => (
                      <div key={project.id} className="flex items-center justify-between p-3 rounded border border-[var(--color-border)] bg-[var(--color-bg-tertiary)]">
                        <div className="flex items-center gap-3">
                          <span
                            className="block h-3 w-3 rounded-full"
                            style={{ backgroundColor: project.color }}
                          />
                          <div className="flex-1">
                            <span className="block truncate font-semibold">{project.name}</span>
                            <span className="block text-xs text-[var(--cw-muted)]">
                              {formatDate(project.lastChat?.updatedAt)} ·
                              {project.chatCount} thread{project.chatCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          href={`/projects/${project.id}`}
                          title="Open project"
                        >
                          →
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </BentoCard>

              {/* Quick Actions */}
              <BentoCard span="third" label="quick commands" title="Execute">
                <div className="space-y-3">
                  <Button
                                      variant="ghost"
                                      onClick={handleCreateProject}
                                      className="w-full justify-start"
                                    >
                    <span className="mr-2">+ New memory container</span>
                    <span className="ml-auto">→</span>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      // Create a quick capture (random chat)
                      fetch('/api/chats', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title: 'Quick Capture' }),
                      })
                        .then((res) => res.json())
                        .then((chat) => router.push(`/chat/${chat.id}`))
                        .catch(console.error);
                    }}
                    className="w-full justify-start"
                  >
                    <span className="mr-2">+ Quick capture</span>
                    <span className="ml-auto">→</span>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      // Open settings
                      router.push('/settings');
                    }}
                    className="w-full justify-start"
                  >
                    <span className="mr-2">⚙ Cockpit controls</span>
                    <span className="ml-auto">→</span>
                  </Button>
                </div>
              </BentoCard>

              {/* Project Fleet */}
              {(!isLoading && projects.length === 0) ? (
                <BentoCard span="full" label="fleet status" title="No containers deployed">
                  <EmptyState
                    icon="📦"
                    title="Your fleet is ready for deployment"
                    description="Create your first memory container to begin accumulating contextual intelligence."
                    action={<Button variant="primary" onClick={() => setShowCreateForm((v) => !v)}>Launch first container</Button>}
                  />
                </BentoCard>
              ) : (
                <BentoCard span="full" label="fleet status" title="Active memory containers">
                  {isLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded border border-[var(--color-border)] bg-[var(--color-bg-tertiary)]">
                          <div className="flex-1">
                            <span className="block h-3 w-3 rounded-full bg-[var(--color-accent-dim)]"></span>
                            <span className="block truncate font-semibold text-[var(--cw-muted)]">Loading...</span>
                          </div>
                          <span className="text-[var(--cw-muted)]">…</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {projects.map((project) => (
                        <div key={project.id} className="group">
                          <div className="flex items-center justify-between p-4 rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors cursor-pointer"
                            onClick={() => handleProjectClick(project.id)}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <span
                                className="block h-4 w-4 rounded-full"
                                style={{ backgroundColor: project.color }}
                              />
                              <div className="flex-1">
                                <span className="block truncate font-semibold">{project.name}</span>
                                <span className="block text-xs text-[var(--cw-muted)]">
                                  {project.chatCount} thread{project.chatCount !== 1 ? 's' : ''} ·
                                  {formatDate(project.lastChat?.updatedAt)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleStar(project.id, !project.isStarred);
                                }}
                                className={`p-1 rounded ${
                                  project.isStarred
                                    ? 'text-[var(--color-accent)] bg-[var(--color-accent)/0.1]'
                                    : 'text-[var(--cw-muted)]'
                                }`}
                                aria-label={project.isStarred ? 'Unstar project' : 'Star project'}
                              >
                                {project.isStarred ? '★' : '☆'}
                              </button>
                              {expandedProjectId === project.id && expandedProjectData ? (
                                <Button
                                  variant="ghost"
                                  onClick={() => {
                                    setExpandedProjectId(null);
                                    setExpandedProjectData(null);
                                  }}
                                  className="p-1"
                                >
                                  ←
                                </Button>
                              ) : (
                                <Link
                                  href={`/projects/${project.id}`}
                                  className="text-[var(--color-text-dim)] hover:text-[var(--color-text)] transition-colors"
                                >
                                  →
                                </Link>
                              )}
                            </div>
                          </div>

                          {/* Expanded project view */}
                          {expandedProjectId === project.id && (
                            <div className="mt-3">
                              {loadingExpanded ? (
                                <div className="py-2 text-center text-[var(--cw-muted)]">
                                  Loading combat logs...
                                </div>
                              ) : expandedProjectData ? (
                                expandedProjectData.chats.length === 0 ? (
                                  <div className="text-center py-4">
                                    <p className="mb-2 text-[var(--cw-muted)]">No combat logs yet.</p>
                                    <Button
                                      variant="primary"
                                      onClick={() => createChatInProject(project.id)}
                                    >
                                      Launch first sortie
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {expandedProjectData.chats.map((chat) => (
                                      <div key={chat.id} className="flex items-center justify-between p-3 rounded border border-[var(--color-border)] bg-[var(--color-bg-tertiary)]">
                                        <div className="flex-1">
                                          <span className="block truncate font-semibold">{chat.title}</span>
                                          <span className="block text-xs text-[var(--cw-muted)]">
                                            {chat.messages?.length ?? 0} msgs ·
                                            {formatDate(new Date(chat.updatedAt).toISOString())}
                                          </span>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          href={`/chat/${chat.id}`}
                                          title="Engage target"
                                        >
                                          →
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )
                              ) : null}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </BentoCard>
              )}

              {/* Create Form (conditionally rendered) */}
              {showCreateForm && (
                <BentoCard span="full" label="deploy container" title="Initialize new memory container">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleCreateProject();
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium mb-1">Container designation</label>
                      <input
                        type="text"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="e.g., Project Odyssey, Nexus Core"
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded bg-transparent text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Initial signal hue</label>
                      <div className="flex flex-wrap gap-2">
                        {PROJECT_COLORS.map((color) => (
                          <label key={color} className="flex items-center justify-center w-8 h-8 border border-[var(--color-border)] rounded cursor-pointer"
                            onClick={() => setNewProjectColor(color)}
                            style={{
                              backgroundColor: color,
                              borderColor: newProjectColor === color ? 'var(--color-accent)' : 'transparent',
                            }}
                          >
                            <span className="sr-only">Select {color}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button type="button" variant="ghost" onClick={() => setShowCreateForm(false)}>
                        Abort mission
                      </Button>
                      <Button type="submit" variant="primary">
                        Deploy container
                      </Button>
                    </div>
                  </form>
                </BentoCard>
              )}
            </BentoGrid>
          </section>
        </div>
      </div>
    </main>
  );
}