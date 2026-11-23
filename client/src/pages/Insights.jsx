import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../services/api.js';

export default function Insights() {
  const [period, setPeriod] = useState('weekly');
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/insights/${period}`).then(data => setSummary(data)).catch(err => setError(err.message));
  }, [period]);

  const chart = summary?.moods.map(item => ({
    date: new Date(item.recordedAt).toLocaleDateString(undefined, { month:'short', day:'numeric' }),
    score: item.score
  })) || [];

  return (
    <div className="page">
      <header className="page-header"><div><span className="eyebrow">Personal insights</span><h1>Notice your patterns</h1></div><select className="period-select" value={period} onChange={e => setPeriod(e.target.value)}><option value="weekly">Last 7 days</option><option value="monthly">Last 30 days</option></select></header>
      {error && <div className="form-error" role="alert">{error}</div>}
      {summary ? <>
        <p className="coverage-line">Range: {new Date(summary.range.start).toLocaleDateString()}–{new Date(summary.range.end).toLocaleDateString()} · Available records only</p>
        <div className="insight-cards">
          <article className="panel"><span>Mood check-ins</span><strong>{summary.coverage.moodCheckIns}</strong><small>of {summary.coverage.possibleDays} possible days</small></article>
          <article className="panel"><span>Journal entries</span><strong>{summary.coverage.journalEntries}</strong><small>in this range</small></article>
          <article className="panel"><span>Habit completions</span><strong>{summary.coverage.habitCompletions}</strong><small>{summary.coverage.activeHabits} active habits</small></article>
        </div>
        <section className="panel insight-chart"><h2>Mood trend</h2>{chart.length ? <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><LineChart data={chart}><XAxis dataKey="date" /><YAxis domain={[1,5]} ticks={[1,2,3,4,5]} /><Tooltip /><Line type="monotone" dataKey="score" stroke="#8d82ba" strokeWidth={3} dot={{r:4}} /></LineChart></ResponsiveContainer></div> : <div className="empty-state"><p>No mood records in this range. A trend is not inferred from missing data.</p></div>}</section>
        <section className="panel"><h2>Frequently selected emotions</h2>{summary.frequentlySelectedEmotions.length ? <div className="insight-emotions">{summary.frequentlySelectedEmotions.map(item => <span key={item.name}>{item.name} · {item.count}</span>)}</div> : <p className="muted">No emotions have been recorded in this range.</p>}</section>
      </> : <article className="panel empty-state"><p>Loading actual records...</p></article>}
    </div>
  );
}
