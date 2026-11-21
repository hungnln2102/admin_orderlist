import React from "react";
import { Copy, Check } from "lucide-react";
import { useClipboard } from "../hooks/useClipboard";

export interface CopyButtonProps {
  text: string;
  label?: string;
  copiedLabel?: string;
  itemKey?: string;
  size?: "xs" | "sm" | "md";
  variant?: "ghost" | "outline" | "subtle";
  onCopied?: (text: string) => void;
  className?: string;
  title?: string;
}

/**
 * CopyButton — Nút sao chép văn bản vào clipboard với icon Check và phản hồi trực quan.
 */
export const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  label,
  copiedLabel = "Đã sao chép",
  itemKey = "default",
  size = "xs",
  variant = "ghost",
  onCopied,
  className = "",
  title,
}) => {
  const { copy, isCopied } = useClipboard(1500);
  const active = isCopied(itemKey);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const success = await copy(text, itemKey);
    if (success && onCopied) {
      onCopied(text);
    }
  };

  const sizeClasses = {
    xs: "px-1.5 py-0.5 text-[11px] gap-1 rounded",
    sm: "px-2 py-1 text-xs gap-1.5 rounded-lg",
    md: "px-3 py-1.5 text-xs sm:text-sm gap-2 rounded-xl",
  }[size];

  const variantClasses = {
    ghost: "text-slate-400 hover:text-white hover:bg-white/5",
    outline: "border border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-500 bg-slate-900/60",
    subtle: "bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700",
  }[variant];

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!text}
      title={title || (active ? "Đã sao chép vào bộ nhớ tạm!" : `Sao chép: ${text}`)}
      className={`inline-flex items-center font-medium transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${sizeClasses} ${variantClasses} ${className}`}
    >
      {active ? (
        <>
          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
          {copiedLabel && <span className="text-emerald-400 font-semibold">{copiedLabel}</span>}
        </>
      ) : (
        <>
          <Copy className="w-3 h-3 text-slate-400 shrink-0" />
          {label && <span>{label}</span>}
        </>
      )}
    </button>
  );
};
