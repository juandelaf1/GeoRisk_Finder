import { useRef, useEffect, useCallback } from 'react';
import { useStore } from '../../store';
import { useT } from '../../i18n/LanguageContext';
import styles from './TimelineBar.module.css';

const MIN_YEAR = 2024;
const MAX_YEAR = 2100;
const STEP = 1;
const MILESTONES = [2024, 2030, 2050, 2075, 2100];
const PLAY_SPEED = 500;

export function TimelineBar() {
  const t = useT();
  const year = useStore((s) => s.timeline.year);
  const playing = useStore((s) => s.timeline.playing);
  const scenario = useStore((s) => s.scenario);
  const setTimelineYear = useStore((s) => s.setTimelineYear);
  const setTimelinePlaying = useStore((s) => s.setTimelinePlaying);
  const setScenario = useStore((s) => s.setScenario);
  const yearRef = useRef(year);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);

  yearRef.current = year;

  const handlePlay = useCallback(() => {
    setTimelinePlaying(!playing);
  }, [playing, setTimelinePlaying]);

  useEffect(() => {
    if (playing) {
      playRef.current = setInterval(() => {
        const next = yearRef.current >= MAX_YEAR ? MIN_YEAR : yearRef.current + 1;
        setTimelineYear(next);
      }, PLAY_SPEED);
    }
    return () => {
      if (playRef.current) clearInterval(playRef.current);
    };
  }, [playing, setTimelineYear]);

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTimelineYear(Number(e.target.value));
  };

  const activeScenario = scenario.available.find((s) => s.id === scenario.active);

  return (
    <div className={styles.bar}>
      <div className={styles.inner}>
        <div className={styles.scenarioGroup}>
          <span className={styles.scenarioLabel}>{t('timelineBar.scenarios')}</span>
          {scenario.available.map((sc) => (
            <button
              key={sc.id}
              className={`${styles.scenarioBtn} ${scenario.active === sc.id ? styles.scenarioBtnActive : ''}`}
              style={{
                borderColor: scenario.active === sc.id ? sc.color : undefined,
                color: scenario.active === sc.id ? sc.color : undefined,
              }}
              onClick={() => setScenario(sc.id)}
              title={sc.description}
            >
              {sc.label}
            </button>
          ))}
        </div>

        <button className={styles.playBtn} onClick={handlePlay} title={playing ? t('timelineBar.pauseTooltip') : t('timelineBar.playTooltip')}>
          {playing ? t('timelineBar.pause') : t('timelineBar.play')}
        </button>

        <div className={styles.yearDisplay}>
          <span className={styles.year}>{year}</span>
          <span className={styles.scenarioHint}>{activeScenario?.label || scenario.active}</span>
        </div>

        <div className={styles.track}>
          <input
            type="range"
            min={MIN_YEAR}
            max={MAX_YEAR}
            step={STEP}
            value={year}
            onChange={handleSlider}
            className={styles.slider}
          />
          <div className={styles.milestones}>
            {MILESTONES.map((y) => (
              <span
                key={y}
                className={styles.milestone}
                style={{ left: `${((y - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100}%` }}
              >
                {y}
              </span>
            ))}
          </div>
        </div>

        <span className={styles.speed}>{playing ? t('timelineBar.speed') : ''}</span>
      </div>
    </div>
  );
}
