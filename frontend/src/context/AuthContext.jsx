import React, { createContext, useState, useEffect, useContext } from 'react';
import api, { setAccessToken } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Auto-load profile on mount if cookie/session remains valid
  useEffect(() => {
    const fetchUserOnStart = async () => {
      try {
        const profile = await api.users.getMe();
        setUser(profile);
      } catch (error) {
        // Safe to ignore on initial load (not logged in)
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUserOnStart();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await api.auth.login(email, password);
      if (data.access_token) {
        setAccessToken(data.access_token);
        const profile = await api.users.getMe();
        setUser(profile);
        return profile;
      }
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.auth.logout();
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      setAccessToken('');
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
