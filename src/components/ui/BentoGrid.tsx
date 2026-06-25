import type { ReactNode } from 'react';

export function BentoGrid({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`cw-grid ${className}`}>{children}</div>;
}
