import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../../store';
import { fetchSearch } from '../../api/client';
import { useT } from '../../i18n/LanguageContext';
import type { SearchResult } from '../../types';
import styles from './CommandBar.module.css';

const RECENT_KEY = 'georisk_recent_searches';

function loadRecent(): SearchResult[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveRecent(result: SearchResult) {
  const recent = loadRecent().filter((r) => r.key !== result.key);
  recent.unshift(result);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 10)));
}

export function CommandBar() {
  const { search, closeSearch, setSearchResults, setViewState } = useStore();
  const t = useT();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (search.open) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [search.open]);

  useEffect(() => {
    if (!search.open) return;
    if (!query.trim()) {
      setResults(loadRecent());
      setSelectedIndex(0);
      return;
    }
    setLoading(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await fetchSearch(query);
        setResults(data);
        setSearchResults(data);
        setSelectedIndex(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [query, search.open, setSearchResults]);

  const selectResult = useCallback(
    (result: SearchResult) => {
      saveRecent(result);
      setViewState({ latitude: result.lat, longitude: result.lon, zoom: 5, bearing: 0, pitch: 0 });
      closeSearch();
    },
    [setViewState, closeSearch],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      selectResult(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      closeSearch();
    }
  };

  if (!search.open) return null;

  return (
    <div className={styles.overlay} onClick={closeSearch}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className={styles.input}
          type="text"
          placeholder={t('commandBar.placeholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {loading && <div className={styles.loading}>{t('commandBar.searching')}</div>}
        <div className={styles.results}>
          {!loading && results.length === 0 && query.trim() && (
            <div className={styles.empty}>{t('commandBar.noResults')}</div>
          )}
          {!loading && results.length === 0 && !query.trim() && (
            <div className={styles.empty}>{t('commandBar.typeToSearch')}</div>
          )}
          {results.map((result, i) => (
            <div
              key={result.key}
              className={`${styles.result} ${i === selectedIndex ? styles.selected : ''}`}
              onClick={() => selectResult(result)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <span className={styles.resultLabel}>{result.label}</span>
              <span className={styles.resultCoords}>
                {result.lat.toFixed(2)}, {result.lon.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
        <div className={styles.footer}>
          <span>{t('commandBar.navigate')}</span>
          <span>{t('commandBar.select')}</span>
          <span>{t('commandBar.close')}</span>
        </div>
      </div>
    </div>
  );
}
