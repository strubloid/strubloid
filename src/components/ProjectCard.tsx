'use client';

interface ProjectCardProps {
  id: string;
  name: string;
  color: string;
  isStarred: boolean;
  chatCount: number;
  lastChatTitle?: string | null;
  lastChatAt?: string | null;
  onToggleStar: (isStarred: boolean) => void;
  onClick: () => void;
}

export function ProjectCard({
  name,
  color,
  isStarred,
  chatCount,
  lastChatTitle,
  lastChatAt,
  onToggleStar,
  onClick,
}: ProjectCardProps) {
  return (
    <div
      onClick={onClick}
      className="project-card p-4 rounded-lg border border-[--color-border] bg-[--color-bg-secondary] cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <div
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <h3 className="font-semibold text-[--color-text]">{name}</h3>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar(!isStarred);
          }}
          className={`star-btn p-1 ${isStarred ? 'starred' : 'text-[--color-text-dim]'}`}
          aria-label={isStarred ? 'Unstar project' : 'Star project'}
        >
          <svg
            className="w-5 h-5"
            fill={isStarred ? 'currentColor' : 'none'}
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
      </div>

      <div className="text-sm text-[--color-text-dim]">
        <span>{chatCount} chat{chatCount !== 1 ? 's' : ''}</span>
        {lastChatTitle && (
          <span className="ml-2">
            • Last: {lastChatTitle.length > 30
              ? `${lastChatTitle.slice(0, 30)}...`
              : lastChatTitle}
          </span>
        )}
      </div>

      {lastChatAt && (
        <div className="text-xs text-[--color-text-dim] mt-1">
          {new Date(lastChatAt).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}
