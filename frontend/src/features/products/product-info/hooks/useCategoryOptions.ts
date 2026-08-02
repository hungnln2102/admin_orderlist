import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet } from "@/shared/api/client";
import { normalizeErrorMessage } from "@/lib/textUtils";
import { CategoryItem } from "../utils/productInfoHelpers";

type UseCategoryOptionsResult = {
  categoryOptions: CategoryItem[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

export const useCategoryOptions = (): UseCategoryOptionsResult => {
  const [categoryOptions, setCategoryOptions] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadCategories = useCallback(async () => {
    if (!isMountedRef.current) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<CategoryItem[]>("/api/categories");
      if (!isMountedRef.current) return;
      const nextOptions = Array.isArray(data) ? data : [];
      nextOptions.sort((left, right) =>
        String(left?.name || "").localeCompare(String(right?.name || ""), "vi", {
          sensitivity: "base",
        })
      );
      setCategoryOptions(nextOptions);
    } catch (err) {
      if (!isMountedRef.current) return;
      setCategoryOptions([]);
      setError(
        normalizeErrorMessage(
          err instanceof Error ? err.message : String(err ?? ""),
          { fallback: "Cannot load categories." }
        )
      );
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  return {
    categoryOptions,
    loading,
    error,
    reload: loadCategories,
  };
};
