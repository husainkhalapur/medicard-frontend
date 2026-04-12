import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem('medicard_user')) || null
  );

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
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
