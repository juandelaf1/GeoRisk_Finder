import type { ReactNode } from 'react';

export function Callout({ title, children, variant = 'info' }: { title?: string; children: ReactNode; variant?: 'info' | 'warn' }) {
  return (
    <div className={variant === 'warn' ? 'callout-warn' : 'callout'}>
      {title && <h4>{title}</h4>}
      {children}
    </div>
  );
}
