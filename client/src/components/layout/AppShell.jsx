import { NavLink, useNavigate } from 'react-router-dom';
import { Brain, Home, NotebookPen, SmilePlus, BarChart3, CheckSquare, Wind, Settings, LogOut, Feather } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

const nav = [
  ['Home', '/home', Home],
  ['Journal', '/journal', NotebookPen],
  ['Mood', '/mood', SmilePlus],
  ['AI Companion', '/companion', Brain],
  ['Insights', '/insights', BarChart3],
  ['Habits', '/habits', CheckSquare],
  ['Mindfulness', '/mindfulness', Wind]
];

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  async function signOut() {
    await logout();
    navigate('/');
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink className="brand" to="/home"><span className="brand-mark"><Feather size={18} /></span> Mindspace</NavLink>
        <nav className="side-nav" aria-label="Main navigation">
          {nav.map(([label, path, Icon]) => <NavLink key={path} to={path} className={({ isActive }) => isActive ? 'active' : ''}><Icon size={19} /><span>{label}</span></NavLink>)}
        </nav>
        <div className="side-footer">
          <NavLink to="/settings"><Settings size={19} /><span>Settings</span></NavLink>
          <button onClick={signOut}><LogOut size={19} /><span>Sign out</span></button>
        </div>
      </aside>
      <main className="main-content">
        <header className="mobile-header"><NavLink className="brand" to="/home"><span className="brand-mark"><Feather size={18} /></span> Mindspace</NavLink></header>
        {children}
      </main>
    </div>
  );
}
