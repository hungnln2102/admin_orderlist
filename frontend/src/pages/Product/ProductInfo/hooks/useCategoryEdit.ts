import { useCallback, useState } from "react";
import { updateProductPrice } from "../../../../lib/productPricesApi";
import { normalizeErrorMessage } from "../../../../lib/textUtils";
import { CategoryRow } from "../types";
import { getCategoryColorById } from "../utils/categoryColors";
import { CategoryItem } from "../utils/productInfoHelpers";

type UseCategoryEditParams = {
  categoryOptions: CategoryItem[];
  reloadProducts: () => Promise<void>;
  onOpenEdit?: () => void;
};

type UseCategoryEditResult = {
  editingCategoryGroup: CategoryRow | null;
  categoryPackageName: string;
  setCategoryPackageName: React.Dispatch<React.SetStateAction<string>>;
  categoryImageUrl: string;
  setCategoryImageUrl: React.Dispatch<React.SetStateAction<string>>;
  selectedCategoryIds: number[];
  categorySaving: boolean;
  categorySaveError: string | null;
  openCategoryEdit: (group: CategoryRow) => void;
  closeCategoryEdit: () => void;
  handleToggleCategory: (categoryId: number) => void;
  handleSaveCategory: () => Promise<void>;
};

export const useCategoryEdit = ({
  categoryOptions,
  reloadProducts,
  onOpenEdit,
}: UseCategoryEditParams): UseCategoryEditResult => {
  const [editingCategoryGroup, setEditingCategoryGroup] =
    useState<CategoryRow | null>(null);
  const [categoryPackageName, setCategoryPackageName] = useState("");
  const [categoryImageUrl, setCategoryImageUrl] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [categorySaving, setCategorySaving] = useState(false);
  const [categorySaveError, setCategorySaveError] = useState<string | null>(
    null
  );

  const openCategoryEdit = useCallback(
    (group: CategoryRow) => {
      setEditingCategoryGroup(group);
      setCategoryPackageName(group.packageName || "");
      setCategoryImageUrl(group.imageUrl || "");
      const initialIds = (group.categories || [])
        .map((category) => Number(category.id))
        .filter((id) => Number.isFinite(id));
      setSelectedCategoryIds(Array.from(new Set(initialIds)));
      setCategorySaveError(null);
      if (onOpenEdit) {
        onOpenEdit();
      }
    },
    [onOpenEdit]
  );

  const closeCategoryEdit = useCallback(() => {
    setEditingCategoryGroup(null);
    setCategorySaving(false);
    setCategorySaveError(null);
  }, []);

  const handleToggleCategory = useCallback((categoryId: number) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  }, []);

  const handleSaveCategory = useCallback(async () => {
    if (!editingCategoryGroup) return;
    const targetItem =
      editingCategoryGroup.items.find((item) =>
        Number.isFinite(Number(item.priceId))
      ) ||
      editingCategoryGroup.items.find((item) =>
        Number.isFinite(Number(item.id))
      );
    const targetId = targetItem
      ? Number(targetItem.priceId ?? targetItem.id)
      : null;
    if (!targetId) {
      setCategorySaveError("Missing product id for update.");
      return;
    }

    setCategorySaving(true);
    setCategorySaveError(null);
    const trimmedPackageName = categoryPackageName.trim();
    const colorMap = selectedCategoryIds.reduce<Record<number, string>>(
      (acc, categoryId) => {
        const option = categoryOptions.find((cat) => cat.id === categoryId);
        acc[categoryId] = getCategoryColorById(
          categoryId,
          option?.color ?? null
        );
        return acc;
      },
      {}
    );

    try {
      await updateProductPrice(targetId, {
        packageName: trimmedPackageName,
        categoryIds: selectedCategoryIds,
        categoryColors: colorMap,
        imageUrl: categoryImageUrl.trim() || null,
      });
      await reloadProducts();
      setEditingCategoryGroup(null);
    } catch (err) {
      setCategorySaveError(
        normalizeErrorMessage(
          err instanceof Error ? err.message : String(err ?? ""),
          { fallback: "Cannot update category." }
        )
      );
    } finally {
      setCategorySaving(false);
    }
  }, [
    editingCategoryGroup,
    categoryPackageName,
    categoryImageUrl,
    selectedCategoryIds,
    categoryOptions,
    reloadProducts,
  ]);

  return {
    editingCategoryGroup,
    categoryPackageName,
    setCategoryPackageName,
    categoryImageUrl,
    setCategoryImageUrl,
    selectedCategoryIds,
    categorySaving,
    categorySaveError,
    openCategoryEdit,
    closeCategoryEdit,
    handleToggleCategory,
    handleSaveCategory,
  };
};
