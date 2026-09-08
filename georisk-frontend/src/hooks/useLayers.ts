import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import { fetchLayers, fetchProjectedLayers } from '../api/client';

let projectedAbort: AbortController | null = null;

export function useLayers() {
  const { setLayers, setViewState, setLoading, setProjectedLayers } = useStore();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchLayers()
      .then((data) => {
        if (!cancelled) {
          setLayers(data.layers);
          setViewState(data.view_state);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load layers:', err);
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [setLayers, setViewState, setLoading]);

  const year = useStore((s) => s.timeline.year);
  const scenario = useStore((s) => s.scenario.active);
  const playing = useStore((s) => s.timeline.playing);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (projectedAbort) projectedAbort.abort();
    clearTimeout(debounceRef.current);

    if (playing) {
      debounceRef.current = setTimeout(() => {
        doFetch(year, scenario, setProjectedLayers);
      }, 800);
    } else {
      doFetch(year, scenario, setProjectedLayers);
    }

    return () => {
      clearTimeout(debounceRef.current);
      if (projectedAbort) projectedAbort.abort();
    };
  }, [year, scenario, playing, setProjectedLayers]);
}

function doFetch(
  year: number,
  scenario: string,
  setProjectedLayers: (data: any) => void,
) {
  if (projectedAbort) projectedAbort.abort();
  projectedAbort = new AbortController();
  const signal = projectedAbort.signal;

  fetchProjectedLayers(year, scenario, signal)
    .then((data) => {
      if (!signal.aborted) setProjectedLayers(data);
    })
    .catch(() => {});
}
