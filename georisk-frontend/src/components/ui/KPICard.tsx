import styles from './KPICard.module.css';

interface KPICardProps {
  label: string;
  value: string | number;
  delta?: string;
  trend?: 'up' | 'down';
}

export function KPICard({ label, value, delta, trend }: KPICardProps) {
  return (
    <div className={styles.card}>
      <span className={styles.value}>{value}</span>
      <span className={styles.label}>{label}</span>
      {delta && (
        <span className={`${styles.delta} ${trend === 'up' ? styles.up : styles.down}`}>
          {trend === 'up' ? '↑' : '↓'} {delta}
        </span>
      )}
    </div>
  );
}
