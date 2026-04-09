import type { CSSProperties } from "react";
import { CategoryItem } from "./productInfoHelpers";

export const CATEGORY_COLORS = [
  "#facc15",
  "#f97316",
  "#22c55e",
  "#38bdf8",
  "#a855f7",
  "#f43f5e",
  "#14b8a6",
  "#eab308",
];

export const getCategoryColor = (
  category: CategoryItem,
  index: number
): string => {
  if (category.color) return category.color;
  const id = Number(category.id);
  if (Number.isFinite(id)) {
    return CATEGORY_COLORS[Math.abs(id) % CATEGORY_COLORS.length];
  }
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
};

export const getCategoryColorById = (
  categoryId: number,
  color?: string | null
): string => {
  if (color) return color;
  if (Number.isFinite(categoryId)) {
    return CATEGORY_COLORS[Math.abs(categoryId) % CATEGORY_COLORS.length];
  }
  return CATEGORY_COLORS[0];
};

const hsl = (h: number, s: number, l: number) =>
  `hsl(${Math.round(h)} ${s}% ${l}%)`;

export const isGradientCssValue = (color: string): boolean =>
  /^(linear|radial|conic)-gradient\(/i.test((color || "").trim());

/** Chuẩn hóa chuỗi màu để so sánh trùng (hex / gradient). */
export const normalizeCategoryColorKey = (value: string): string =>
  value.replace(/\s+/g, " ").trim().toLowerCase();

export function generateRandomCategoryGradient(): string {
  const angle = 95 + Math.floor(Math.random() * 75);
  const h1 = Math.floor(Math.random() * 360);
  const h2 = (h1 + 28 + Math.floor(Math.random() * 80)) % 360;
  return `linear-gradient(${angle}deg, ${hsl(h1, 72, 54)}, ${hsl(h2, 68, 42)})`;
}

export function generateUniqueCategoryGradient(existing: string[]): string {
  const taken = new Set(
    existing.map((c) => normalizeCategoryColorKey(c)).filter(Boolean)
  );
  for (let attempt = 0; attempt < 480; attempt++) {
    const g = generateRandomCategoryGradient();
    if (!taken.has(normalizeCategoryColorKey(g))) return g;
  }
  const salt = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const h =
    salt.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360;
  return `linear-gradient(127deg, ${hsl(h, 70, 48)}, ${hsl((h + 47) % 360, 64, 36)})`;
}

export function getCategoryVisualStyle(
  color: string | null | undefined
): CSSProperties {
  const c = (color || "").trim();
  if (!c) {
    return { backgroundColor: CATEGORY_COLORS[0] };
  }
  if (isGradientCssValue(c)) {
    return { background: c, backgroundColor: "transparent" };
  }
  return { backgroundColor: c };
}

/** Viên pill danh mục: gradient dùng chữ sáng; hex giữ nền đặc. */
export function getCategoryPillVisualStyle(
  category: CategoryItem,
  index: number
): CSSProperties {
  const raw = getCategoryColor(category, index);
  const base = getCategoryVisualStyle(raw);
  if (isGradientCssValue(raw)) {
    return {
      ...base,
      color: "#f8fafc",
      textShadow: "0 1px 2px rgba(0, 0, 0, 0.45)",
    };
  }
  return base;
}
