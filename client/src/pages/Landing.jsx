import { Link } from 'react-router-dom';
import { Feather, LockKeyhole, HeartHandshake } from 'lucide-react';

export default function Landing() {
  return (
    <main className="landing">
      <nav className="landing-nav" aria-label="Primary">
        <div className="brand"><span className="brand-mark"><Feather size={18} /></span> Mindspace</div>
        <div className="nav-actions">
          <Link className="button ghost" to="/login">Sign in</Link>
          <Link className="button primary" to="/register">Begin your journey</Link>
        </div>
      </nav>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Your private reflection space</span>
          <h1>Reflect. Heal. <em>Grow.</em></h1>
          <p>A gentle place to understand your emotions, build small habits and find a little more clarity each day.</p>
          <Link className="button primary large" to="/register">Create a private space</Link>
        </div>
        <div className="hero-art" aria-label="Mindspace preview">
          <div className="orb orb-one" />
          <div className="orb orb-two" />
          <div className="preview-card">
            <div className="preview-label">Today's reflection</div>
            <p>What felt a little lighter today?</p>
            <div className="preview-lines"><span /><span /><span /></div>
          </div>
        </div>
      </section>
      <section className="trust-row" aria-label="Mindspace principles">
        <div><LockKeyhole /><span><strong>Private by design</strong><small>Your journal is encrypted before it travels.</small></span></div>
        <div><HeartHandshake /><span><strong>Always your choice</strong><small>Share with AI only when you decide.</small></span></div>
      </section>
    </main>
  );
}
