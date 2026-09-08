import { useT } from '../../i18n/LanguageContext';
import styles from './ProgressBar.module.css';

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  label?: string;
  showValue?: boolean;
}

export function ProgressBar({
  value,
  max = 100,
  color,
  label,
  showValue = false,
}: ProgressBarProps) {
  const t = useT();
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={styles.container}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.track}>
        <div
          className={styles.fill}
          style={{
            width: `${pct}%`,
            backgroundColor: color || 'var(--color-primary-light)',
          }}
        />
      </div>
      {showValue && <span className={styles.value}>{t('progress.value', { value: Math.round(pct) })}</span>}
    </div>
  );
}
