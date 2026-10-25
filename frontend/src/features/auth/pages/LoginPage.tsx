import React from "react";
import { LoginBackground } from "../components/LoginBackground";
import { LoginCard } from "../components/LoginCard";
import { LoginForm } from "../components/LoginForm";
import { useLogin } from "../hooks/useLogin";
import "../styles/login.css";

export const LoginPage: React.FC = () => {
  const {
    email,
    password,
    error,
    loading,
    setEmail,
    setPassword,
    handleSubmit,
  } = useLogin();

  return (
    <div className="modern-login-root min-h-screen min-h-[100dvh] w-full flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-[#060911]">
      <LoginBackground />
      <LoginCard>
        <LoginForm
          email={email}
          password={password}
          loading={loading}
          error={error}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onSubmit={handleSubmit}
        />
      </LoginCard>
    </div>
  );
};

export default LoginPage;
