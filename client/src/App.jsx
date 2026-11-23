import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Landing from './pages/Landing.jsx';
import AuthPage from './pages/AuthPage.jsx';
import AppShell from './components/layout/AppShell.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Journal from './pages/Journal.jsx';
import MoodTracker from './pages/MoodTracker.jsx';
import Chatbot from './pages/Chatbot.jsx';
import Insights from './pages/Insights.jsx';
import Habits from './pages/Habits.jsx';
import Mindfulness from './pages/Mindfulness.jsx';
import Settings from './pages/Settings.jsx';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen" aria-live="polite">Opening your Mindspace...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/home" replace /> : <Landing />} />
      <Route path="/login" element={user ? <Navigate to="/home" replace /> : <AuthPage mode="login" />} />
      <Route path="/register" element={user ? <Navigate to="/home" replace /> : <AuthPage mode="register" />} />
      <Route path="/*" element={
        <Protected>
          <AppShell>
            <Routes>
              <Route path="/home" element={<Dashboard />} />
              <Route path="/journal" element={<Journal />} />
              <Route path="/mood" element={<MoodTracker />} />
              <Route path="/companion" element={<Chatbot />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/habits" element={<Habits />} />
              <Route path="/mindfulness" element={<Mindfulness />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Routes>
          </AppShell>
        </Protected>
      } />
    </Routes>
  );
}
