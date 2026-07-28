// ============================================================
//  src/context/AuthContext.js
//  FIX: `source` is now sent in the request BODY instead of
//       as a custom HTTP header (X-App-Source). Custom headers
//       trigger CORS preflight in browsers and can be dropped —
//       body params are always reliable across all platforms.
// ============================================================

import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';
import Config from '../constants/config';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]               = useState(null);
  const [token, setToken]             = useState(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const pollingRef                    = useRef(null);

  // ── Fetch unread notification count ────────────────────────────────────────
  const fetchUnreadCount = async () => {
    try {
      const res = await apiClient.get('/notifications/unread-count');
      const count = res.data?.count ?? res.data?.unread_count ?? 0;
      setUnreadCount(count);
    } catch (_) {}
  };

  // ── Start polling ───────────────────────────────────────────────────────────
  const startPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    fetchUnreadCount();
    pollingRef.current = setInterval(() => {
      fetchUnreadCount();
    }, 30000);
  };

  // ── Stop polling ────────────────────────────────────────────────────────────
  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  // ── Restore session on app start ────────────────────────────────────────────
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(Config.STORAGE_KEYS.AUTH_TOKEN);
        const storedUser  = await AsyncStorage.getItem(Config.STORAGE_KEYS.USER_DATA);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Session restore error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, []);

  // ── Start/stop polling based on auth state ──────────────────────────────────
  useEffect(() => {
    if (token) {
      startPolling();
    } else {
      stopPolling();
      setUnreadCount(0);
    }
    return () => stopPolling();
  }, [token]);

  // ── LOGIN ───────────────────────────────────────────────────────────────────
  // `source` tells the backend which client is logging in.
  // It is sent in the request BODY (not as a header) to avoid
  // CORS preflight issues with custom headers in browsers.
  //
  //   'admin-panel' → AdminLoginScreen  (admins allowed)
  //   'web-app'     → LoginScreen web   (admins blocked)
  //   'mobile-app'  → LoginScreen app   (admins blocked) ← default
  const login = async (email, password, source = 'mobile-app') => {
    const response = await apiClient.post('/login', {
      email,
      password,
      source,       // ← in the body now, not a header
    });

    const { token: authToken, user: userData } = response.data;

    await AsyncStorage.setItem(Config.STORAGE_KEYS.AUTH_TOKEN, authToken);
    await AsyncStorage.setItem(Config.STORAGE_KEYS.USER_DATA, JSON.stringify(userData));

    setToken(authToken);
    setUser(userData);
    return response.data;
  };

  // ── REGISTER ────────────────────────────────────────────────────────────────
  const register = async (name, email, password, confirmPassword) => {
    const response = await apiClient.post('/register', {
      name,
      email,
      password,
      password_confirmation: confirmPassword,
    });
    return response.data;
  };

  // ── LOGOUT ──────────────────────────────────────────────────────────────────
  const logout = async () => {
    stopPolling();
    try { await apiClient.post('/logout'); } catch (_) {}
    await AsyncStorage.removeItem(Config.STORAGE_KEYS.AUTH_TOKEN);
    await AsyncStorage.removeItem(Config.STORAGE_KEYS.USER_DATA);
    setToken(null);
    setUser(null);
    setUnreadCount(0);
  };

  // ── UPDATE USER ─────────────────────────────────────────────────────────────
  const updateUser = async (updatedUser) => {
    setUser(updatedUser);
    await AsyncStorage.setItem(Config.STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        token,
        isLoading,
        isAuthenticated: !!token,
        unreadCount,
        setUnreadCount,
        fetchUnreadCount,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
};

export default AuthContext;