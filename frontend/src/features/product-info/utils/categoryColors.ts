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
