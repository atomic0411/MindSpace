import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../services/api.js';

const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function Habits() {
  const [habits, setHabits] = useState([]);
  const [logs, setLogs] = useState([]);
  const [goals, setGoals] = useState([]);
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState([0,1,2,3,4,5,6]);
  const [goalTitle, setGoalTitle] = useState('');
  const [error, setError] = useState('');
  const today = new Date().toISOString().slice(0,10);

  async function load() {
    const data = await api('/habits');
    setHabits(data.habits);
    setLogs(data.logs);
    setGoals(data.goals);
  }

  useEffect(() => { load().catch(err => setError(err.message)); }, []);

  async function addHabit(event) {
    event.preventDefault();
    setError('');
    try {
      await api('/habits', { method: 'POST', body: JSON.stringify({ name, frequency }) });
      setName('');
      await load();
    } catch (err) { setError(err.message); }
  }

  async function toggle(habit) {
    const existing = logs.find(log => log.habitId === habit._id && log.completionDate === today);
    await api('/habits/logs', { method: 'POST', body: JSON.stringify({ habitId: habit._id, completionDate: today, completed: !existing?.completed }) });
    await load();
  }

  async function remove(habit) {
    if (!window.confirm('Delete this habit and its completion history?')) return;
    await api(`/habits/${habit._id}`, { method: 'DELETE' });
    await load();
  }

  async function addGoal(event) {
    event.preventDefault();
    if (!goalTitle.trim()) return;
    await api('/habits/goals', { method: 'POST', body: JSON.stringify({ title: goalTitle }) });
    setGoalTitle('');
    await load();
  }

  return (
    <div className="page">
      <header className="page-header"><div><span className="eyebrow">Gentle routines</span><h1>Small steps count</h1></div></header>
      <div className="habit-layout">
        <section className="panel">
          <h2>Today's habits</h2>
          {habits.length === 0 ? <div className="empty-state"><p>No habits yet. Choose something kind and achievable.</p></div> : <div className="habit-list">{habits.map(habit => {
            const completed = logs.find(log => log.habitId === habit._id && log.completionDate === today)?.completed;
            return <article key={habit._id}><button className={`habit-check ${completed ? 'completed' : ''}`} aria-label={`${completed ? 'Mark incomplete' : 'Mark complete'}: ${habit.name}`} onClick={() => toggle(habit)}>{completed ? '✓' : ''}</button><div><strong>{habit.name}</strong><small>{habit.frequency.length === 7 ? 'Every day' : habit.frequency.map(day => days[day]).join(', ')}</small></div><button className="delete-icon" aria-label="Delete habit" onClick={() => remove(habit)}><Trash2 size={15} /></button></article>;
          })}</div>}
          <form className="habit-form" onSubmit={addHabit}>
            <input aria-label="New habit name" placeholder="A small habit..." value={name} onChange={e => setName(e.target.value)} required />
            <fieldset><legend>Selected days</legend><div className="day-picker">{days.map((day, index) => <button type="button" key={day} className={frequency.includes(index) ? 'active' : ''} onClick={() => setFrequency(frequency.includes(index) ? frequency.filter(item => item !== index) : [...frequency, index].sort())}>{day}</button>)}</div></fieldset>
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="button primary"><Plus size={16} /> Add habit</button>
          </form>
        </section>
        <section className="panel">
          <h2>Personal goals</h2>
          {goals.length === 0 ? <p className="muted">No goals yet.</p> : <div className="goal-list">{goals.map(goal => <article key={goal._id}><span className={`goal-status ${goal.status}`} /> <strong>{goal.title}</strong></article>)}</div>}
          <form className="goal-form" onSubmit={addGoal}><input aria-label="New goal" placeholder="Something to work toward" value={goalTitle} onChange={e => setGoalTitle(e.target.value)} /><button className="button ghost" type="submit">Add</button></form>
        </section>
      </div>
    </div>
  );
}
