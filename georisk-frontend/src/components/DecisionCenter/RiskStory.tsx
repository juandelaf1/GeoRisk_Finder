import { useState, useMemo } from 'react';
import { useT } from '../../i18n/LanguageContext';
import type { RiskCell } from '../../types';
import { ClusterBadge } from '../ui/ClusterBadge';
import styles from './DecisionCenter.module.css';

interface Props {
  cell: RiskCell;
}

interface StoryCard {
  id: string;
  title: string;
  icon: string;
  content: React.ReactNode;
}

export function RiskStory({ cell }: Props) {
  const t = useT();
  const [openCard, setOpenCard] = useState<string>('location');

  const score = cell.risk_score ?? 0;
  const scorePct = Math.round(score * 100);

  const eq = cell.n_earthquakes ?? 0;
  const cyc = cell.n_cyclones ?? 0;
  const vol = cell.n_volcanoes ?? 0;

    const hazardLabels = [
    eq > 0 ? t('riskStory.earthquakeEvents', { eq: String(eq) }) : null,
    cyc > 0 ? t('riskStory.cycloneEvents', { cyc: String(cyc) }) : null,
    vol > 0 ? t('riskStory.volcanoEvents', { vol: String(vol) }) : null,
  ].filter(Boolean);

  const hazardIcons = [
    eq > 0 ? '\uD83C\uDF0D' : null,
    cyc > 0 ? '\uD83C\uDF00' : null,
    vol > 0 ? '\uD83C\uDF0B' : null,
  ].filter(Boolean);

  const cards: StoryCard[] = useMemo(() => [
    {
      id: 'location',
      icon: '\uD83D\uDCCD',
      title: t('riskStory.thisLocation'),
      content: (
        <div>
          <ClusterBadge cluster={cell.kmeans_cluster} />
          <p className={styles.narrative} style={{ marginTop: 8 }}>
            {t('riskStory.riskScore')} <strong>{scorePct}/100</strong>
          </p>
        </div>
      ),
    },
    {
      id: 'hazards',
      icon: '\u26A0\uFE0F',
      title: t('riskStory.because'),
      content: (
        <div>
          {hazardLabels.length > 0 ? hazardLabels.map((h, i) => (
            <div key={i} className={styles.hazardRow}>
              <span className={styles.hazardLabel}>{hazardIcons[i]}</span>
              <span className={styles.hazardCount}>{h}</span>
            </div>
          )) : (
            <p className={styles.narrative}>{t('riskStory.noEvents')}</p>
          )}
        </div>
      ),
    },
  ], [cell]);

  return (
    <div className={styles.storySection}>
      {cards.map((card) => {
        const isOpen = openCard === card.id;
        return (
          <div
            key={card.id}
            className={`${styles.storyCard} ${isOpen ? styles.storyCardOpen : ''}`}
          >
            <button
              className={styles.storyCardHeader}
              onClick={() => setOpenCard(isOpen ? '' : card.id)}
            >
              <span className={styles.storyCardIcon}>{card.icon}</span>
              <span className={styles.storyCardTitle}>{card.title}</span>
              <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}>
                ▸
              </span>
            </button>
            {isOpen && (
              <div className={styles.storyCardBody}>
                {card.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
