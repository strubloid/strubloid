import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon = '✦', title, description, action }: EmptyStateProps) {
  return (
    <div className="cw-empty">
      <div className="mb-4 text-5xl opacity-60">{icon}</div>
      <h2 className="text-2xl font-bold">{title}</h2>
      {description && <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--cw-muted)]">{description}</p>}
      {action && <div className="cw-actions justify-center">{action}</div>}
    </div>
  );
}
