import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api";

const AuthContext = createContext(null);
const TOKEN_KEY = "return_tech_token";
const USER_KEY = "return_tech_user";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  });
  const [checking, setChecking] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      setChecking(false);
      return;
    }
    api("/auth/me")
      .then(({ user: current }) => {
        setUser(current);
        localStorage.setItem(USER_KEY, JSON.stringify(current));
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
      })
      .finally(() => setChecking(false));
  }, []);

  const authenticate = (payload) => {
    localStorage.setItem(TOKEN_KEY, payload.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
    setUser(payload.user);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    window.location.hash = "#/";
  };

  const value = useMemo(() => ({ user, setUser, checking, authenticate, logout }), [user, checking]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
