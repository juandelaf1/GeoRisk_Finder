import styles from './ConfidenceMeter.module.css';

interface Props {
  level: 'low' | 'medium' | 'high';
  value: number;
  label: string;
}

export function ConfidenceMeter({ level, value, label }: Props) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        <span className={`${styles.value} ${styles[level]}`}>
          {value}% · {level}
        </span>
      </div>
      <div className={styles.track}>
        <div
          className={styles.fill}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
