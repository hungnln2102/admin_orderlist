import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { XMarkIcon } from "@heroicons/react/24/outline";

export type UrlPromptModalProps = {
  isOpen: boolean;
  title: string;
  description?: string;
  initialValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Ví dụ: "Gỡ liên kết" — chỉ hiện khi truyền */
  tertiaryLabel?: string;
  onTertiary?: () => void;
  onClose: () => void;
  /** Gọi khi bấm xác nhận; modal sẽ đóng sau đó */
  onConfirm: (value: string) => void;
};

export function UrlPromptModal({
  isOpen,
  title,
  description,
  initialValue = "",
  placeholder = "https://",
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  tertiaryLabel,
  onTertiary,
  onClose,
  onConfirm,
}: UrlPromptModalProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setValue(initialValue);
    const t = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(t);
  }, [isOpen, initialValue]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onConfirm(value.trim());
    onClose();
  };

  const handleTertiary = () => {
    onTertiary?.();
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 backdrop-blur-sm px-4"
      role="presentation"
      onClick={onClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="url-prompt-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        noValidate
        className="w-full max-w-md rounded-2xl border border-white/15 bg-gradient-to-br from-slate-900/95 via-indigo-950/90 to-slate-950/95 p-6 shadow-[0_24px_70px_-20px_rgba(0,0,0,0.95)]"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 id="url-prompt-title" className="text-lg font-semibold text-white">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Đóng"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        {description ? (
          <p className="mb-3 text-sm text-slate-300/90">{description}</p>
        ) : null}
        <input
          ref={inputRef}
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="mb-5 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none ring-sky-500/30 focus:border-sky-500/50 focus:ring-2"
        />
        <div className="flex flex-wrap items-center justify-end gap-2">
          {tertiaryLabel && onTertiary ? (
            <button
              type="button"
              onClick={handleTertiary}
              className="mr-auto rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-200 transition-colors hover:bg-rose-500/20"
            >
              {tertiaryLabel}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/15"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-900/40 transition-colors hover:bg-sky-500"
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
