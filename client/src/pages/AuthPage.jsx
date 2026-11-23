import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Feather, LockKeyhole } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function AuthPage({ mode }) {
  const [form, setForm] = useState({ email: '', password: '', displayName: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const isRegister = mode === 'register';

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (isRegister) await register(form);
      else await login({ email: form.email, password: form.password });
      navigate('/home');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <Link className="brand auth-brand" to="/"><span className="brand-mark"><Feather size={18} /></span> Mindspace</Link>
      <section className="auth-card">
        <span className="auth-icon"><LockKeyhole size={22} /></span>
        <h1>{isRegister ? 'Create your private space' : 'Welcome back'}</h1>
        <p>{isRegister ? 'Start with a simple account. You will set up journal encryption next.' : 'Continue your reflections where you left off.'}</p>
        <form onSubmit={submit}>
          {isRegister && <label>What should we call you?<input required maxLength={80} value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} /></label>}
          <label>Email address<input required type="email" autoComplete="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
          <label>Password<input required type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} minLength={isRegister ? 12 : 1} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label>
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="button primary full" disabled={busy}>{busy ? 'Please wait...' : isRegister ? 'Create account' : 'Sign in'}</button>
        </form>
        <p className="auth-switch">{isRegister ? 'Already have a space?' : 'New to Mindspace?'} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create account'}</Link></p>
      </section>
    </main>
  );
}
