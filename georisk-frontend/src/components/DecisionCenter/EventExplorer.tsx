import { useState, useEffect } from 'react';
import { useT } from '../../i18n/LanguageContext';
import type { RiskCell, HazardEvent } from '../../types';
import { useStore } from '../../store';
import { fetchJSON } from '../../utils/fetchJSON';
import styles from './DecisionCenter.module.css';

interface Props {
  cell: RiskCell;
}

const TYPE_ICONS: Record<string, string> = {
  earthquake: '\uD83C\uDF0D',
  cyclone: '\uD83C\uDF00',
  volcano: '\uD83C\uDF0B',
  flood: '\uD83C\uDF2A\uFE0F',
};

export function EventExplorer({ cell }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [events, setEvents] = useState<HazardEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const setSelectedEvent = useStore((s) => s.setSelectedEvent);
  const cellId = cell.cell_id || `${cell.lat.toFixed(2)}-${cell.lon.toFixed(2)}`;
  const t = useT();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchJSON<HazardEvent[]>(`/events/${cellId}`)
      .then((data) => { if (!cancelled) setEvents(data); })
      .catch(() => { if (!cancelled) setEvents([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [cellId]);

  if (loading) {
    return <div className={styles.contingencyEmpty}><span className={styles.contingencyEmptyText}>{t('events.loading')}</span></div>;
  }

  if (events.length === 0) {
    return (
      <div className={styles.contingencyEmpty}>
        <span className={styles.contingencyEmptyIcon}>\uD83D\uDD0D</span>
        <span className={styles.contingencyEmptyText}>{t('events.empty')}</span>
      </div>
    );
  }

  return (
    <div className={styles.eventTable}>
      {events.map((evt) => {
        const isExpanded = expanded === evt.id;
        return (
          <div
            key={evt.id}
            className={`${styles.eventRow} ${isExpanded ? styles.eventRowExpanded : ''}`}
            onClick={() => {
              setExpanded(isExpanded ? null : evt.id);
              setSelectedEvent(evt);
            }}
          >
            <div className={styles.eventRowHeader}>
              <span className={styles.eventType}>{TYPE_ICONS[evt.type] ?? '\uD83D\uDCA5'}</span>
              <span className={styles.eventTitle}>{evt.title}</span>
              <span className={styles.eventMagnitude}>{evt.magnitude.toFixed(1)}</span>
            </div>
            {isExpanded && (
              <div className={styles.eventDetails}>
                <div className={styles.eventCell}>
                  <span className={styles.eventCellLabel}>{t('events.type')}</span>
                  <span className={styles.eventCellValue}>{evt.type}</span>
                </div>
                <div className={styles.eventCell}>
                  <span className={styles.eventCellLabel}>{t('events.date')}</span>
                  <span className={styles.eventCellValue}>{evt.date}</span>
                </div>
                <div className={styles.eventCell}>
                  <span className={styles.eventCellLabel}>{t('events.distance')}</span>
                  <span className={styles.eventCellValue}>{evt.distance} {t('events.km')}</span>
                </div>
                <div className={styles.eventCell}>
                  <span className={styles.eventCellLabel}>{t('events.source')}</span>
                  <span className={styles.eventCellValue}>{evt.source}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
