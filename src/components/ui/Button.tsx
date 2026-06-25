import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  href?: string;
  children: ReactNode;
}

function classes(variant: ButtonVariant, className?: string) {
  const variantClass = variant === 'primary'
    ? 'cw-button-primary'
    : variant === 'danger'
      ? 'cw-button-danger'
      : '';
  return ['cw-button', variantClass, className].filter(Boolean).join(' ');
}

export function Button({ variant = 'secondary', href, className, children, ...props }: ButtonProps) {
  if (href) {
    return (
      <Link href={href} className={classes(variant, className)}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes(variant, className)} {...props}>
      {children}
    </button>
  );
}
