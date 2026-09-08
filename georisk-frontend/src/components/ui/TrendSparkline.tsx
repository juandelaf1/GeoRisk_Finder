import type { TrendPoint } from '../../types';
import { useT } from '../../i18n/LanguageContext';
import styles from './TrendSparkline.module.css';

interface Props {
  data: TrendPoint[];
  width?: number;
  height?: number;
  color?: string;
  showAxis?: boolean;
}

export function TrendSparkline({
  data,
  width = 120,
  height = 30,
  color,
  showAxis = false,
}: Props) {
  const t = useT();
  if (data.length < 2) return null;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const padding = 2;
  const viewW = width - padding * 2;
  const viewH = height - padding * 2;

  const points = data
    .map((d, i) => {
      const x = padding + (i / (data.length - 1)) * viewW;
      const y = padding + viewH - ((d.value - min) / range) * viewH;
      return `${x},${y}`;
    })
    .join(' ');

  const defaultColor = color || '#01696F';
  const isDown = data.length >= 2 && data[data.length - 1].value < data[0].value;
  const strokeColor = isDown ? '#A84B2F' : defaultColor;

  const firstDate = data[0]?.date?.slice(0, 5) || '';
  const lastDate = data[data.length - 1]?.date?.slice(0, 5) || '';

  return (
    <div className={styles.wrapper}>
      <svg
        className={styles.svg}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-label={t('sparkline.ariaLabel')}
      >
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        {showAxis && (
          <>
            <text
              x={padding}
              y={height - 1}
              fontSize={7}
              fill="rgba(255,255,255,0.3)"
              fontFamily="var(--font-mono)"
            >
              {firstDate}
            </text>
            <text
              x={width - padding}
              y={height - 1}
              fontSize={7}
              fill="rgba(255,255,255,0.3)"
              fontFamily="var(--font-mono)"
              textAnchor="end"
            >
              {lastDate}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}
