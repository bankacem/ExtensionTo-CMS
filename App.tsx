
import React, { useState, useEffect } from 'react';
import { AdminCMS } from './components/AdminCMS';
import { PublicSite } from './components/PublicSite';
import { User } from './types';
import { STORAGE_KEYS } from './constants';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [view, setView] = useState<'public' | 'admin'>('public');

  useEffect(() => {
    const savedAuth = localStorage.getItem(STORAGE_KEYS.AUTH);
    if (savedAuth) {
      try {
        setCurrentUser(JSON.parse(savedAuth));
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
          onLogin={(user) => {
            setCurrentUser(user);
            localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(user));
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
