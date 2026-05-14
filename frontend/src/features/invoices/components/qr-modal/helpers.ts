export const digitsOnly = (value: string) => value.replace(/\D/g, "");

export const formatVndThousands = (digits: string): string => {
  if (!digits) return "";
  const n = Number(digits);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("vi-VN");
};

export const panelSurface =
  "rounded-2xl border border-white/[0.08] bg-gradient-to-br from-slate-800/35 via-slate-900/50 to-slate-950/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]";
export const panelEmerald =
  "rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/25 via-slate-900/45 to-slate-950/55 shadow-[inset_0_1px_0_0_rgba(16,185,129,0.12)]";
export const labelCls =
  "block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1.5";
export const inputCls =
  "w-full rounded-xl border border-white/10 bg-slate-950/75 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-500/20 outline-none transition";
