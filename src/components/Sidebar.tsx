'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ConfirmDialog } from './ConfirmDialog';
import { useSidebar } from '@/components/LayoutShell/LayoutShell';

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

interface SidebarProps {
  mode?: 'full' | 'icons' | 'hidden';
  mobileOpen?: boolean;
  onMobileToggle?: (open: boolean) => void;
}

export function Sidebar({
  mode: externalMode,
  mobileOpen: externalMobileOpen,
  onMobileToggle
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const ctx = useSidebar();
  const isEmbedded = externalMode !== undefined;

  // Use provided props or fall back to context
  const mode = isEmbedded ? externalMode : ctx.mode;
  const mobileOpen = isEmbedded ? (externalMobileOpen ?? false) : ctx.mobileOpen;

  const [randomChats, setRandomChats] = useState<ChatPreview[]>([]);
  const [projects, setProjects] = useState<ProjectPreview[]>([]);
  const [starredProjects, setStarredProjects] = useState<ProjectPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<ChatPreview | null>(null);
  const [randomChatsExpanded, setRandomChatsExpanded] = useState(false);
  const [projectsExpanded, setProjectsExpanded] = useState(false);
  const [starredExpanded, setStarredExpanded] = useState(false);

  // Project accordion state
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [expandedProjectChats, setExpandedProjectChats] = useState<ProjectChat[]>([]);
  const [loadingProjectChats, setLoadingProjectChats] = useState(false);

  // Search/filter
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    chats: ChatPreview[];
    projects: ProjectPreview[];
  } | null>(null);
  const [searching, setSearching] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const loadDataRef = useRef(loadData);
  const expandedProjectIdRef = useRef(expandedProjectId);

  useEffect(() => {
    loadDataRef.current = loadData;
  });

  useEffect(() => {
    expandedProjectIdRef.current = expandedProjectId;
  }, [expandedProjectId]);

  useEffect(() => {
    if (mode !== 'icons' || (!randomChatsExpanded && !projectsExpanded)) return;

    const closeDrawerOnOutsideClick = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (sidebarRef.current?.contains(target)) return;
      setRandomChatsExpanded(false);
      setProjectsExpanded(false);
    };

    document.addEventListener('pointerdown', closeDrawerOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeDrawerOnOutsideClick);
  }, [mode, randomChatsExpanded, projectsExpanded]);

  useEffect(() => {
    loadData();
  }, []);

  // Refresh sidebar data when custom event fires (e.g. after title edit, clean-random)
  useEffect(() => {
    const handler = () => {
      loadDataRef.current();
      // Also refresh expanded project chat list so renamed chat titles appear
      const pid = expandedProjectIdRef.current;
      if (pid) {
        fetch(`/api/projects/${pid}`)
          .then((r) => r.json())
          .then((data) => setExpandedProjectChats(data.chats ?? []))
          .catch(() => {});
      }
    };
    window.addEventListener('sidebar-refresh', handler);
    return () => window.removeEventListener('sidebar-refresh', handler);
  }, []);

  // Also refresh on pathname changes (navigate back to sidebar view)
  useEffect(() => {
    loadData();
  }, [pathname]);

  // Auto-expand project based on current pathname
  useEffect(() => {
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

    const projectMatch = pathname.match(/^\/projects\/([^/]+)$/);
    if (projectMatch) {
      expandProjectById(projectMatch[1]);
    }
  }, [pathname]);

  // Debounced search via API — searches chat titles, project names, and message content
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setSearching(false);
      return;
    }

    const trimmed = searchQuery.trim();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=20`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch {
        // silently fail
      } finally {
        setSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  function expandProjectById(projectId: string) {
    if (expandedProjectId === projectId && expandedProjectChats.length > 0) return;

    setProjectsExpanded(true);
    setRandomChatsExpanded(false);
    setExpandedProjectId(projectId);
    setLoadingProjectChats(true);
    setExpandedProjectChats([]);
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((data) => setExpandedProjectChats(data.chats ?? []))
      .catch(() => setExpandedProjectId(null))
      .finally(() => setLoadingProjectChats(false));
  }

  function toggleRandomChatsSection() {
    if (isIconsMode) {
      setRandomChatsExpanded((expanded) => !expanded);
      setProjectsExpanded(false);
      return;
    }

    setRandomChatsExpanded((expanded) => {
      const nextExpanded = !expanded;
      if (nextExpanded) {
        setProjectsExpanded(false);
      }
      return nextExpanded;
    });
  }

  function toggleProjectsSection() {
    if (isIconsMode) {
      setProjectsExpanded((expanded) => !expanded);
      setRandomChatsExpanded(false);
      return;
    }

    setProjectsExpanded((expanded) => {
      const nextExpanded = !expanded;
      if (nextExpanded) {
        setRandomChatsExpanded(false);
      }
      return nextExpanded;
    });
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

  const filteredChats = searchQuery
    ? (searchResults?.chats ??
      randomChats.filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase())))
    : randomChats;

  const filteredProjects = searchQuery
    ? (searchResults?.projects ??
      projects.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase())))
    : projects;

  const isIconsMode = mode === 'icons';
  const isHidden = mode === 'hidden';
  const showRandomDrawer = isIconsMode && randomChatsExpanded;
  const showProjectsDrawer = isIconsMode && projectsExpanded;

  return (
    <>
      <aside ref={sidebarRef} className={`sidebar mode-${mode} ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-brush flex h-full flex-col p-4">
          <div className="brush-head">
            <span className="brush-kicker">Strub</span>
          </div>

          {/* New Chat Button */}
          <button
            onClick={createNewChat}
            className="brush-new-chat btn-primary mb-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2"
            title={isIconsMode ? 'New Chat' : undefined}
          >
            <svg
              className="h-5 w-5 flex-shrink-0"
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
            {!isIconsMode && <span>New Chat</span>}
          </button>

          {/* Navigation */}
          <nav className="sidebar-orbits -mx-4 flex-1 overflow-y-auto px-4">
            {/* Random Chats */}
            <div className={`orbit-section mb-6 ${randomChatsExpanded ? 'expanded' : ''}`}>
              <button
                type="button"
                className="sidebar-section-toggle"
                onClick={toggleRandomChatsSection}
                aria-expanded={randomChatsExpanded}
              >
                <span className="sidebar-section-title flex w-full items-center justify-center gap-2">
                  <svg
                    className="h-3.5 w-3.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  {!isIconsMode && <span className="sidebar-label">Random Chats</span>}
                </span>
                {!isIconsMode && <span className="sidebar-count">{filteredChats.length}</span>}
              </button>
              <div hidden={!randomChatsExpanded} className="orbit-strip readable-list expanded">
                {isLoading ? (
                  <div className="chat-item opacity-50">
                    {showRandomDrawer || !isIconsMode ? 'Loading...' : ''}
                  </div>
                ) : filteredChats.length === 0 ? (
                  <div className="chat-item opacity-50">
                    {(showRandomDrawer || !isIconsMode) &&
                      (searching ? 'Searching...' : searchQuery ? 'No matches' : 'No chats yet')}
                  </div>
                ) : (
                  filteredChats.map((chat) => (
                    <div key={chat.id} className="orbit-node group flex items-center gap-1">
                      <Link
                        href={`/chat/${chat.id}`}
                        className={`chat-title chat-item block flex-1 truncate ${isActiveChat(chat.id) ? 'active' : ''}`}
                        onClick={() => {
                          if (isEmbedded && onMobileToggle) onMobileToggle(false);
                          else ctx.setMobileOpen(false);
                        }}
                      >
                        {(showRandomDrawer || !isIconsMode) && chat.title}
                      </Link>
                      {!isIconsMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setPendingDelete(chat);
                          }}
                          className="flex-shrink-0 rounded p-1 text-[var(--color-text-dim)] opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400"
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
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Projects */}
            <div className={`orbit-section mb-6 ${projectsExpanded ? 'expanded' : ''}`}>
              <div className="flex items-center justify-between justify-center">
                <button
                  type="button"
                  className="sidebar-section-toggle compact"
                  onClick={toggleProjectsSection}
                  aria-expanded={projectsExpanded}
                >
                  <span className="sidebar-section-title flex items-center justify-center gap-2">
                    <svg
                      className="h-3.5 w-3.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                      />
                    </svg>
                    {!isIconsMode && <span className="sidebar-label">Projects</span>}
                  </span>
                  {!isIconsMode && <span className="sidebar-count">{filteredProjects.length}</span>}
                </button>
                {!isIconsMode && (
                  <Link
                    href="/projects"
                    className="sidebar-all-link"
                    title="All projects"
                    aria-label="All projects"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 6h18M3 10h12M3 14h18"
                      />
                    </svg>
                    <span>all</span>
                  </Link>
                )}
              </div>
              <div hidden={!projectsExpanded} className="orbit-strip readable-list expanded">
                {isLoading ? (
                  <div className="chat-item opacity-50">
                    {showProjectsDrawer || !isIconsMode ? 'Loading...' : ''}
                  </div>
                ) : filteredProjects.length === 0 ? (
                  <div className="chat-item opacity-50">
                    {(showProjectsDrawer || !isIconsMode) &&
                      (searching ? 'Searching...' : searchQuery ? 'No matches' : 'No projects')}
                  </div>
                ) : (
                  filteredProjects.slice(0, 10).map((project) => {
                    const isExpanded = expandedProjectId === project.id;
                    return (
                      <div key={project.id} className="orbit-node project-item-container">
                        <div
                          className={`project-item relative ${isActiveProject(project.id) || isExpanded ? 'active' : ''}`}
                        >
                          <Link
                            href={`/projects/${project.id}`}
                            className={
                              isIconsMode && !showProjectsDrawer
                                ? 'flex items-center justify-center'
                                : 'block truncate pr-10'
                            }
                            onClick={(e) => {
                              if (showProjectsDrawer) {
                                e.preventDefault();
                                toggleProjectExpand(project.id);
                                return;
                              }
                              if (isEmbedded && onMobileToggle) onMobileToggle(false);
                              else ctx.setMobileOpen(false);
                            }}
                          >
                            <span
                              className="inline-block h-2 w-2 rounded-full"
                              style={{ backgroundColor: project.color }}
                            />
                            {(showProjectsDrawer || !isIconsMode) && (
                              <span className="project-name">{project.name}</span>
                            )}
                          </Link>
                          {(!isIconsMode || showProjectsDrawer) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                toggleProjectExpand(project.id);
                              }}
                              className={`absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 transition-colors hover:bg-[var(--color-bg-tertiary)] ${
                                isExpanded
                                  ? 'text-[var(--color-accent)]'
                                  : 'text-[var(--color-text-dim)]'
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
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </button>
                          )}
                        </div>

                        {isExpanded && (!isIconsMode || showProjectsDrawer) && (
                          <div className="border-l border-[var(--color-border)] pl-2 opacity-50">
                            {loadingProjectChats ? (
                              <div className="chat-item opacity-50">Loading...</div>
                            ) : expandedProjectChats.length === 0 ? (
                              <div className="px-2 py-2 text-center">
                                <div className="mb-2 flex justify-between text-xs text-[var(--color-text-dim)]">
                                  <p>0 Chats</p>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      createChatInProject(project.id);
                                    }}
                                    className="inline-flex items-center gap-1 text-xs text-[var(--color-accent)] hover:underline"
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
                                <div
                                  key={chat.id}
                                  className="orbit-node group mt-2 mb-2 flex items-center gap-1"
                                >
                                  <Link
                                    href={`/chat/${chat.id}`}
                                    className={`chat-item block flex-1 truncate text-xs ${isActiveChat(chat.id) ? 'active' : ''}`}
                                    onClick={() => {
                                      if (isEmbedded && onMobileToggle) onMobileToggle(false);
                                      else ctx.setMobileOpen(false);
                                    }}
                                  >
                                    {chat.title}
                                  </Link>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      deleteProjectChat(chat.id, project.id);
                                    }}
                                    className="flex-shrink-0 rounded p-1 text-[var(--color-text-dim)] opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400"
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
            {starredProjects.length > 0 && !isIconsMode && (
              <div className="orbit-section mb-6">
                <button
                  type="button"
                  className="sidebar-section-toggle"
                  onClick={() => setStarredExpanded((value) => !value)}
                  aria-expanded={starredExpanded}
                >
                  <span className="sidebar-section-title">
                    <svg className="h-4 w-4" fill="#fbbf24" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <span className="sidebar-label">Starred</span>
                  </span>
                  <span className="sidebar-count">{starredProjects.length}</span>
                </button>
                <div hidden={!starredExpanded} className="orbit-strip readable-list expanded">
                  {starredProjects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className={`project-item block ${isActiveProject(project.id) ? 'active' : ''}`}
                      onClick={() => {
                        if (isEmbedded && onMobileToggle) onMobileToggle(false);
                        else ctx.setMobileOpen(false);
                      }}
                    >
                      <span
                        className="mr-2 inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: project.color }}
                      />
                      <span className="project-name">{project.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </nav>

          {/* Footer links */}
          {!isIconsMode && (
            <div className="space-y-2 border-t border-[var(--color-border)] pt-4">
              <Link
                href="/settings"
                className="flex items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-[var(--color-bg-tertiary)]"
                onClick={() => {
                  if (isEmbedded && onMobileToggle) onMobileToggle(false);
                  else ctx.setMobileOpen(false);
                }}
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
          )}
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
