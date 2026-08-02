import { CategoryRow } from "../types";
import { MergedProduct, variantListSortRank } from "./productInfoHelpers";

export const buildCategoryRows = (
  mergedProducts: MergedProduct[]
): CategoryRow[] => {
  const groups = new Map<string, CategoryRow>();
  mergedProducts.forEach((item) => {
    const packageLabel = (item.packageName || "").trim();
    if (!packageLabel) return;
    const cid = item.catalogProductId;
    const key =
      cid != null && Number.isFinite(Number(cid)) && Number(cid) > 0
        ? `p-${Number(cid)}`
        : `name-${packageLabel}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        catalogProductId:
          cid != null && Number.isFinite(Number(cid)) && Number(cid) > 0
            ? Number(cid)
            : null,
        packageName: packageLabel,
        imageUrl: null,
        categories: [],
        items: [],
      });
    }
    const group = groups.get(key);
    if (!group) return;
    group.items.push(item);
    const pkgImg = (item.packageImageUrl || "").trim();
    if (pkgImg && !(group.imageUrl || "").trim()) {
      group.imageUrl = pkgImg;
    }
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
          const wr = variantListSortRank(left) - variantListSortRank(right);
          if (wr !== 0) return wr;
          const leftKey =
            left.productId || left.packageProduct || left.productName || "";
          const rightKey =
            right.productId || right.packageProduct || right.productName || "";
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
