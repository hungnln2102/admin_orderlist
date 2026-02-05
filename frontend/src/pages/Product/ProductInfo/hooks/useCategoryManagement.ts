import { useState, useCallback } from "react";
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  CategoryItem,
  CreateCategoryData,
  UpdateCategoryData,
} from "../../../../lib/categoryApi";

interface UseCategoryManagementResult {
  categories: CategoryItem[];
  loading: boolean;
  error: string | null;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  reload: () => Promise<void>;
  create: (data: CreateCategoryData) => Promise<CategoryItem>;
  update: (id: number, data: UpdateCategoryData) => Promise<CategoryItem>;
  remove: (id: number) => Promise<void>;
}

export const useCategoryManagement = (): UseCategoryManagementResult => {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories");
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(
    async (data: CreateCategoryData): Promise<CategoryItem> => {
      setCreating(true);
      setError(null);
      try {
        const newCategory = await createCategory(data);
        await reload();
        return newCategory;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to create category";
        setError(errorMsg);
        throw err;
      } finally {
        setCreating(false);
      }
    },
    [reload]
  );

  const update = useCallback(
    async (id: number, data: UpdateCategoryData): Promise<CategoryItem> => {
      setUpdating(true);
      setError(null);
      try {
        const updatedCategory = await updateCategory(id, data);
        await reload();
        return updatedCategory;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to update category";
        setError(errorMsg);
        throw err;
      } finally {
        setUpdating(false);
      }
    },
    [reload]
  );

  const remove = useCallback(
    async (id: number): Promise<void> => {
      setDeleting(true);
      setError(null);
      try {
        await deleteCategory(id);
        await reload();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to delete category";
        setError(errorMsg);
        throw err;
      } finally {
        setDeleting(false);
      }
    },
    [reload]
  );

  return {
    categories,
    loading,
    error,
    creating,
    updating,
    deleting,
    reload,
    create,
    update,
    remove,
  };
};
