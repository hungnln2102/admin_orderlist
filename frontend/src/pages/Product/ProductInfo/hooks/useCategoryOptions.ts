import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "../../../../lib/api";
import { normalizeErrorMessage } from "../../../../lib/textUtils";
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
      const response = await apiFetch("/api/categories");
      if (!response.ok) {
        const message = await response.text().catch(() => "");
        throw new Error(
          message || `Failed to load categories (${response.status}).`
        );
      }
      const data = (await response.json().catch(() => [])) as
        | CategoryItem[]
        | [];
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
