import React, { useState, useEffect } from 'react';
import { PublicSite } from './components/PublicSite';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';

type View = 'public' | 'admin';

const App: React.FC = () => {
  const [view, setView] = useState<View>('public');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const savedAuth = localStorage.getItem('cms_auth_v4');
    if (savedAuth) {
      try {
        const parsedUser = JSON.parse(savedAuth);
        setUser(parsedUser);
        setView('admin');
      } catch (e) {
        // Invalid auth
      }
    }
  }, []);

  const handleEnterAdmin = () => {
    if (user) {
      setView('admin');
    } else {
      setView('login');
    }
  };

  const handleLogin = (loggedUser: any) => {
    setUser(loggedUser);
    setView('admin');
  };

  const handleLogout = () => {
    localStorage.removeItem('cms_auth_v4');
    setUser(null);
    setView('public');
  };

  if (view === 'login') {
    return <AdminLogin onLogin={handleLogin} />;
  }

  if (view === 'admin') {
    return <AdminDashboard onLogout={handleLogout} />;
  }

  return <PublicSite onEnterAdmin={handleEnterAdmin} />;
};

export default App;