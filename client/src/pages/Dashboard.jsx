import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { NotebookPen, SmilePlus, Brain, Wind, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useEncryption } from '../context/EncryptionContext.jsx';
import { api } from '../services/api.js';
import { decryptPayload } from '../utils/encryption.js';

export default function Dashboard() {
  const { user } = useAuth();
  const { locked, dek } = useEncryption();
  const [moods, setMoods] = useState([]);
  const [habits, setHabits] = useState([]);
  const [logs, setLogs] = useState([]);
  const [recent, setRecent] = useState([]);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  useEffect(() => {
    Promise.all([api('/moods'), api('/habits'), api('/journals?limit=3')])
      .then(async ([moodData, habitData, journalData]) => {
        setMoods(moodData.entries);
        setHabits(habitData.habits);
        setLogs(habitData.logs);
        if (!locked && dek) {
          const entries = await Promise.all(journalData.entries.map(async entry => {
            try { return { ...entry, payload: await decryptPayload(dek, entry) }; }
            catch { return null; }
          }));
          setRecent(entries.filter(Boolean));
          setRecent(entries);
        } else setRecent([]);
      })
      .catch(() => {});
  }, [locked, dek]);
  const today = new Date().toISOString().slice(0,10);
  const completedToday = logs.filter(log => log.completionDate === today && log.completed).length;
  return (
    <div className="page dashboard-page">
      <header className="page-header">
        <div><span className="eyebrow">A moment for yourself</span><h1>{greeting}, {user?.displayName?.split(' ')[0] || 'friend'}</h1></div>
      </header>
      <section className="checkin-card">
        <div><span className="eyebrow">Daily check-in</span><h2>How is your inner weather today?</h2><p>There is no right answer. Notice what feels present.</p></div>
        <Link className="button primary" to="/mood">Check in <ArrowRight size={17} /></Link>
      </section>
      <section className="quick-grid" aria-label="Quick actions">
        <Link to="/journal" className="quick-card"><span className="icon lav"><NotebookPen /></span><strong>Write</strong><small>Capture a reflection</small></Link>
        <Link to="/mood" className="quick-card"><span className="icon sage"><SmilePlus /></span><strong>Log mood</strong><small>Name this moment</small></Link>
        <Link to="/companion" className="quick-card"><span className="icon peach"><Brain /></span><strong>Talk</strong><small>Reflect with AI</small></Link>
        <Link to="/mindfulness" className="quick-card"><span className="icon blue"><Wind /></span><strong>Breathe</strong><small>Take a gentle pause</small></Link>
      </section>
      <section className="dashboard-grid">
        <article className="panel"><header><h2>Today's habits</h2><Link to="/habits">View all</Link></header>{habits.length === 0 ? <div className="empty-state"><p>No habits yet.</p><Link className="text-link" to="/habits">Create a gentle routine</Link></div> : <div className="dashboard-habits"><strong>{completedToday} of {habits.length}</strong><span>completed today</span></div>}</article>
        <article className="panel"><header><h2>Recent reflections</h2><Link to="/journal">View journal</Link></header>{locked ? <div className="empty-state"><p>Unlock your journal to see recent entries.</p></div> : recent.length ? <div className="recent-list">{recent.map(entry => <Link key={entry._id} to="/journal"><strong>{entry.payload.title || 'Untitled reflection'}</strong><span>{new Date(entry.entryDate).toLocaleDateString()}</span></Link>)}</div> : <div className="empty-state"><p>No journal entries yet.</p></div>}</article>
      </section>
      <section className="panel dashboard-insight"><header><h2>Weekly mood overview</h2></header>{moods.length ? <p>{moods.length} check-ins recorded. Open <Link className="text-link" to="/mood">Mood</Link> to see the actual trend.</p> : <div className="empty-state"><p>No mood data yet. This area stays empty until you check in.</p></div>}</section>
    </div>
  );
}
