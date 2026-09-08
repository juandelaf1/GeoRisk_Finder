import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { fetchRanking } from '../api/client';

export function useRanking() {
  const ranking = useStore((s) => s.ranking);
  const selectedCluster = useStore((s) => s.selectedCluster);
  const setRanking = useStore((s) => s.setRanking);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchRanking(50, selectedCluster ?? undefined)
      .then((data) => {
        if (!cancelled) {
          setRanking(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedCluster, setRanking]);

  return { ranking, loading };
}
