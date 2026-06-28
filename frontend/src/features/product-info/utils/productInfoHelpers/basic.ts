import type { MergedProduct } from "./types";

export const getInitials = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "--";
  return trimmed.slice(0, 2).toUpperCase();
};

/**
 * Ảnh cột biến thể: chỉ hiển thị khi URL khác ảnh gói.
 * Tránh lặp logo gói khi API/DB từng COALESCE(variant → product) hoặc copy cùng URL.
 */
export const resolveVariantDisplayImageUrl = (
  item: Pick<MergedProduct, "imageUrl" | "packageImageUrl">
): string | null => {
  const variant = (item.imageUrl || "").trim();
  if (!variant) return null;
  const pkg = (item.packageImageUrl || "").trim();
  if (pkg && variant === pkg) return null;
  return item.imageUrl ?? null;
};

export const stripDurationSuffix = (value: string): string => {
  if (!value) return "";
  return value.replace(/--\d+m$/i, "").trim();
};

export { toHtmlFromPlain } from "@/shared/html";

/** Chuẩn hóa key để so khớp (không split/bỏ suffix, lấy đúng display_name). */
export const normalizeProductKey = (value: string): string =>
  (value || "").trim().toLowerCase();

/** Chuẩn hóa cờ active từ API (`is_active`). Mặc định true nếu không có dữ liệu. */
export const normalizeVariantActive = (
  raw: unknown,
  defaultActive = true
): boolean => {
  if (raw === undefined || raw === null) return defaultActive;
  if (typeof raw === "boolean") return raw;
  const s = String(raw).trim().toLowerCase();
  if (s === "false" || s === "0" || s === "no" || s === "off") return false;
  if (s === "true" || s === "1" || s === "yes" || s === "on") return true;
  return defaultActive;
};
