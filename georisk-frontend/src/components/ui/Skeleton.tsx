interface SkeletonProps {
  lines?: number;
  short?: boolean;
  card?: boolean;
  className?: string;
}

export function Skeleton({ lines = 3, short = false, card = false, className = '' }: SkeletonProps) {
  const content = (
    <>
      <div className="skeleton skeleton-title" />
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className={`skeleton ${short ? 'skeleton-text-short' : 'skeleton-text'}`} style={{ width: short ? undefined : `${85 - i * 12}%` }} />
      ))}
    </>
  );

  if (card) {
    return <div className={`skeleton-card ${className}`}>{content}</div>;
  }
  return <div className={className}>{content}</div>;
}

export function EmptyState({ icon = '📭', title, description }: { icon?: string; title: string; description?: string }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <div className="empty-state-title">{title}</div>
      {description && <div className="empty-state-desc">{description}</div>}
    </div>
  );
}
