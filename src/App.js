import { jsx as _jsx } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { AdminCMS } from './components/AdminCMS';
import { PublicSite } from './components/PublicSite';
import { STORAGE_KEYS } from './constants';
import * as api from './services/api';
const App = () => {
    const [currentUser, setCurrentUser] = useState(null);
    const [isReady, setIsReady] = useState(false);
    const [view, setView] = useState('public');
    useEffect(() => {
        const savedAuth = localStorage.getItem(STORAGE_KEYS.AUTH);
        if (savedAuth) {
            try {
                const user = JSON.parse(savedAuth);
                setCurrentUser(user);
            }
            catch (e) {
                console.error("Auth restoration failed", e);
            }
        }
        setIsReady(true);
    }, []);
    if (!isReady)
        return null;
    return (_jsx("div", { className: "min-h-screen", children: view === 'public' ? (_jsx(PublicSite, { onEnterAdmin: () => setView('admin') })) : (_jsx(AdminCMS, { currentUser: currentUser, onLogin: async (credentials) => {
                try {
                    const { token } = await api.login(credentials);
                    const user = { ...credentials, token };
                    setCurrentUser(user);
                    localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(user));
                }
                catch (error) {
                    console.error('Login failed', error);
                }
            }, onLogout: () => {
                setCurrentUser(null);
                localStorage.removeItem(STORAGE_KEYS.AUTH);
                setView('public');
            }, onViewSite: () => setView('public') })) }));
};
export default App;
//# sourceMappingURL=App.js.map