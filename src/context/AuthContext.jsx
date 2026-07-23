import { createContext, useContext, useState, useEffect } from 'react';
import API from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Never trust the cached `medicard_user` object by itself — it's just
  // local storage, so it stays behind after a token expires or is revoked.
  // `user` starts null and is only populated once the token below is
  // confirmed valid against the server, so no page can render as if a
  // stale/expired session were live.
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('medicard_token');
    if (!token) { setLoading(false); return; }

    API.get('/users/profile', { skipAuthRedirect: true })
      .then(res => setUser(res.data.user))
      .catch(() => {
        localStorage.removeItem('medicard_token');
        localStorage.removeItem('medicard_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('medicard_token', token);
    localStorage.setItem('medicard_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('medicard_token');
    localStorage.removeItem('medicard_user');
    setUser(null);
  };

  const updateUser = (userData) => {
    localStorage.setItem('medicard_user', JSON.stringify(userData));
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
