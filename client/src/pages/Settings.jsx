import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useEncryption } from '../context/EncryptionContext.jsx';
import { api } from '../services/api.js';

export default function Settings() {
  const { user, refresh, logout } = useAuth();
  const { locked, lock } = useEncryption();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [theme, setTheme] = useState(user?.preferences?.theme || 'system');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function save(event) {
    event.preventDefault();
    setError('');
    try {
      await api('/settings', { method:'PUT', body:JSON.stringify({ displayName, preferences:{ theme } }) });
      await refresh();
      setMessage('Settings saved.');
    } catch (err) { setError(err.message); }
  }

  async function deleteAccount() {
    if (!window.confirm('Delete your account and all stored account data? This cannot be undone.')) return;
    if (!window.confirm('Encrypted backups may remain for up to 30 days. Continue with permanent account deletion?')) return;
    try {
      await api('/settings/account', { method:'DELETE' });
      await logout();
      navigate('/');
    } catch (err) { setError(err.message); }
  }

  return (
    <div className="page settings-page">
      <header className="page-header"><div><span className="eyebrow">Account</span><h1>Settings & privacy</h1></div></header>
      <section className="panel settings-section"><h2>Profile</h2><form onSubmit={save}>
        <label>Display name<input value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={80} /></label>
        <label>Theme<select value={theme} onChange={e => setTheme(e.target.value)}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
        {message && <p className="success-state">{message}</p>} {error && <div className="form-error" role="alert">{error}</div>}
        <button className="button primary">Save preferences</button>
      </form></section>
      <section className="panel settings-section"><h2>Journal encryption</h2><p>{locked ? 'Your journal key is locked.' : 'Your journal key is unlocked in memory.'}</p><p>Never share or lose the passphrase. Losing it may make encrypted journal entries permanently unrecoverable.</p>{!locked && <button className="button ghost" onClick={lock}>Lock encryption key</button>}</section>
      <section className="panel danger-section"><h2>Delete account</h2><p>This deletes the account and owned application records. Encrypted database backups, if used, may remain for up to 30 days before permanent purge.</p><button className="button danger" onClick={deleteAccount}>Delete my account</button></section>
    </div>
  );
}
