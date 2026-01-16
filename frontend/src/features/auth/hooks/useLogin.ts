import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../AuthContext";

interface UseLoginReturn {
  email: string;
  password: string;
  error: string | null;
  loading: boolean;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
}

/**
 * useLogin Hook
 * Handles login logic, API calls, and state management
 */
export const useLogin = (): UseLoginReturn => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    apiFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: email, password }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "Login failed");
        }
        const data = await response.json();
        setUser(data.user || null);
        navigate("/dashboard", { replace: true });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Login failed");
      })
      .finally(() => setLoading(false));
  };

  return {
    email,
    password,
    error,
    loading,
    setEmail,
    setPassword,
    handleSubmit,
  };
};
