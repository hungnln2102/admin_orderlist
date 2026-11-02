import React, { useEffect, useRef, useState } from "react";

export type CurrencyAccentColor =
  | "cyan"
  | "emerald"
  | "purple"
  | "amber"
  | "rose"
  | "indigo"
  | "default";

export interface CurrencyInputVNProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: number | null | undefined;
  onChange: (val: number) => void;
  accentColor?: CurrencyAccentColor;
  suffix?: string;
  containerClassName?: string;
}

const COLOR_MAP: Record<
  CurrencyAccentColor,
  { border: string; text: string; suffix: string; ring: string }
> = {
  cyan: {
    border: "border-slate-700/80 focus:border-cyan-400",
    text: "text-cyan-300",
    suffix: "text-cyan-400/80",
    ring: "focus:ring-1 focus:ring-cyan-500/20",
  },
  emerald: {
    border: "border-slate-700/80 focus:border-emerald-400",
    text: "text-emerald-400",
    suffix: "text-emerald-400/80",
    ring: "focus:ring-1 focus:ring-emerald-500/20",
  },
  purple: {
    border: "border-slate-700/80 focus:border-purple-400",
    text: "text-purple-300",
    suffix: "text-purple-400/80",
    ring: "focus:ring-1 focus:ring-purple-500/20",
  },
  amber: {
    border: "border-slate-700/80 focus:border-amber-400",
    text: "text-amber-300",
    suffix: "text-amber-400/80",
    ring: "focus:ring-1 focus:ring-amber-500/20",
  },
  rose: {
    border: "border-slate-700/80 focus:border-rose-400",
    text: "text-rose-300",
    suffix: "text-rose-400/80",
    ring: "focus:ring-1 focus:ring-rose-500/20",
  },
  indigo: {
    border: "border-slate-700/80 focus:border-indigo-400",
    text: "text-indigo-300",
    suffix: "text-indigo-400/80",
    ring: "focus:ring-1 focus:ring-indigo-500/20",
  },
  default: {
    border: "border-slate-700/80 focus:border-cyan-400",
    text: "text-slate-100",
    suffix: "text-slate-400",
    ring: "focus:ring-1 focus:ring-cyan-500/20",
  },
};

/** Chuyển số nguyên sang chuỗi phân cách hàng nghìn bằng dấu chấm (VD: 640000 -> "640.000") */
const formatNumberWithDots = (num: number | null | undefined): string => {
  if (num === null || num === undefined || isNaN(num) || num === 0) return "";
  return Math.round(num).toLocaleString("vi-VN");
};

export const CurrencyInputVN: React.FC<CurrencyInputVNProps> = ({
  value,
  onChange,
  accentColor = "default",
  suffix = "đ",
  containerClassName = "",
  className = "",
  placeholder,
  disabled = false,
  required = false,
  ...rest
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isFocusedRef = useRef(false);

  // Hiển thị định dạng dấu chấm
  const [displayValue, setDisplayValue] = useState<string>(() => formatNumberWithDots(value));

  // Đồng bộ từ props khi giá trị bên ngoài thay đổi (nếu người dùng không đang tập trung gõ)
  useEffect(() => {
    if (!isFocusedRef.current) {
      setDisplayValue(formatNumberWithDots(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const caretPosition = e.target.selectionStart ?? rawValue.length;
    const digitsBeforeCaret = rawValue.slice(0, caretPosition).replace(/\D/g, "").length;

    // Chỉ giữ lại các chữ số
    const digitsOnly = rawValue.replace(/\D/g, "");
    const numericValue = digitsOnly ? parseInt(digitsOnly, 10) : 0;
    const formatted = digitsOnly ? parseInt(digitsOnly, 10).toLocaleString("vi-VN") : "";

    setDisplayValue(formatted);
    onChange(numericValue);

    // Giữ vị trí con trỏ chính xác sau khi thêm/bớt dấu phân cách hàng nghìn
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      let nextCaret = 0;
      let digitCount = 0;
      while (nextCaret < formatted.length && digitCount < digitsBeforeCaret) {
        if (/\d/.test(formatted[nextCaret])) {
          digitCount += 1;
        }
        nextCaret += 1;
      }
      input.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = true;
    if (rest.onFocus) rest.onFocus(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = false;
    // Đồng bộ lại chuẩn khi blur
    setDisplayValue(formatNumberWithDots(value));
    if (rest.onBlur) rest.onBlur(e);
  };

  const colorStyle = COLOR_MAP[accentColor] || COLOR_MAP.default;

  return (
    <div className={`relative flex items-center w-full ${containerClassName}`}>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`w-full bg-slate-950/80 border rounded-xl pl-3 pr-8 py-2 font-bold font-mono text-sm focus:outline-none transition-colors placeholder:text-slate-600 placeholder:font-normal placeholder:text-xs ${colorStyle.border} ${colorStyle.text} ${colorStyle.ring} ${className}`}
        {...rest}
      />
      {suffix && (
        <span
          className={`absolute right-3 text-xs font-mono font-bold select-none pointer-events-none ${colorStyle.suffix}`}
          aria-hidden="true"
        >
          {suffix}
        </span>
      )}
    </div>
  );
};