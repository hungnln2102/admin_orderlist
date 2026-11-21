import React from "react";

export type ToggleSwitchSize = "sm" | "md" | "lg";
export type ToggleSwitchVariant = "cyan" | "amber" | "emerald" | "indigo" | "purple" | "rose";

export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: string;
  disabled?: boolean;
  size?: ToggleSwitchSize;
  variant?: ToggleSwitchVariant;
  title?: string;
  className?: string;
}

const variantStyles: Record<ToggleSwitchVariant, { activeBg: string; activeShadow: string }> = {
  cyan: {
    activeBg: "bg-cyan-500",
    activeShadow: "shadow-[0_0_12px_rgba(6,182,212,0.45)]",
  },
  amber: {
    activeBg: "bg-amber-500",
    activeShadow: "shadow-[0_0_12px_rgba(245,158,11,0.45)]",
  },
  emerald: {
    activeBg: "bg-emerald-500",
    activeShadow: "shadow-[0_0_12px_rgba(16,185,129,0.45)]",
  },
  indigo: {
    activeBg: "bg-indigo-500",
    activeShadow: "shadow-[0_0_12px_rgba(99,102,241,0.45)]",
  },
  purple: {
    activeBg: "bg-purple-500",
    activeShadow: "shadow-[0_0_12px_rgba(168,85,247,0.45)]",
  },
  rose: {
    activeBg: "bg-rose-500",
    activeShadow: "shadow-[0_0_12px_rgba(244,63,94,0.45)]",
  },
};

const sizeStyles: Record<
  ToggleSwitchSize,
  { track: string; dot: string; translate: string; text: string }
> = {
  sm: {
    track: "w-8 h-[18px]",
    dot: "w-[14px] h-[14px] top-[2px] left-[2px]",
    translate: "translate-x-[14px]",
    text: "text-xs",
  },
  md: {
    track: "w-10 h-[22px]",
    dot: "w-[18px] h-[18px] top-[2px] left-[2px]",
    translate: "translate-x-[18px]",
    text: "text-xs sm:text-sm",
  },
  lg: {
    track: "w-12 h-6",
    dot: "w-5 h-5 top-[2px] left-[2px]",
    translate: "translate-x-6",
    text: "text-sm sm:text-base",
  },
};

/**
 * ToggleSwitch — Component công tắc trượt On/Off chuẩn Design System của dự án.
 * Thay thế triệt để các checkbox tick chọn hoặc inline switch tự viết lặp lại.
 */
export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = "md",
  variant = "cyan",
  title,
  className = "",
}) => {
  const currentVariant = variantStyles[variant] || variantStyles.cyan;
  const currentSize = sizeStyles[size] || sizeStyles.md;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`inline-flex items-center gap-3 select-none ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } ${className}`}
      title={title || `${checked ? "Đang BẬT" : "Đang TẮT"} - Bấm để chuyển đổi`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={`relative inline-flex shrink-0 rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
          currentSize.track
        } ${
          checked
            ? `${currentVariant.activeBg} ${currentVariant.activeShadow}`
            : "bg-slate-800 border border-slate-700/60"
        }`}
      >
        <span
          className={`pointer-events-none absolute bg-white rounded-full shadow-md transition-transform duration-200 ease-in-out ${
            currentSize.dot
          } ${checked ? currentSize.translate : "translate-x-0"}`}
        />
      </button>

      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <span className={`font-semibold text-slate-200 ${currentSize.text}`}>
              {label}
            </span>
          )}
          {description && (
            <span className="text-[11px] text-slate-400 leading-tight">
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
