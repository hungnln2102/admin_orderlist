import React from "react";
import { Copy, Check, Eye, EyeOff } from "lucide-react";

export interface CopyableFieldProps {
  value?: string | null;
  copyValue?: string | null;
  isMono?: boolean;
  isCopied?: boolean;
  onCopy?: () => void;
  placeholder?: string;
  isPassword?: boolean;
  showPassword?: boolean;
  onToggleShowPassword?: () => void;
}

export const CopyableField: React.FC<CopyableFieldProps> = ({
  value,
  copyValue,
  isMono = false,
  isCopied = false,
  onCopy,
  placeholder = "—",
  isPassword = false,
  showPassword = false,
  onToggleShowPassword,
}) => {
  const displayVal = (value || "").trim();
  const textToCopy = copyValue || displayVal;

  if (!displayVal || displayVal === "—") {
    return <span className="text-slate-500 select-none">{placeholder}</span>;
  }

  const maskedVal = isPassword && !showPassword ? "••••••••" : displayVal;

  return (
    <div className="group/copy inline-flex items-center gap-1.5 max-w-full">
      <span
        className={`truncate ${
          isMono
            ? "font-mono text-[13px] text-indigo-100/90 tracking-wide"
            : "text-slate-200 text-xs"
        }`}
        title={displayVal}
      >
        {maskedVal}
      </span>

      {/* Toggle Password Visibility */}
      {isPassword && onToggleShowPassword && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleShowPassword();
          }}
          className="shrink-0 p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        >
          {showPassword ? (
            <EyeOff className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <Eye className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>
      )}

      {/* Copy Button */}
      {onCopy && textToCopy && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCopy();
          }}
          className="shrink-0 p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title={isCopied ? "Đã sao chép" : "Sao chép"}
        >
          {isCopied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      )}
    </div>
  );
};

