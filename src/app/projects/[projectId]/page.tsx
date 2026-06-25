'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageSkeleton } from '@/components/LoadingSkeleton';

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
  chatCount: number;
  chats: Chat[];
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
        body: JSON.stringify({ projectId, title: 'New Chat' })
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
        body: JSON.stringify({ isStarred: !project.isStarred })
      });

      setProject({ ...project, isStarred: !project.isStarred });
      window.dispatchEvent(new CustomEvent('sidebar-refresh'));
    } catch (error) {
      console.error('Failed to toggle star', error);
    }
  }

  if (isLoading) {
    return (
      <main className="flex flex-1 bg-[--color-bg]">
        <PageSkeleton />
      </main>
    );
  }

  if (notFound || !project) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-[--color-bg]">
        <div className="text-6xl font-bold text-[--color-text-dim]">404</div>
        <div className="text-[--color-text-dim]">Project not found</div>
        <Link href="/projects" className="btn-primary rounded-lg px-4 py-2">
          Back to Projects
        </Link>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-[--color-bg]">
      <div className="mx-auto max-w-4xl p-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <div
            className="h-6 w-6 flex-shrink-0 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <p className="text-sm text-[--color-text-dim]">
              {project.chatCount} chat{project.chatCount !== 1 ? 's' : ''}
            </p>
          </div>

          <button
            onClick={toggleStar}
            className={`star-btn p-2 ${project.isStarred ? 'starred' : 'text-[--color-text-dim]'}`}
            title={project.isStarred ? 'Unstar' : 'Star'}
          >
            <svg
              className="h-6 w-6"
              fill={project.isStarred ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </button>

          <Link href="/projects" className="btn-secondary rounded-lg px-3 py-2">
            Back
          </Link>
        </div>

        {/* New Chat Button */}
        <button
          onClick={createChat}
          className="btn-primary mb-6 flex w-full items-center justify-center gap-2 rounded-lg py-3"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </button>

        {/* Chats List */}
        {project.chats.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mb-4 text-6xl opacity-20">💬</div>
            <h3 className="mb-2 text-xl font-semibold">No chats yet</h3>
            <p className="mb-6 text-[--color-text-dim]">Start a conversation to see it here</p>
            <button onClick={createChat} className="btn-primary rounded-lg px-4 py-2">
              Create First Chat
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <h2 className="section-header">Chats</h2>
            {project.chats.map((chat) => (
              <Link
                key={chat.id}
                href={`/chat/${chat.id}`}
                className="flex items-center justify-between rounded-lg border border-[--color-border] bg-[--color-bg-secondary] p-4 transition-colors hover:border-[--color-accent]"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{chat.title}</div>
                  <div className="mt-1 text-xs text-[--color-text-dim]">
                    {chat.messages?.length} messages
                  </div>
                </div>
                <div className="ml-4 text-xs text-[--color-text-dim]">
                  {new Date(chat.updatedAt).toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
