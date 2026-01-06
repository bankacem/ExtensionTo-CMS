
import React, { useState, useEffect } from 'react';
import { AdminCMS } from './components/AdminCMS';
import { PublicSite } from './components/PublicSite';
import { User } from './types';
import { STORAGE_KEYS } from './constants';
import * as api from './services/api';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [view, setView] = useState<'public' | 'admin'>('public');

  useEffect(() => {
    const savedAuth = localStorage.getItem(STORAGE_KEYS.AUTH);
    if (savedAuth) {
      try {
        const user = JSON.parse(savedAuth);
        setCurrentUser(user);
      } catch (e) {
        console.error("Auth restoration failed", e);
      }
    }
    setIsReady(true);
  }, []);

  if (!isReady) return null;

  return (
    <div className="min-h-screen">
      {view === 'public' ? (
        <PublicSite onEnterAdmin={() => setView('admin')} />
      ) : (
        <AdminCMS 
          currentUser={currentUser} 
          onLogin={async (credentials) => {
            try {
              const { token } = await api.login(credentials);
              const user = { ...credentials, token };
              setCurrentUser(user as User);
              localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(user));
            } catch (error) {
              console.error('Login failed', error);
              // Handle login failure, e.g., show an error message
            }
          }} 
          onLogout={() => {
            setCurrentUser(null);
            localStorage.removeItem(STORAGE_KEYS.AUTH);
            setView('public');
          }} 
          onViewSite={() => setView('public')}
        />
      )}
    </div>
  );
};

export default App;
