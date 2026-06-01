import type { WarehouseItem } from "../types";

export const warehouseStatusClass = (s?: string | null) => {
  const v = (s || "").toLowerCase();
  if (v.includes("tồn")) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";
  if (v.includes("dùng") || v.includes("dung")) return "bg-sky-500/15 text-sky-400 border-sky-500/20";
  if (v.includes("hết") || v.includes("het")) return "bg-rose-500/15 text-rose-400 border-rose-500/20";
  return "bg-white/5 text-white/60 border-white/10";
};

const line = (label: string, value: string | null | undefined) => {
  const v = String(value ?? "").trim();
  return v ? `${label}: ${v}` : "";
};

/** Định dạng một dòng kho để dán nhanh (chat, sheet, v.v.) */
export const formatWarehouseRowForCopy = (item: WarehouseItem): string => {
  const exp = item.expires_at
    ? new Date(item.expires_at).toLocaleDateString("vi-VN")
    : "";
  return [
    line("Loại", item.category),
    line("Tài khoản", item.account),
    line("Mật khẩu", item.password),
    line("Mail dự phòng", item.backup_email),
    line("2FA", item.two_fa),
    line("Trạng thái", item.status),
    exp ? `Hạn SD: ${exp}` : "",
    line("Ghi chú", item.note),
  ]
    .filter(Boolean)
    .join("\n");
};
