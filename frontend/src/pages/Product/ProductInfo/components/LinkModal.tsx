import React from "react";

type LinkModalProps = {
  open: boolean;
  url: string;
  error?: string | null;
  onChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export const LinkModal: React.FC<LinkModalProps> = ({
  open,
  url,
  error,
  onChange,
  onClose,
  onConfirm,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-xl bg-[#0b1220] border border-white/10 p-5 shadow-2xl space-y-4">
        <h4 className="text-white font-semibold">ChA"n liA¦n k §¨t</h4>
        <div className="space-y-2">
          <label className="block text-xs uppercase tracking-wide text-white/70">
            URL
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            placeholder="https://..."
          />
          {error && <div className="text-xs text-rose-300">{error}</div>}
        </div>
        <div className="flex items-center justify-end gap-3">
          <button
            className="px-3 py-2 text-sm font-semibold text-white/80 hover:text-white"
            onClick={onClose}
            type="button"
          >
            H ¯y
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            onClick={onConfirm}
            type="button"
          >
            ChA"n link
          </button>
        </div>
      </div>
    </div>
  );
};
