import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { api } from '../services/api.js';
import { useEncryption } from '../context/EncryptionContext.jsx';
import { decryptPayload } from '../utils/encryption.js';

const modes = ['Talk','Reflect','Unwind','Reframe','Journal Companion'];

export default function Chatbot() {
  const { locked, dek } = useEncryption();
  const [mode, setMode] = useState('Talk');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [sharedText, setSharedText] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [journalEntries, setJournalEntries] = useState([]);

  useEffect(() => {
    if (locked || !dek) return;
    api('/journals?limit=50').then(data => setJournalEntries(data.entries)).catch(() => setJournalEntries([]));
  }, [locked, dek]);

  async function loadSelectedEntry(entryId) {
    if (!entryId) return setSharedText('');
    if (locked || !dek) return setError('Unlock your journal before selecting text to share.');
    const data = await api('/journals?limit=50');
    const entry = data.entries.find(item => item._id === entryId);
    if (!entry) return;
    const payload = await decryptPayload(dek, entry);
    setSharedText(`${payload.title ? `${payload.title}\n` : ''}${payload.body || ''}`.slice(0,4000));
  }

  async function submit(event) {
    event.preventDefault();
    if (!message.trim()) return;
    setBusy(true);
    setError('');
    try {
      const data = await api('/ai/chat', { method: 'POST', body: JSON.stringify({
        message,
        mode,
        sharedJournalText: sharedText || undefined,
        consentConfirmed: sharedText ? consent : undefined
      }) });
      setMessages(items => [...items, { role: 'user', text: message }, { role: 'assistant', text: data.response, crisis: data.safety === 'crisis' }]);
      setMessage('');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="page chat-page">
      <header className="page-header"><div><span className="eyebrow">AI companion</span><h1>A place to talk</h1></div></header>
      <div className="chat-layout">
        <aside className="panel chat-modes"><h2>Choose a mode</h2>{modes.map(name => <button key={name} className={mode === name ? 'active' : ''} onClick={() => setMode(name)}>{name}</button>)}</aside>
        <section className="chat-panel panel">
          <div className="chat-messages" aria-live="polite">
            {messages.length === 0 ? <div className="empty-state"><h2>Take your time</h2><p>General reflection and support. This companion is not clinical care.</p></div> : messages.map((item,index) => <article key={index} className={`chat-bubble ${item.role} ${item.crisis ? 'crisis' : ''}`}>{item.text}</article>)}
            {busy && <article className="chat-bubble assistant">Thinking gently...</article>}
          </div>
          {sharedText && <div className="share-consent"><strong>Selected journal text is ready to share.</strong><p>The hosted provider will process this text. It is sent only because you selected and consented.</p><label><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /> I consent to sharing this selected text for this request.</label><button onClick={() => { setSharedText(''); setConsent(false); }}>Remove selection</button></div>}
          {!locked && <div className="journal-share"><label>Optional: share one entry<select onChange={e => loadSelectedEntry(e.target.value)}><option value="">Do not share any journal text</option>{journalEntries.map(entry => <option key={entry._id} value={entry._id}>Journal entry {new Date(entry.entryDate).toLocaleDateString()}</option>)}</select></label><small>No journal or mood data is sent unless you select it and confirm consent.</small></div>}
          {error && <div className="form-error" role="alert">{error}</div>}
          <form className="chat-compose" onSubmit={submit}><textarea aria-label="Message" value={message} onChange={e => setMessage(e.target.value)} placeholder={mode === 'Unwind' ? 'What would help you feel a little less activated?' : 'What is on your mind?'} /><button className="button primary" disabled={busy || (sharedText && !consent)} aria-label="Send message"><Send size={17} /></button></form>
        </section>
      </div>
    </div>
  );
}
