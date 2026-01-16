import React from "react";

interface LoginCardProps {
  children: React.ReactNode;
}

/**
 * LoginCard Component
 * Wraps the login form in a styled card container
 */
export const LoginCard: React.FC<LoginCardProps> = ({ children }) => {
  return (
    <div className="retro-card">
      <div className="card-top">
        <div className="title">
          <p className="eyebrow">Chào mừng trở lại</p>
          <h1 className="gradient-title">Mavryk Premium</h1>
          <p className="subtitle">
            Nhập thông tin của bạn để vào trang quản trị.
          </p>
        </div>
      </div>
      {children}
    </div>
  );
};
