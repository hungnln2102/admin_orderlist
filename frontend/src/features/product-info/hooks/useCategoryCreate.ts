import { useCallback, useState } from "react";
import { apiFetch } from "@/lib/api";
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
      const response = await apiFetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          color: (newCategoryColor || "").trim() || null,
        }),
      });
      if (!response.ok) {
        const message = await response.text().catch(() => "");
        throw new Error(
          message || `Failed to create category (${response.status}).`
        );
      }
      await response.json().catch(() => null);
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
