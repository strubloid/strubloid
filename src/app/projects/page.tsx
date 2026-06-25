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
        prev.map((p) => (p.id === projectId ? { ...p, chatCount: Math.max(0, p.chatCount - 1) } : p))
      );
    } catch (error) {
      console.error('Failed to delete chat', error);
    }
  }

  const totalChats = projects.reduce((sum, p) => sum + p.chatCount, 0);
  const starredProjects = projects.filter((p) => p.isStarred);
  const recentProjects = [...projects]
    .filter((p) => p.lastChat?.updatedAt)
    .sort((a, b) => new Date(b.lastChat!.updatedAt).getTime() - new Date(a.lastChat!.updatedAt).getTime())
    .slice(0, 4);

  return (
    <main className="cw-page flex-1 overflow-y-auto">
      <div className="cw-container">
        <div className="cw-shell">
          <header className="cw-section">
            <div className="cw-eyebrow">strubloid / cognitive workbench</div>
            <h1 className="cw-title">Project brains, random captures, and AI context in one cockpit.</h1>
            <p className="cw-subtitle">
              Projects are not folders here — they are memory containers. Open one to continue a thread,
              star important contexts, or create a fresh chat already wired into the right brain.
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
            {showCreateForm && (
              <div className="cw-panel-form">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="cw-card-label">new context</div>
                    <h2 className="cw-card-title">Create a project brain</h2>
                    <p className="cw-card-copy">Give the AI a durable place to remember a domain, product, or experiment.</p>
                  </div>
                  <button className="cw-button" onClick={() => setShowCreateForm(false)}>Close</button>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm text-[var(--cw-muted)]">
                    Project name
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Research lab, Strubloid UI, Personal ops..."
                      className="mt-2 w-full"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateProject();
                        if (e.key === 'Escape') setShowCreateForm(false);
                      }}
                    />
                  </label>

                  <div>
                    <div className="mb-2 text-sm text-[var(--cw-muted)]">Signal color</div>
                    <div className="flex flex-wrap gap-2">
                      {PROJECT_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setNewProjectColor(color)}
                          aria-label={`Choose color ${color}`}
                          className={`h-9 w-9 rounded-full border transition-transform ${
                            newProjectColor === color ? 'scale-110 border-white' : 'border-white/20'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="cw-actions">
                    <Button variant="primary" onClick={handleCreateProject} disabled={!newProjectName.trim()}>
                      Create project brain
                    </Button>
                    <Button onClick={() => setShowCreateForm(false)}>Cancel</Button>
                  </div>
                </div>
              </div>
            )}

            {isLoading ? (
              <ListSkeleton count={6} />
            ) : projects.length === 0 ? (
              <EmptyState
                icon="🧠"
                title="No project brains yet"
                description="Create your first memory container. Future chats in that project will become context the AI can reference when Brain is enabled."
                action={<Button variant="primary" onClick={() => setShowCreateForm(true)}>Create first project</Button>}
              />
            ) : (
              <BentoGrid>
                <BentoCard span="featured" label="workspace telemetry" title="Your cognitive map is online">
                  <div className="cw-metric-row">
                    <div className="cw-metric"><span className="cw-metric-value">{projects.length}</span><span className="cw-metric-label">project brains</span></div>
                    <div className="cw-metric"><span className="cw-metric-value">{totalChats}</span><span className="cw-metric-label">project chats</span></div>
                    <div className="cw-metric"><span className="cw-metric-value">{starredProjects.length}</span><span className="cw-metric-label">starred contexts</span></div>
                  </div>
                  <div className="cw-actions">
                    <Button variant="primary" onClick={() => setShowCreateForm(true)}>Add context</Button>
                    <Button href="/settings">Memory hygiene</Button>
                  </div>
                </BentoCard>

                <BentoCard span="third" label="priority contexts" title="Starred brains">
                  <div className="mt-4 flex flex-wrap gap-2">
                    {starredProjects.length > 0 ? starredProjects.slice(0, 8).map((project) => (
                      <Link key={project.id} href={`/projects/${project.id}`} className="cw-pill">
                        <span className="cw-dot" style={{ color: project.color, backgroundColor: project.color }} />
                        {project.name}
                      </Link>
                    )) : <span className="text-sm text-[var(--cw-muted)]">Star a project to pin it into your cockpit.</span>}
                  </div>
                </BentoCard>

                <BentoCard span="third" label="recent signal" title="Latest activity">
                  <div className="mt-4 cw-list">
                    {recentProjects.length > 0 ? recentProjects.map((project) => (
                      <Link key={project.id} href={`/projects/${project.id}`} className="cw-list-item">
                        <span className="min-w-0 truncate">{project.name}</span>
                        <span className="text-xs text-[var(--cw-muted)]">{formatDate(project.lastChat?.updatedAt)}</span>
                      </Link>
                    )) : <span className="text-sm text-[var(--cw-muted)]">No recent project chats yet.</span>}
                  </div>
                </BentoCard>

                <section className="cw-card cw-card-full">
                  <div className="cw-card-body">
                    <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
                      <div>
                        <div className="cw-card-label">all containers</div>
                        <h2 className="cw-card-title">Project brain registry</h2>
                        <p className="cw-card-copy">Click a project row to inspect chats without leaving the cockpit. Use the title to open the full project command surface.</p>
                      </div>
                      <Badge>{projects.length} active</Badge>
                    </div>

                    <div className="cw-list">
                      {projects.map((project) => {
                        const isExpanded = expandedProjectId === project.id;
                        return (
                          <article key={project.id} className="rounded-2xl border border-white/10 bg-black/10">
                            <div className="cw-list-item">
                              <button
                                type="button"
                                onClick={() => handleProjectClick(project.id)}
                                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                aria-expanded={isExpanded}
                              >
                                <span className="cw-dot" style={{ color: project.color, backgroundColor: project.color }} />
                                <span className="min-w-0">
                                  <span className="block truncate font-semibold">{project.name}</span>
                                  <span className="block truncate text-xs text-[var(--cw-muted)]">
                                    {project.chatCount} chat{project.chatCount !== 1 ? 's' : ''} · {project.lastChat?.title ?? 'Awaiting first signal'}
                                  </span>
                                </span>
                              </button>

                              <div className="flex shrink-0 items-center gap-2">
                                <button
                                  onClick={() => handleToggleStar(project.id, !project.isStarred)}
                                  className={`star-btn rounded-full p-2 ${project.isStarred ? 'starred' : 'text-[var(--cw-muted)]'}`}
                                  aria-label={project.isStarred ? 'Unstar project' : 'Star project'}
                                  title={project.isStarred ? 'Unstar' : 'Star'}
                                >
                                  ★
                                </button>
                                <Link href={`/projects/${project.id}`} className="cw-button">Open</Link>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="px-4 pb-4">
                                {loadingExpanded ? (
                                  <div className="py-3 text-sm text-[var(--cw-muted)]">Loading chat threads...</div>
                                ) : expandedProjectData ? (
                                  expandedProjectData.chats.length === 0 ? (
                                    <div className="cw-empty py-6">
                                      <p className="mb-4 text-sm text-[var(--cw-muted)]">No chats in this project yet.</p>
                                      <Button variant="primary" onClick={() => createChatInProject(project.id)}>Create first chat</Button>
                                    </div>
                                  ) : (
                                    <div className="cw-list pt-3">
                                      {expandedProjectData.chats.map((chat) => (
                                        <div key={chat.id} className="cw-list-item">
                                          <Link href={`/chat/${chat.id}`} className="min-w-0 flex-1 truncate">
                                            {chat.title}
                                            <span className="ml-2 text-xs text-[var(--cw-muted)]">{chat.messages?.length ?? 0} msgs</span>
                                          </Link>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              e.preventDefault();
                                              handleDeleteChat(chat.id, project.id);
                                            }}
                                            className="cw-button cw-button-danger min-h-0 px-3 py-1 text-xs"
                                            title="Delete chat"
                                            aria-label="Delete chat"
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )
                                ) : null}
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  </div>
                </section>
              </BentoGrid>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
