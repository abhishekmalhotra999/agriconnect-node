import { createContext, useContext, useState } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem('admin_token'));
    const [admin, setAdmin] = useState(() => {
        const stored = localStorage.getItem('admin_user');
        try { return stored ? JSON.parse(stored) : null; } catch { return null; }
    });

    const login = async (email, password) => {
        const res = await client.post('/admin/login', { email, password });
        const { token: t, admin: a } = res.data;
        localStorage.setItem('admin_token', t);
        localStorage.setItem('admin_user', JSON.stringify(a));
        setToken(t);
        setAdmin(a);
        return res.data;
    };

    const logout = () => {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        setToken(null);
        setAdmin(null);
    };

    return (
        <AuthContext.Provider value={{ token, admin, login, logout, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
