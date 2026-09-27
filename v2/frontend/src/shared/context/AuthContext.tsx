import React, { createContext, useContext, useState, useEffect } from "react";

interface User {
  id?: number | string;
  username: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("v2_auth_user");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Check auth session on mount
  useEffect(() => {
    let isMounted = true;
    fetch("/api/auth/me", {
      headers: { Accept: "application/json" },
      credentials: "include",
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.user) {
            setUser(data.user);
            localStorage.setItem("v2_auth_user", JSON.stringify(data.user));
          }
        } else {
          if (isMounted) {
            setUser(null);
            localStorage.removeItem("v2_auth_user");
          }
        }
      })
      .catch(() => {
        // Keep cached session if offline/dev network issue
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (username: string, password?: string): Promise<boolean> => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Sai tài khoản hoặc mật khẩu");
    }

    const data = await response.json();
    const loggedUser = data.user || { username };
    setUser(loggedUser);
    localStorage.setItem("v2_auth_user", JSON.stringify(loggedUser));
    return true;
  };

  const logout = async (): Promise<void> => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      localStorage.removeItem("v2_auth_user");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
