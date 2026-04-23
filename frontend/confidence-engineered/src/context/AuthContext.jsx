import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("authToken") || null);
  const [userId, setUserId] = useState(localStorage.getItem("authUserId") || null);

  const login = (newToken, newUserId) => {
    setToken(newToken);
    setUserId(newUserId);
    localStorage.setItem("authToken", newToken);
    if (newUserId) localStorage.setItem("authUserId", newUserId);
  };

  const logout = () => {
    setToken(null);
    setUserId(null);
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUserId");
  };

  const value = { token, userId, login, logout, isAuthenticated: !!token };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}