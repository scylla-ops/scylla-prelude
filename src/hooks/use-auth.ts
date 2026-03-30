import { useState, useCallback, useMemo } from "react";

interface AuthUser {
  username: string;
  name: string;
  avatar_url: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  setToken: (token: string) => void;
}

function decodeJwtPayload(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return {
      username: payload.sub,
      name: payload.name,
      avatar_url: payload.avatar_url,
    };
  } catch {
    return null;
  }
}

export function useAuth(): AuthState {
  const [token, setTokenState] = useState<string | null>(() =>
    localStorage.getItem("admin_token"),
  );

  const user = useMemo(() => (token ? decodeJwtPayload(token) : null), [token]);

  const setToken = useCallback((newToken: string) => {
    localStorage.setItem("admin_token", newToken);
    setTokenState(newToken);
  }, []);

  const login = useCallback(() => {
    window.location.href = "/api/v1/auth/github";
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("admin_token");
    setTokenState(null);
  }, []);

  return {
    user,
    token,
    isAuthenticated: !!user,
    login,
    logout,
    setToken,
  };
}
