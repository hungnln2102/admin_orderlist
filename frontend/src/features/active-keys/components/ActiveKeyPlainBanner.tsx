type ActiveKeyPlainBannerProps = {
  plainKey: string | null;
  onClose: () => void;
};

export function ActiveKeyPlainBanner({ plainKey, onClose }: ActiveKeyPlainBannerProps) {
  if (!plainKey) return null;

  return (
      
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p>
            <span className="font-semibold text-emerald-300">Key vừa tạo</span>{" "}
            (chỉ hiện một lần — hãy lưu hoặc sao chép):
            <span className="ml-2 font-mono text-white break-all">
              {plainKey}
            </span>
          </p>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(plainKey);
                } catch {
                  /* ignore */
                }
              }}
            >
              Copy
            </button>
            <button
              type="button"
              className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white/90 hover:bg-white/10"
              onClick={() => onClose()}
            >
              Đóng
            </button>
          </div>
        </div>
      
  );
}
