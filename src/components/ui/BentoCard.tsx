import type { ReactNode } from 'react';

type BentoCardSpan = 'featured' | 'half' | 'third' | 'full';

interface BentoCardProps {
  span?: BentoCardSpan;
  label?: string;
  title?: string;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

const spanClass: Record<BentoCardSpan, string> = {
  featured: 'cw-card-featured',
  half: 'cw-card-half',
  third: 'cw-card-third',
  full: 'cw-card-full',
};

export function BentoCard({ span = 'third', label, title, children, actions, className = '' }: BentoCardProps) {
  return (
    <section className={`cw-card ${spanClass[span]} ${className}`}>
      <div className="cw-card-body">
        {label && <div className="cw-card-label">{label}</div>}
        {title && <h2 className="cw-card-title">{title}</h2>}
        {children && <div className="cw-card-copy">{children}</div>}
        {actions && <div className="cw-actions">{actions}</div>}
      </div>
    </section>
  );
}
