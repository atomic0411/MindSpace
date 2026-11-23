import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Wind } from 'lucide-react';
import { useEncryption } from '../context/EncryptionContext.jsx';
import { encryptPayload, decryptPayload } from '../utils/encryption.js';
import { saveEncryptedDraft, getEncryptedDraft } from '../services/drafts.js';

const grounding = [
  ['5 things you can see', 'Notice shape, colour or movement.'],
  ['4 things you can feel', 'Notice texture, temperature or pressure.'],
  ['3 things you can hear', 'Near or far, simply notice.'],
  ['2 things you can smell', 'A scent nearby, or simply imagine one.'],
  ['1 thing you can taste', 'Notice what is present in your mouth.']
];

export default function Mindfulness() {
  const { locked, dek } = useEncryption();
  const [mode, setMode] = useState('breathing');
  const [seconds, setSeconds] = useState(16);
  const [running, setRunning] = useState(false);
  const [cycle, setCycle] = useState(4);
  const [groundStep, setGroundStep] = useState(0);
  const [gratitude, setGratitude] = useState(['','','']);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => setSeconds(value => {
      if (value <= 1) {
        setRunning(false);
        return 16;
      }
      return value - 1;
    }), 1000);
    return () => clearInterval(intervalRef.current);
  }, [running]);

  useEffect(() => {
    if (locked || !dek) return;
    getEncryptedDraft('gratitude-practice').then(async saved => {
      if (saved) {
        try {
          const value = await decryptPayload(dek, saved);
          if (Array.isArray(value)) setGratitude(value);
        } catch {
          setGratitude(['','','']);
        }
      }
    });
  }, [locked, dek]);

  useEffect(() => {
    if (locked || !dek || !gratitude.some(Boolean)) return;
    const timer = setTimeout(async () => {
      try {
        const envelope = await encryptPayload(dek, gratitude);
        await saveEncryptedDraft('gratitude-practice', envelope);
      } catch {
        // The practice remains usable in memory if local encrypted storage fails.
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [gratitude, locked, dek]);

  function reset() { setRunning(false); setSeconds(cycle); }

  return (
    <div className="page">
      <header className="page-header"><div><span className="eyebrow">Mindful pause</span><h1>Make a little room</h1></div></header>
      <nav className="mindful-tabs" aria-label="Mindfulness tools">
        {['breathing','grounding','gratitude','relaxation'].map(name => <button key={name} className={mode === name ? 'active' : ''} onClick={() => setMode(name)}>{name}</button>)}
      </nav>
      {mode === 'breathing' && <section className="panel mindful-card">
        <span className="mindful-icon"><Wind /></span><h2>Box breathing</h2><p>A simple rhythm. Stop if you feel uncomfortable, dizzy or short of breath.</p>
        <div className={`breathing-orb ${running ? 'running' : ''}`}><strong>{seconds}</strong><span>{running ? 'Breathe gently' : 'Ready'}</span></div>
        <div className="mindful-controls"><button className="button primary" onClick={() => setRunning(!running)}>{running ? <Pause size={16}/> : <Play size={16}/>} {running ? 'Pause' : 'Begin'}</button><button className="button ghost" onClick={reset}><RotateCcw size={16}/> Reset</button></div>
        <label>Interval seconds<select value={cycle} onChange={e => { setCycle(Number(e.target.value)); setSeconds(Number(e.target.value)); }}><option value="4">4 seconds</option><option value="6">6 seconds</option><option value="8">8 seconds</option></select></label>
      </section>}
      {mode === 'grounding' && <section className="panel mindful-card">
        <span className="eyebrow">5–4–3–2–1 grounding</span><h2>{grounding[groundStep][0]}</h2><p>{grounding[groundStep][1]}</p>
        <div className="ground-progress">{grounding.map((_, index) => <span key={index} className={index <= groundStep ? 'active' : ''} />)}</div>
        <div className="mindful-controls"><button className="button ghost" disabled={groundStep === 0} onClick={() => setGroundStep(step => step - 1)}>Back</button><button className="button primary" onClick={() => groundStep === 4 ? setGroundStep(0) : setGroundStep(step => step + 1)}>{groundStep === 4 ? 'Begin again' : 'Next'}</button></div>
      </section>}
      {mode === 'gratitude' && <section className="panel mindful-card gratitude-card"><h2>Three things you appreciate</h2><p>Small and ordinary is welcome.</p>{gratitude.map((value,index) => <label key={index}>Something you appreciated<input value={value} onChange={e => setGratitude(values => values.map((item,i) => i === index ? e.target.value : item))} /></label>)}</section>}
      {mode === 'relaxation' && <section className="panel mindful-card"><h2>Progressive muscle relaxation</h2><p>Move slowly, and skip any movement or area that is painful or uncomfortable.</p><ol className="relaxation-list"><li><strong>Hands & arms</strong><span>Gently make fists, notice tension for five seconds, then release.</span></li><li><strong>Shoulders & face</strong><span>Lift shoulders softly, release. Unclench the jaw and let the eyes feel heavy.</span></li><li><strong>Chest & back</strong><span>Take a natural breath and notice support beneath you.</span></li><li><strong>Legs & feet</strong><span>Press gently, hold briefly, then let the muscles soften.</span></li></ol></section>}
    </div>
  );
}
