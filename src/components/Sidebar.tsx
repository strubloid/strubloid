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

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [randomChats, setRandomChats] = useState<ChatPreview[]>([]);
  const [projects, setProjects] = useState<ProjectPreview[]>([]);
  const [starredProjects, setStarredProjects] = useState<ProjectPreview[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<ChatPreview | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [chatsRes, projectsRes] = await Promise.all([
        fetch('/api/chats?isRandom=true&limit=20'),
        fetch('/api/projects?limit=50'),
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
        body: JSON.stringify({ title: 'New Chat' }),
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

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-[#12121a] border border-[#2a2a3a]"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle sidebar"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
        </svg>
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="p-4 flex flex-col h-full">
          {/* Logo/Title */}
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xl font-bold glow-text" style={{ color: 'var(--color-accent)' }}>
              Strubloid
            </span>
          </div>

          {/* New Chat Button */}
          <button
            onClick={createNewChat}
            className="btn-primary w-full py-2 px-4 rounded-lg mb-6 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div className="flex items-center justify-between px-3 mb-2">
                <span className="section-header" style={{ padding: '0 0 8px 0' }}>Projects</span>
                <Link
                  href="/projects"
                  className="text-xs text-[--color-accent] hover:underline"
                >
                  View all
                </Link>
              </div>
              <div className="space-y-1">
                {isLoading ? (
                  <div className="chat-item opacity-50">Loading...</div>
                ) : projects.length === 0 ? (
                  <div className="chat-item opacity-50">No projects</div>
                ) : (
                  projects.slice(0, 10).map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className={`chat-item block ${isActiveProject(project.id) ? 'active' : ''}`}
                      onClick={() => setMobileOpen(false)}
                    >
                      <span
                        className="inline-block w-2 h-2 rounded-full mr-2"
                        style={{ backgroundColor: project.color }}
                      />
                      {project.name}
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* Starred Projects */}
            {starredProjects.length > 0 && (
              <div className="mb-6">
                <div className="section-header flex items-center gap-2">
                  <svg className="w-4 h-4" fill="#fbbf24" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  Starred
                </div>
                <div className="space-y-1">
                  {starredProjects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className={`chat-item block ${isActiveProject(project.id) ? 'active' : ''}`}
                      onClick={() => setMobileOpen(false)}
                    >
                      <span
                        className="inline-block w-2 h-2 rounded-full mr-2"
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
          <div className="pt-4 border-t border-[--color-border] space-y-2">
            <Link
              href="/settings"
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[--color-bg-tertiary] transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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
