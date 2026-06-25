'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageSkeleton } from '@/components/LoadingSkeleton';
import { Badge, BentoCard, BentoGrid, Button, EmptyState } from '@/components/ui';

interface Chat {
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
  localPath?: string;
  skills?: string;
  aiPatterns?: string;
  chatCount: number;
  chats: Chat[];
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  async function loadProject() {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) throw new Error('Failed to load project');
      const data = await res.json();
      setProject(data);
    } catch (error) {
      console.error('Failed to load project', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function createChat() {
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

  async function toggleStar() {
    if (!project) return;

    try {
      await fetch(`/api/projects/${projectId}/star`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred: !project.isStarred }),
      });
      setProject({ ...project, isStarred: !project.isStarred });
      window.dispatchEvent(new CustomEvent('sidebar-refresh'));
    } catch (error) {
      console.error('Failed to toggle star', error);
    }
  }

  if (isLoading) {
    return (
      <main className="cw-page flex flex-1">
        <PageSkeleton />
      </main>
    );
  }

  if (notFound || !project) {
    return (
      <main className="cw-page flex flex-1 items-center justify-center p-8">
        <EmptyState
          icon="404"
          title="Project brain not found"
          description="This memory container no longer exists or could not be loaded."
          action={<Button href="/projects" variant="primary">Back to workbench</Button>}
        />
      </main>
    );
  }

  const totalMessages = project.chats.reduce((sum, chat) => sum + (chat.messages?.length ?? 0), 0);
  const latestChat = [...project.chats].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

  return (
    <main className="cw-page flex-1 overflow-y-auto">
      <div className="cw-container">
        <div className="cw-shell">
          <header className="cw-section">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <Link href="/projects" className="cw-button">← Workbench</Link>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={toggleStar}
                  className={`cw-button ${project.isStarred ? 'cw-button-primary' : ''}`}
                  title={project.isStarred ? 'Unstar' : 'Star'}
                >
                  {project.isStarred ? '★ Priority brain' : '☆ Star brain'}
                </button>
                <Button variant="primary" onClick={createChat}>+ New chat</Button>
              </div>
            </div>

            <div className="cw-eyebrow">
              <span className="cw-dot" style={{ color: project.color, backgroundColor: project.color }} />
              project command surface
            </div>
            <h1 className="cw-title">{project.name}</h1>
            <p className="cw-subtitle">
              This is the durable context surface for the project. Every project chat can become memory fuel for Brain mode,
              so this page is optimized for continuing the right thread quickly.
            </p>
          </header>

          <section className="cw-section">
            <BentoGrid>
              <BentoCard span="featured" label="context state" title="Memory container status">
                <div className="cw-metric-row">
                  <div className="cw-metric"><span className="cw-metric-value">{project.chatCount}</span><span className="cw-metric-label">chat threads</span></div>
                  <div className="cw-metric"><span className="cw-metric-value">{totalMessages}</span><span className="cw-metric-label">messages</span></div>
                  <div className="cw-metric"><span className="cw-metric-value">{project.isStarred ? 'ON' : 'OFF'}</span><span className="cw-metric-label">priority pin</span></div>
                </div>
                <div className="cw-actions">
                  <Button variant="primary" onClick={createChat}>Start project chat</Button>
                  <Button href="/settings">Brain settings</Button>
                </div>
              </BentoCard>

              <BentoCard span="third" label="latest signal" title={latestChat ? latestChat.title : 'No signal yet'}>
                {latestChat ? (
                  <>
                    <p>{latestChat.messages?.length ?? 0} messages · updated {formatDate(latestChat.updatedAt)}</p>
                    <div className="cw-actions"><Button href={`/chat/${latestChat.id}`}>Resume latest</Button></div>
                  </>
                ) : (
                  <p>No chats exist yet. Create one to start feeding the project brain.</p>
                )}
              </BentoCard>

              <BentoCard span="third" label="configuration" title="Project configuration">
                {isLoading ? (
                  <div className="cw-metric">Loading...</div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="block truncate font-semibold">Local path</span>
                      <input
                        type="text"
                        value={project.localPath ?? ''}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          setProject(prev => {
                            if (!prev) return null;
                            return { ...prev, localPath: val || undefined };
                          });
                        }}
                        placeholder="e.g., /mnt/c/Users/strubloid/projects/my-app"
                        className="flex-1 min-w-0 bg-transparent border border-[var(--color-border)] rounded px-2 py-1 text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="block truncate font-semibold">Skills</span>
                      <input
                        type="text"
                        value={project.skills ?? ''}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          setProject(prev => {
                            if (!prev) return null;
                            return { ...prev, skills: val || undefined };
                          });
                        }}
                        placeholder="e.g., frontend-ux-refactoring,python-development"
                        className="flex-1 min-w-0 bg-transparent border border-[var(--color-border)] rounded px-2 py-1 text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="block truncate font-semibold">AI patterns</span>
                      <input
                        type="text"
                        value={project.aiPatterns ?? ''}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          setProject(prev => {
                            if (!prev) return null;
                            return { ...prev, aiPatterns: val || undefined };
                          });
                        }}
                        placeholder="e.g., The AI should follow a research-first pattern, then implement, then test."
                        className="flex-1 min-w-0 bg-transparent border border-[var(--color-border)] rounded px-2 py-1 text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                      />
                    </div>
                    <Button
                      variant="primary"
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/projects/${projectId}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              localPath: project.localPath ?? undefined,
                              skills: project.skills ?? undefined,
                              aiPatterns: project.aiPatterns ?? undefined,
                            }),
                          });
                          if (!res.ok) throw new Error('Failed to update project');
                          // Optionally refetch to get latest from server
                          await loadProject();
                        } catch (error) {
                          console.error('Failed to save project config', error);
                        }
                      }}
                    >
                      Save configuration
                    </Button>
                  </div>
                )}
              </BentoCard>

              <section className="cw-card cw-card-full">
                <div className="cw-card-body">
                  <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <div className="cw-card-label">thread registry</div>
                      <h2 className="cw-card-title">Project chats</h2>
                      <p className="cw-card-copy">Choose a thread to continue the context, or create a fresh one when the topic changes.</p>
                    </div>
                    <Badge>{project.chats.length} thread{project.chats.length !== 1 ? 's' : ''}</Badge>
                  </div>

                  {project.chats.length === 0 ? (
                    <EmptyState
                      icon="💬"
                      title="No chats in this brain yet"
                      description="Start a project chat and Strubloid will begin forming useful context around this memory container."
                      action={<Button variant="primary" onClick={createChat}>Create first chat</Button>}
                    />
                  ) : (
                    <div className="cw-list">
                      {project.chats.map((chat) => (
                        <Link key={chat.id} href={`/chat/${chat.id}`} className="cw-list-item">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">{chat.title}</span>
                            <span className="block text-xs text-[var(--cw-muted)]">
                              {chat.messages?.length} messages · updated {formatDate(chat.updatedAt)}
                            </span>
                          </span>
                          <span className="cw-pill">Open →</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </BentoGrid>
          </section>
        </div>
      </div>
    </main>
  );
}