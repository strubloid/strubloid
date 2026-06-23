'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ConfirmDialog } from './ConfirmDialog';

interface ChatPreview {
  id: string;
  title: string;
  updatedAt: string;
}

interface ProjectPreview {
  id: string;
  name: string;
  color: string;
  isStarred: boolean;
}

interface ProjectChat {
  id: string;
  title: string;
  messages: { id: string }[];
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [randomChats, setRandomChats] = useState<ChatPreview[]>([]);
  const [projects, setProjects] = useState<ProjectPreview[]>([]);
  const [starredProjects, setStarredProjects] = useState<ProjectPreview[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<ChatPreview | null>(null);

  // Project accordion state
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [expandedProjectChats, setExpandedProjectChats] = useState<ProjectChat[]>([]);
  const [loadingProjectChats, setLoadingProjectChats] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Auto-expand project based on current pathname
  useEffect(() => {
    // /chat/[chatId] — fetch chat to find its project
    const chatMatch = pathname.match(/^\/chat\/([^/]+)$/);
    if (chatMatch) {
      const chatId = chatMatch[1];
      fetch(`/api/chats/${chatId}`)
        .then((res) => res.json())
        .then((chat) => {
          if (chat?.project?.id) {
            expandProjectById(chat.project.id);
          }
        })
        .catch(() => {});
      return;
    }

    // /projects/[projectId] — expand that project directly
    const projectMatch = pathname.match(/^\/projects\/([^/]+)$/);
    if (projectMatch) {
      expandProjectById(projectMatch[1]);
    }
  }, [pathname]);

  function expandProjectById(projectId: string) {
    // Don't re-fetch if already expanded with data for this project
    if (expandedProjectId === projectId && expandedProjectChats.length > 0) return;

    setExpandedProjectId(projectId);
    setLoadingProjectChats(true);
    setExpandedProjectChats([]);
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((data) => setExpandedProjectChats(data.chats ?? []))
      .catch(() => setExpandedProjectId(null))
      .finally(() => setLoadingProjectChats(false));
  }

  async function loadData() {
    try {
      const [chatsRes, projectsRes] = await Promise.all([
        fetch('/api/chats?isRandom=true&limit=20'),
        fetch('/api/projects?limit=50')
      ]);

      const chatsData = await chatsRes.json();
      const projectsData = await projectsRes.json();

      setRandomChats(chatsData.chats ?? []);
      setProjects(projectsData.projects ?? []);
      setStarredProjects(projectsData.projects?.filter((p: ProjectPreview) => p.isStarred) ?? []);
    } catch (error) {
      console.error('Sidebar: Failed to load data', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function createNewChat() {
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' })
      });
      const chat = await res.json();
      window.location.href = `/chat/${chat.id}`;
    } catch (error) {
      console.error('Sidebar: Failed to create chat', error);
    }
  }

  function isActiveChat(chatId: string) {
    return pathname === `/chat/${chatId}`;
  }

  function isActiveProject(projectId: string) {
    return pathname === `/projects/${projectId}`;
  }

  async function confirmDeleteChat() {
    if (!pendingDelete) return;
    const deletedId = pendingDelete.id;
    try {
      const res = await fetch(`/api/chats/${deletedId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete chat');
      setRandomChats((cs) => cs.filter((c) => c.id !== deletedId));
      if (pathname === `/chat/${deletedId}`) {
        router.push('/chat');
      }
    } catch (err) {
      console.error('Sidebar: Failed to delete chat', err);
    } finally {
      setPendingDelete(null);
    }
  }

  async function toggleProjectExpand(projectId: string) {
    if (expandedProjectId === projectId) {
      // Collapse
      setExpandedProjectId(null);
      setExpandedProjectChats([]);
      return;
    }
    expandProjectById(projectId);
  }

  async function deleteProjectChat(chatId: string, projectId: string) {
    try {
      const res = await fetch(`/api/chats/${chatId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete chat');
      setExpandedProjectChats((prev) => prev.filter((c) => c.id !== chatId));
      setRandomChats((prev) => prev.filter((c) => c.id !== chatId));
      if (pathname === `/chat/${chatId}`) {
        router.push('/chat');
      }
    } catch (error) {
      console.error('Sidebar: Failed to delete project chat', error);
    }
  }

  async function createChatInProject(projectId: string) {
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, title: 'New Chat' })
      });
      if (!res.ok) throw new Error('Failed to create chat');
      const chat = await res.json();
      // Refresh project chats so the new one shows up
      const projectRes = await fetch(`/api/projects/${projectId}`);
      if (projectRes.ok) {
        const data = await projectRes.json();
        setExpandedProjectChats(data.chats ?? []);
      }
      window.location.href = `/chat/${chat.id}`;
    } catch (error) {
      console.error('Sidebar: Failed to create chat in project', error);
    }
  }

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed left-4 top-4 z-50 rounded-lg border border-[#2a2a3a] bg-[#12121a] p-2 md:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle sidebar"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={mobileOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
          />
        </svg>
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="flex h-full flex-col p-4">
          <div className="mb-6 flex w-full items-center justify-center gap-2">
            <span className="glow-text text-xl font-bold" style={{ color: 'var(--color-accent)' }}>
              Strubloid
            </span>
          </div>
          {/* Logo/Title */}

          {/* New Chat Button */}
          <button
            onClick={createNewChat}
            className="btn-primary mb-6 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Chat
          </button>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto">
            {/* Random Chats */}
            <div className="mb-6">
              <div className="section-header">Random Chats</div>
              <div className="space-y-1">
                {isLoading ? (
                  <div className="chat-item opacity-50">Loading...</div>
                ) : randomChats.length === 0 ? (
                  <div className="chat-item opacity-50">No chats yet</div>
                ) : (
                  randomChats.map((chat) => (
                    <div key={chat.id} className="group flex items-center gap-1">
                      <Link
                        href={`/chat/${chat.id}`}
                        className={`chat-item block flex-1 truncate ${isActiveChat(chat.id) ? 'active' : ''}`}
                        onClick={() => setMobileOpen(false)}
                      >
                        {chat.title}
                      </Link>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setPendingDelete(chat);
                        }}
                        className="flex-shrink-0 rounded p-1 text-[--color-text-dim] opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                        title="Delete chat"
                        aria-label="Delete chat"
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Projects */}
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between px-3">
                <span className="section-header" style={{ padding: '0 0 8px 0' }}>
                  Projects
                </span>
                <Link href="/projects" className="text-xs text-[--color-accent] hover:underline">
                  View all
                </Link>
              </div>
              <div className="space-y-1">
                {isLoading ? (
                  <div className="chat-item opacity-50">Loading...</div>
                ) : projects.length === 0 ? (
                  <div className="chat-item opacity-50">No projects</div>
                ) : (
                  projects.slice(0, 10).map((project) => {
                    const isExpanded = expandedProjectId === project.id;
                    return (
                      <div key={project.id} className="project-item-container">
                        {/* Project header: link + expand toggle */}
                        <div className={`project-item relative ${isActiveProject(project.id) || isExpanded ? 'active' : ''}`}>
                          <Link
                            href={`/projects/${project.id}`}
                            className="block truncate pr-10"
                            onClick={() => setMobileOpen(false)}
                          >
                            <span
                              className="mr-2 inline-block h-2 w-2 rounded-full"
                              style={{ backgroundColor: project.color }}
                            />
                            {project.name}
                          </Link>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              toggleProjectExpand(project.id);
                            }}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 transition-colors hover:bg-[--color-bg-tertiary] ${
                              isExpanded ? 'text-[--color-accent]' : 'text-[--color-text-dim]'
                            }`}
                            title={isExpanded ? 'Collapse chats' : 'Show chats'}
                            aria-label={isExpanded ? 'Collapse chats' : 'Show chats'}
                          >
                            <svg
                              className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>

                        {/* Expanded chat list */}
                        {isExpanded && (
                          <div className="ml-3 border-l border-[--color-border] pl-2">
                            {loadingProjectChats ? (
                              <div className="chat-item opacity-50">Loading...</div>
                            ) : expandedProjectChats.length === 0 ? (
                              <div className="px-2 py-2 text-center">
                                <div className="mb-2 flex justify-between text-xs text-[--color-text-dim]">
                                  <p>0 Chats</p>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      createChatInProject(project.id);
                                    }}
                                    className="inline-flex items-center gap-1 text-xs text-[--color-accent] hover:underline"
                                  >
                                    <svg
                                      className="h-3 w-3"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 4v16m8-8H4"
                                      />
                                    </svg>
                                    Create chat
                                  </button>
                                </div>
                              </div>
                            ) : (
                              expandedProjectChats.map((chat) => (
                                <div key={chat.id} className="group flex items-center gap-1">
                                  <Link
                                    href={`/chat/${chat.id}`}
                                    className={`chat-item block flex-1 truncate text-xs ${isActiveChat(chat.id) ? 'active' : ''}`}
                                    onClick={() => setMobileOpen(false)}
                                  >
                                    {chat.title}
                                  </Link>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      deleteProjectChat(chat.id, project.id);
                                    }}
                                    className="flex-shrink-0 rounded p-1 text-[--color-text-dim] opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                                    title="Delete chat"
                                    aria-label="Delete chat"
                                  >
                                    <svg
                                      className="h-3 w-3"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                      />
                                    </svg>
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Starred Projects */}
            {starredProjects.length > 0 && (
              <div className="mb-6">
                <div className="section-header flex items-center gap-2">
                  <svg className="h-4 w-4" fill="#fbbf24" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  Starred
                </div>
                <div className="space-y-1">
                  {starredProjects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className={`project-item block ${isActiveProject(project.id) ? 'active' : ''}`}
                      onClick={() => setMobileOpen(false)}
                    >
                      <span
                        className="mr-2 inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: project.color }}
                      />
                      {project.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </nav>

          {/* Footer links */}
          <div className="space-y-2 border-t border-[--color-border] pt-4">
            <Link
              href="/settings"
              className="flex items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-[--color-bg-tertiary]"
              onClick={() => setMobileOpen(false)}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Settings
            </Link>
          </div>
        </div>
      </aside>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete Chat"
        message={`Are you sure you want to delete "${pendingDelete?.title ?? 'this chat'}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDeleteChat}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
