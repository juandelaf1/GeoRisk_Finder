import { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store';
import { fetchSearch } from '../../api/client';
import { useT, useLang } from '../../i18n/LanguageContext';
import styles from './Topbar.module.css';

export function Topbar() {
  const { toggleSidebar, auth, openAuthModal, logout } = useStore();
  const t = useT();
  const { lang, setLang } = useLang();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{ key: string; label: string }[]>([]);
  const [searched, setSearched] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); setSearched(false); return; }
    const timer = setTimeout(async () => {
      const res = await fetchSearch(query);
      setSuggestions(res.map((r) => ({ key: r.key, label: r.label })));
      setSearched(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const selectSuggestion = async (label: string) => {
    setQuery(label);
    setSuggestions([]);
    const results = await fetchSearch(label);
    if (results.length > 0) {
      const r = results[0];
      useStore.getState().setViewState({
        latitude: r.lat, longitude: r.lon, zoom: 5, bearing: 0, pitch: 0,
      });
    }
  };

  useEffect(() => {
    const cb = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setSuggestions([]);
    };
    document.addEventListener('mousedown', cb);
    return () => document.removeEventListener('mousedown', cb);
  }, []);

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <button className={styles.iconBtn} onClick={toggleSidebar} title={t('topbar.toggleSidebar')}>
          ☰
        </button>
        <span className={styles.logo}>{t('topbar.title')}</span>
      </div>
      <div className={styles.center} ref={ref}>
        <input
          className={styles.search}
          type="text"
          placeholder={t('topbar.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={async (e) => {
            if (e.key === 'Enter' && suggestions.length > 0) {
              selectSuggestion(suggestions[0].label);
            }
          }}
        />
        {suggestions.length > 0 && (
          <div className={styles.suggestions}>
            {suggestions.map((s) => (
              <div
                key={s.key}
                className={styles.suggestion}
                onClick={() => selectSuggestion(s.label)}
              >
                {s.label}
              </div>
            ))}
          </div>
        )}
        {searched && suggestions.length === 0 && query.length >= 2 && (
          <div className={styles.suggestions}>
            <div className={styles.noResults}>{t('topbar.noResults')}</div>
          </div>
        )}
      </div>
      <div className={styles.right}>
        <div className={styles.langSwitch}>
          <button
            className={`${styles.langBtn} ${lang === 'es' ? styles.langBtnActive : ''}`}
            onClick={() => setLang('es')}
          >
            ES
          </button>
          <button
            className={`${styles.langBtn} ${lang === 'en' ? styles.langBtnActive : ''}`}
            onClick={() => setLang('en')}
          >
            EN
          </button>
        </div>
        {auth.isAuthenticated ? (
          <div className={styles.userMenu}>
            <span className={styles.userName}>{auth.user?.name}</span>
            <span className={styles.userRole}>{auth.user?.role}</span>
            <button className={styles.iconBtn} onClick={logout} title={t('topbar.signOut')}>🚪</button>
          </div>
        ) : (
          <button className={styles.loginBtn} onClick={openAuthModal}>
            {t('topbar.signIn')}
          </button>
        )}
      </div>
    </header>
  );
}
