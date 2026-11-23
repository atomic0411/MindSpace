import { useEffect, useMemo, useState } from 'react';
import { LockKeyhole, Trash2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext.jsx';
import { useEncryption } from '../context/EncryptionContext.jsx';
import { api } from '../services/api.js';
import { decryptPayload, encryptPayload } from '../utils/encryption.js';

const emotions = ['happy','calm','excited','motivated','grateful','anxious','stressed','lonely','sad','frustrated','overwhelmed','tired'];

export default function MoodTracker() {
  const { user } = useAuth();
  const { locked, dek, setup, unlock } = useEncryption();
  const [score, setScore] = useState(3);
  const [intensity, setIntensity] = useState(3);
  const [selected, setSelected] = useState([]);
  const [context, setContext] = useState('');
  const [entries, setEntries] = useState([]);
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const needsSetup = !user?.encryptionMetadata?.wrappedDek;

  async function configure(event) {
    event.preventDefault();
    setError('');
    try {
      if (needsSetup) {
        if (passphrase.length < 12) throw new Error('Use at least 12 characters.');
        if (passphrase !== confirm) throw new Error('The passphrases do not match.');
        await setup(passphrase);
      } else await unlock(passphrase);
      setPassphrase('');
    } catch (err) { setError(err.message); }
  }

  async function load() {
    const data = await api('/moods');
    setEntries(data.entries);
  }

  useEffect(() => { if (!locked && dek) load(); }, [locked, dek]);

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      let encrypted = {};
      if (context) {
        const envelope = await encryptPayload(dek, { context });
        encrypted = { ciphertext: envelope.ciphertext, iv: envelope.iv, encryptionVersion: 1 };
      }
      await api('/moods', { method: 'POST', body: JSON.stringify({ score, intensity, emotions: selected, ...encrypted, recordedAt: new Date().toISOString() }) });
      setContext('');
      setSelected([]);
      await load();
    } catch (err) { setError(err.message); }
  }

  async function remove(entry) {
    await api(`/moods/${entry._id}`, { method: 'DELETE' });
    await load();
  }

  const chartData = useMemo(() => entries.slice().reverse().slice(-14).map(entry => ({
    date: new Date(entry.recordedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    score: entry.score
  })), [entries]);

  const frequency = useMemo(() => emotions.map(name => ({
    name,
    count: entries.filter(entry => entry.emotions?.includes(name)).length
  })).filter(item => item.count).sort((a, b) => b.count - a.count), [entries]);

  if (locked) {
    return (
      <div className="page">
        <header className="page-header"><div><span className="eyebrow">Mood</span><h1>{needsSetup ? 'Protect your private notes' : 'Unlock your mood journal'}</h1></div></header>
        <article className="panel key-panel">
          <span className="auth-icon"><LockKeyhole /></span><h2>{needsSetup ? 'Set up encryption' : 'Enter your encryption passphrase'}</h2>
          <p>Mood free-text notes are encrypted. Score and emotion selections remain private account data and are not journal plaintext.</p>
          <form onSubmit={configure}>
            <label>Encryption passphrase<input type="password" value={passphrase} onChange={e => setPassphrase(e.target.value)} required /></label>
            {needsSetup && <label>Confirm passphrase<input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required /></label>}
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="button primary">{needsSetup ? 'Create private key' : 'Unlock'}</button>
          </form>
        </article>
      </div>
    );
  }

  return (
    <div className="page mood-page">
      <header className="page-header"><div><span className="eyebrow">Mood</span><h1>Check in with yourself</h1></div></header>
      <div className="mood-layout">
        <form className="panel mood-form" onSubmit={submit}>
          <h2>How is today feeling?</h2>
          <div className="score-picker" aria-label="Mood score">
            {[1,2,3,4,5].map(value => <button type="button" key={value} className={score === value ? 'active' : ''} onClick={() => setScore(value)}><strong>{value}</strong><span>{['Very low','Low','Okay','Good','Excellent'][value - 1]}</span></button>)}
          </div>
          <label>Intensity <span>{intensity}</span><input type="range" min="1" max="5" value={intensity} onChange={e => setIntensity(Number(e.target.value))} /></label>
          <fieldset><legend>What emotions are present?</legend><div className="emotion-grid">{emotions.map(name => <button type="button" key={name} className={selected.includes(name) ? 'active' : ''} onClick={() => setSelected(selected.includes(name) ? selected.filter(item => item !== name) : [...selected, name])}>{name}</button>)}</div></fieldset>
          <label>Private context or trigger<textarea value={context} onChange={e => setContext(e.target.value)} placeholder="Optional, encrypted before saving" /></label>
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="button primary">Save check-in</button>
        </form>
        <section className="panel mood-chart">
          <h2>Recent mood</h2>
          {chartData.length ? <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><XAxis dataKey="date" /><YAxis domain={[1,5]} ticks={[1,2,3,4,5]} /><Tooltip /><Line type="monotone" dataKey="score" stroke="#8d82ba" strokeWidth={3} dot={{ r: 4 }} /></LineChart></ResponsiveContainer></div> : <div className="empty-state"><p>No mood check-ins yet.</p></div>}
        </section>
      </div>
      <section className="panel history-panel">
        <h2>Recent check-ins</h2>
        {entries.length === 0 ? <p className="muted">Missing days are simply blank; they do not indicate failure.</p> : <div className="mood-history">{entries.slice(0, 10).map(entry => <article key={entry._id}><time>{new Date(entry.recordedAt).toLocaleDateString()}</time><strong>{entry.score}/5</strong><span>{entry.emotions?.join(', ') || 'No emotions selected'}</span><button aria-label="Delete mood check-in" onClick={() => remove(entry)}><Trash2 size={15} /></button></article>)}</div>}
        {frequency.length > 0 && <div className="frequency"><h3>Emotion frequency</h3>{frequency.slice(0,5).map(item => <span key={item.name}>{item.name} · {item.count}</span>)}</div>}
      </section>
    </div>
  );
}
