import { getClusterProfile } from '../../data/clusterProfiles';
import styles from './ClusterBadge.module.css';

interface Props {
  cluster: number | undefined | null;
}

export function ClusterBadge({ cluster }: Props) {
  const profile = getClusterProfile(cluster);

  return (
    <span
      className={styles.badge}
      style={{
        backgroundColor: `${profile.color}22`,
        color: profile.color,
        border: `1px solid ${profile.color}44`,
      }}
      title={profile.name}
    >
      <span className={styles.icon}>{profile.icon}</span>
      {profile.nameShort}
    </span>
  );
}
