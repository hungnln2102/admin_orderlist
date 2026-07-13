import { useCallback, useState } from "react";
import { apiPost } from "@/shared/api/client";
import { normalizeErrorMessage } from "@/lib/textUtils";
import { generateUniqueCategoryGradient } from "../utils/categoryColors";

type UseCategoryCreateParams = {
  reloadCategories: () => Promise<void>;
  existingCategoryColors: string[];
};

type UseCategoryCreateResult = {
  createCategoryOpen: boolean;
  newCategoryName: string;
  setNewCategoryName: React.Dispatch<React.SetStateAction<string>>;
  newCategoryColor: string;
  setNewCategoryColor: React.Dispatch<React.SetStateAction<string>>;
  creatingCategory: boolean;
  createCategoryError: string | null;
  openCreateCategory: () => void;
  closeCreateCategory: () => void;
  shuffleNewCategoryColor: () => void;
  handleCreateCategory: () => Promise<void>;
};

export const useCategoryCreate = ({
  reloadCategories,
  existingCategoryColors,
}: UseCategoryCreateParams): UseCategoryCreateResult => {
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [createCategoryError, setCreateCategoryError] = useState<string | null>(
    null
  );

  const openCreateCategory = useCallback(() => {
    setCreateCategoryOpen(true);
    setCreateCategoryError(null);
    setNewCategoryName("");
    setNewCategoryColor(
      generateUniqueCategoryGradient(existingCategoryColors)
    );
  }, [existingCategoryColors]);

  const closeCreateCategory = useCallback(() => {
    setCreateCategoryOpen(false);
    setCreatingCategory(false);
    setCreateCategoryError(null);
    setNewCategoryName("");
    setNewCategoryColor("");
  }, []);

  const shuffleNewCategoryColor = useCallback(() => {
    setNewCategoryColor((current) =>
      generateUniqueCategoryGradient(
        [...existingCategoryColors, current].filter((c) => c.length > 0)
      )
    );
  }, [existingCategoryColors]);

  const handleCreateCategory = useCallback(async () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) {
      setCreateCategoryError("Vui lòng nhập tên danh mục.");
      return;
    }
    setCreatingCategory(true);
    setCreateCategoryError(null);
    try {
      await apiPost("/api/categories", {
        name: trimmedName,
        color: (newCategoryColor || "").trim() || null,
      });
      await reloadCategories();
      setCreateCategoryOpen(false);
      setNewCategoryName("");
      setNewCategoryColor("");
    } catch (err) {
      setCreateCategoryError(
        normalizeErrorMessage(
          err instanceof Error ? err.message : String(err ?? ""),
          { fallback: "Cannot create category." }
        )
      );
    } finally {
      setCreatingCategory(false);
    }
  }, [newCategoryName, newCategoryColor, reloadCategories]);

  return {
    createCategoryOpen,
    newCategoryName,
    setNewCategoryName,
    newCategoryColor,
    setNewCategoryColor,
    creatingCategory,
    createCategoryError,
    openCreateCategory,
    closeCreateCategory,
    shuffleNewCategoryColor,
    handleCreateCategory,
  };
};
