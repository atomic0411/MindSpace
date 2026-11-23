import { createContext, useContext, useEffect, useState } from 'react';
import { api, ensureCsrf } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ensureCsrf()
      .then(() => api('/auth/me'))
      .then(data => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function register(input) {
    await ensureCsrf();
    const data = await api('/auth/register', { method: 'POST', body: JSON.stringify(input) });
    setUser(data.user);
    return data.user;
  }

  async function login(input) {
    await ensureCsrf();
    const data = await api('/auth/login', { method: 'POST', body: JSON.stringify(input) });
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    await api('/auth/logout', { method: 'POST' });
    setUser(null);
  }

  async function refresh() {
    const data = await api('/auth/me');
    setUser(data.user);
  }

  return <AuthContext.Provider value={{ user, loading, register, login, logout, refresh }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
