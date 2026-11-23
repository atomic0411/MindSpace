import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, LockKeyhole, Plus, Search, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useEncryption } from '../context/EncryptionContext.jsx';
import { api } from '../services/api.js';
import { decryptPayload, encryptPayload } from '../utils/encryption.js';
import { deleteEncryptedDraft, getEncryptedDraft, saveEncryptedDraft } from '../services/drafts.js';

const DRAFT_ID = 'current-journal-draft';

export default function Journal() {
  const { user } = useAuth();
  const { locked, dek, setup, unlock, lock } = useEncryption();
  const [mode, setMode] = useState('list');
  const [entries, setEntries] = useState([]);
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [error, setError] = useState('');
  const [saveState, setSaveState] = useState('');
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({ title: '', body: '', tags: '', mood: '', prompt: '' });
  const debounceRef = useRef(null);

  const needsSetup = !user?.encryptionMetadata?.wrappedDek;

  async function configure(event) {
    event.preventDefault();
    setError('');
    if (needsSetup && passphrase.length < 12) return setError('Use at least 12 characters for the encryption passphrase.');
    if (needsSetup && passphrase !== confirmPassphrase) return setError('The passphrases do not match.');
    try {
      if (needsSetup) await setup(passphrase);
      else await unlock(passphrase);
      setPassphrase('');
      setConfirmPassphrase('');
      await loadEntries();
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (!locked && dek) loadEntries();
  }, [locked, dek]);

  async function loadEntries() {
    if (!dek) return;
    const data = await api('/journals?limit=50');
    const decrypted = await Promise.all(data.entries.map(async entry => ({
      ...entry,
      payload: await decryptPayload(dek, entry)
    })));
    setEntries(decrypted);
  }

  useEffect(() => {
    if (mode !== 'editor' || locked || !dek) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!draft.title && !draft.body) return;
      setSaveState('Encrypting draft...');
      try {
        const envelope = await encryptPayload(dek, draft);
        await saveEncryptedDraft(DRAFT_ID, envelope);
        setSaveState('Encrypted draft saved locally');
      } catch {
        setSaveState('Draft could not be saved');
      }
    }, 700);
    return () => clearTimeout(debounceRef.current);
  }, [draft, mode, locked, dek]);

  async function openEditor(entry = null) {
    setError('');
    if (entry) {
      setEditing(entry);
      setDraft(entry.payload);
    } else {
      setEditing(null);
      const saved = await getEncryptedDraft(DRAFT_ID);
      if (saved) {
        try {
          setDraft(await decryptPayload(dek, saved));
        } catch {
          setDraft({ title: '', body: '', tags: '', mood: '', prompt: '' });
        }
      } else {
        setDraft({ title: '', body: '', tags: '', mood: '', prompt: '' });
      }
    }
    setMode('editor');
  }

  async function saveEntry(event) {
    event.preventDefault();
    setSaveState('Syncing...');
    try {
      const envelope = await encryptPayload(dek, draft);
      if (editing) {
        await api(`/journals/${editing._id}`, { method: 'PUT', body: JSON.stringify({ ...envelope, entryDate: editing.entryDate }) });
      } else {
        await api('/journals', { method: 'POST', body: JSON.stringify({ ...envelope, entryDate: new Date().toISOString() }) });
      }
      await deleteEncryptedDraft(DRAFT_ID);
      setSaveState('Saved');
      setMode('list');
      await loadEntries();
    } catch (err) {
      setSaveState('');
      setError(err.message);
    }
  }

  async function removeEntry(entry) {
    if (!window.confirm('Delete this journal entry? This cannot be undone.')) return;
    await api(`/journals/${entry._id}`, { method: 'DELETE' });
    await loadEntries();
  }

  function exportEntry(entry) {
    if (!window.confirm('Exporting creates an unencrypted file. Anyone with the file may read it. Continue?')) return;
    const blob = new Blob([JSON.stringify(entry.payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mindspace-entry-${entry.entryDate.slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const filtered = useMemo(() => entries.filter(entry => {
    const haystack = JSON.stringify(entry.payload).toLowerCase();
    const matchesQuery = haystack.includes(query.toLowerCase());
    const matchesDate = !dateFilter || entry.entryDate.slice(0, 10) === dateFilter;
    return matchesQuery && matchesDate;
  }), [entries, query, dateFilter]);

  if (locked) {
    return (
      <div className="page">
        <header className="page-header"><div><span className="eyebrow">Private journal</span><h1>{needsSetup ? 'Protect your journal' : 'Unlock your journal'}</h1></div></header>
        <article className="panel key-panel">
          <span className="auth-icon"><LockKeyhole /></span>
          <h2>{needsSetup ? 'Create an encryption passphrase' : 'Enter your encryption passphrase'}</h2>
          <p>{needsSetup
            ? 'This separate passphrase encrypts your journal in this browser. Losing it may make your entries permanently unrecoverable.'
            : 'The passphrase is used only in memory and is not sent to the server.'}</p>
          <form onSubmit={configure}>
            <label>Encryption passphrase<input type="password" autoComplete={needsSetup ? 'new-password' : 'current-password'} value={passphrase} onChange={e => setPassphrase(e.target.value)} required /></label>
            {needsSetup && <label>Confirm passphrase<input type="password" autoComplete="new-password" value={confirmPassphrase} onChange={e => setConfirmPassphrase(e.target.value)} required /></label>}
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="button primary" type="submit">{needsSetup ? 'Create private key' : 'Unlock'}</button>
          </form>
        </article>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <div><span className="eyebrow">Private journal</span><h1>Your reflections</h1></div>
        <div className="header-actions"><button className="button ghost" onClick={lock}>Lock</button><button className="button primary" onClick={() => openEditor()}><Plus size={17} /> New entry</button></div>
      </header>
      {mode === 'editor' ? (
        <form className="journal-editor panel" onSubmit={saveEntry}>
          <div className="editor-toolbar"><button type="button" className="text-link" onClick={() => setMode('list')}>← Back</button><span className="save-state" aria-live="polite">{saveState}</span></div>
          <input className="title-input" placeholder="Untitled reflection" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} />
          <input className="prompt-input" placeholder="Optional guided prompt" value={draft.prompt} onChange={e => setDraft({ ...draft, prompt: e.target.value })} />
          <textarea placeholder="Write freely..." value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })} />
          <div className="editor-fields">
            <label>Tags<input value={draft.tags} onChange={e => setDraft({ ...draft, tags: e.target.value })} placeholder="rest, work, gratitude" /></label>
            <label>Related mood<select value={draft.mood} onChange={e => setDraft({ ...draft, mood: e.target.value })}><option value="">Not associated</option><option>Very low</option><option>Low</option><option>Okay</option><option>Good</option><option>Excellent</option></select></label>
          </div>
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="button primary" type="submit">Save encrypted entry</button>
        </form>
      ) : (
        <>
          <div className="journal-tools">
            <label className="search-box"><Search size={17} /><input aria-label="Search decrypted entries" placeholder="Search your unlocked entries" value={query} onChange={e => setQuery(e.target.value)} /></label>
            <input aria-label="Filter by date" type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
          </div>
          {filtered.length === 0 ? (
            <article className="panel empty-state"><h2>A blank page is enough</h2><p>{entries.length ? 'No entries match these filters.' : 'Write when you are ready. Nothing is uploaded until encryption is complete.'}</p><button className="button primary" onClick={() => openEditor()}>Write a reflection</button></article>
          ) : (
            <div className="journal-list">
              {filtered.map(entry => (
                <article className="journal-card panel" key={entry._id}>
                  <button className="card-main" onClick={() => openEditor(entry)}>
                    <time>{new Date(entry.entryDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</time>
                    <h2>{entry.payload.title || 'Untitled reflection'}</h2>
                    <p>{entry.payload.body?.slice(0, 180) || 'No text yet.'}</p>
                    {entry.payload.tags && <span className="tag-row">{entry.payload.tags}</span>}
                  </button>
                  <div className="card-actions">
                    <button aria-label="Export entry" onClick={() => exportEntry(entry)}><Download size={16} /></button>
                    <button aria-label="Delete entry" onClick={() => removeEntry(entry)}><Trash2 size={16} /></button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
