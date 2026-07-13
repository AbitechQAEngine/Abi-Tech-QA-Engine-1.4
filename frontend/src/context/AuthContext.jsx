import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('qa_token'));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('qa_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(true);

  const api = axios.create({ baseURL: API_BASE });
  api.interceptors.request.use((config) => {
    const t = localStorage.getItem('qa_token');
    if (t) config.headers.Authorization = `Bearer ${t}`;
    return config;
  });

  useEffect(() => {
    // Validate stored token on load; clear it if it's stale/invalid.
    async function checkToken() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        setUser(res.data);
        localStorage.setItem('qa_user', JSON.stringify(res.data));
      } catch {
        logout();
      } finally {
        setLoading(false);
      }
    }
    checkToken();
  
  }, []);

  function loginSuccess(accessToken, userData) {
    localStorage.setItem('qa_token', accessToken);
    localStorage.setItem('qa_user', JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem('qa_token');
    localStorage.removeItem('qa_user');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, loading, loginSuccess, logout, api }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
