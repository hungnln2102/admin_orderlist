import React, { useCallback, useRef, useState } from "react";
import {
  CheckIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";

type CopyableValueProps = {
  value: string | null | undefined;
  mono?: boolean;
  className?: string;
  /** Hiện nút copy khi hover (desktop table). false = luôn hiện */
  showButtonOnHover?: boolean;
};

export const CopyableValue: React.FC<CopyableValueProps> = ({
  value,
  mono = false,
  className = "",
  showButtonOnHover = true,
}) => {
  const text = String(value ?? "").trim();
  const [copied, setCopied] = useState(false);
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (resetRef.current) clearTimeout(resetRef.current);
      resetRef.current = setTimeout(() => {
        setCopied(false);
        resetRef.current = null;
      }, 1600);
    } catch {
      /* ignore */
    }
  }, [text]);

  if (!text) {
    return <span className="text-sm text-white/25 select-none">—</span>;
  }

  const btnHover = showButtonOnHover
    ? "opacity-0 group-hover/copy:opacity-100 focus:opacity-100"
    : "opacity-100";

  return (
    <div
      className={`group/copy flex w-full min-w-0 max-w-full items-center gap-1 overflow-hidden ${className}`}
    >
      <span
        className={`block min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm text-white/90 ${
          mono ? "font-mono text-[13px] text-indigo-100/90" : ""
        }`}
        title={text}
      >
        {text}
      </span>
      <button
        type="button"
        onClick={() => void copy()}
        className={`shrink-0 rounded-lg p-1.5 text-white/35 transition-all hover:bg-indigo-500/15 hover:text-indigo-300 ${btnHover}`}
        title={copied ? "Đã sao chép" : "Sao chép"}
        aria-label={copied ? "Đã sao chép" : "Sao chép"}
      >
        {copied ? (
          <CheckIcon className="h-4 w-4 text-emerald-400" />
        ) : (
          <ClipboardDocumentIcon className="h-4 w-4" />
        )}
      </button>
    </div>
  );
};
