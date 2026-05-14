export const warehouseStatusClass = (s?: string | null) => {
  const v = (s || "").toLowerCase();
  if (v.includes("tồn")) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";
  if (v.includes("dùng") || v.includes("dung")) return "bg-sky-500/15 text-sky-400 border-sky-500/20";
  if (v.includes("hết") || v.includes("het")) return "bg-rose-500/15 text-rose-400 border-rose-500/20";
  return "bg-white/5 text-white/60 border-white/10";
};
