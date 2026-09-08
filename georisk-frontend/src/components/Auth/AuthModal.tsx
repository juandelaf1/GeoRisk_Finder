import { useState } from 'react';
import { useStore } from '../../store';
import { useT } from '../../i18n/LanguageContext';
import styles from './AuthModal.module.css';

export function AuthModal() {
  const t = useT();
  const { auth, closeAuthModal, login, setAuth } = useStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('ngo');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!auth.showAuthModal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const ok = await login(email, password);
        if (!ok) setError(t('auth.loginError'));
      } else {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name, role }),
        });
        if (!res.ok) {
          const err = await res.json();
          setError(err.error || t('auth.registerError'));
        } else {
          const data = await res.json();
          localStorage.setItem('georisk_token', data.token);
          setAuth({ user: data.user, token: data.token, isAuthenticated: true });
        }
      }
    } catch {
      setError(t('auth.connectionError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={closeAuthModal}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={closeAuthModal}>{t('auth.close')}</button>
        <h2 className={styles.title}>
          {mode === 'login' ? t('auth.signIn') : t('auth.createAccount')}
        </h2>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`}
            onClick={() => setMode('login')}
          >{t('auth.signInTab')}</button>
          <button
            className={`${styles.tab} ${mode === 'register' ? styles.tabActive : ''}`}
            onClick={() => setMode('register')}
          >{t('auth.registerTab')}</button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {mode === 'register' && (
            <input
              className={styles.input}
              type="text"
              placeholder={t('auth.fullName')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          <input
            className={styles.input}
            type="email"
            placeholder={t('auth.email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className={styles.input}
            type="password"
            placeholder={t('auth.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {mode === 'register' && (
            <div className={styles.roleGroup}>
              <label className={styles.roleLabel}>{t('auth.role')}</label>
              <div className={styles.roles}>
                {[
                  { id: 'government', label: t('auth.roleGovernment') },
                  { id: 'insurer', label: t('auth.roleInsurance') },
                  { id: 'ngo', label: t('auth.roleNgo') },
                  { id: 'admin', label: t('auth.roleAdmin') },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`${styles.roleBtn} ${role === r.id ? styles.roleBtnActive : ''}`}
                    onClick={() => setRole(r.id)}
                  >
                    <span>{r.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <div className={styles.error}>{error}</div>}

          <button
            className={styles.submitBtn}
            type="submit"
            disabled={loading}
          >
            {loading ? t('auth.submitting') : mode === 'login' ? t('auth.submitSignIn') : t('auth.submitRegister')}
          </button>
        </form>

        <div className={styles.demo}>
          <strong>{t('auth.demoAccounts')}</strong><br />
          {t('auth.demoAdmin')}<br />
          {t('auth.demoGov')}<br />
          {t('auth.demoInsurer')}<br />
          {t('auth.demoNgo')}
        </div>
      </div>
    </div>
  );
}
