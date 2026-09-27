import React, { useState } from "react";
import { User, Lock, Eye, EyeOff, ArrowRight, Loader2, AlertCircle } from "lucide-react";

interface LoginFormProps {
  email: string;
  password: string;
  loading: boolean;
  error: string | null;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  email,
  password,
  loading,
  error,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      {/* Username / Email Field */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
          <span>Tài khoản Admin</span>
        </label>
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <User className="w-4 h-4" />
          </div>
          <input
            type="text"
            required
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="Nhập tên đăng nhập"
            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 modern-input focus:outline-none"
          />
        </div>
      </div>

      {/* Password Field */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
          <span>Mật khẩu</span>
        </label>
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Lock className="w-4 h-4" />
          </div>
          <input
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="Nhập mật khẩu"
            className="w-full pl-10 pr-11 py-3 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 modern-input focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 rounded-lg transition-colors"
            title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Error Message Alert */}
      {error && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium animate-in fade-in slide-in-from-top-1 duration-200">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="relative w-full overflow-hidden rounded-xl py-3.5 px-4 font-bold text-sm text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-size-200 hover:bg-pos-100 shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:hover:scale-100 transition-all duration-200 flex items-center justify-center gap-2 group mt-2"
      >
        {/* Shimmer Light Beam Effect */}
        <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shimmer pointer-events-none" />

        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span>Đang xác thực...</span>
          </>
        ) : (
          <>
            <span>Đăng nhập trang Quản trị</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </>
        )}
      </button>
    </form>
  );
};
