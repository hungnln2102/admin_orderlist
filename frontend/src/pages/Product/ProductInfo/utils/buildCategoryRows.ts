import { CategoryRow } from "../types";
import { MergedProduct, stripDurationSuffix } from "./productInfoHelpers";

export const buildCategoryRows = (
  mergedProducts: MergedProduct[]
): CategoryRow[] => {
  const groups = new Map<string, CategoryRow>();
  mergedProducts.forEach((item) => {
    const packageLabel = (item.packageName || "").trim();
    if (!packageLabel) return;
    const key = packageLabel;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        packageName: packageLabel,
        imageUrl: item.packageImageUrl ?? null,
        categories: [],
        items: [],
      });
    }
    groups.get(key)?.items.push(item);
  });

  return Array.from(groups.entries())
    .map(([, group]) => {
      const categoryMap = new Map<
        string,
        NonNullable<MergedProduct["categories"]>[number]
      >();
      group.items.forEach((item) => {
        (item.categories || []).forEach((category) => {
          if (!category || !category.name) return;
          const mapKey = category.id ? String(category.id) : category.name;
          if (!categoryMap.has(mapKey)) {
            categoryMap.set(mapKey, category);
          }
        });
      });
      return {
        ...group,
        categories: Array.from(categoryMap.values()).sort((left, right) =>
          String(left?.name || "").localeCompare(String(right?.name || ""), "vi", {
            sensitivity: "base",
          })
        ),
        items: [...group.items].sort((left, right) => {
          const leftKey = stripDurationSuffix(
            left.productId || left.packageProduct || left.productName || ""
          );
          const rightKey = stripDurationSuffix(
            right.productId || right.packageProduct || right.productName || ""
          );
          return leftKey.localeCompare(rightKey, "vi", { sensitivity: "base" });
        }),
      };
    })
    .sort((left, right) =>
      left.packageName.localeCompare(right.packageName, "vi", {
        sensitivity: "base",
      })
    );
};
