import { useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type UsePackageCategoryRouteSyncParams = {
  categoryFilter: string;
  setCategoryFilter: React.Dispatch<React.SetStateAction<string>>;
};

export const usePackageCategoryRouteSync = ({
  categoryFilter,
  setCategoryFilter,
}: UsePackageCategoryRouteSyncParams) => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const packageParam = params.get("package");
    const normalizedCategory = packageParam || "all";

    setCategoryFilter((prev) =>
      prev === normalizedCategory ? prev : normalizedCategory
    );
  }, [location.search, setCategoryFilter]);

  const handleCategorySelect = useCallback(
    (value: string) => {
      const next =
        value === "all" ? "all" : categoryFilter === value ? "all" : value;

      if (next !== categoryFilter) {
        setCategoryFilter(next);
      }

      const params = new URLSearchParams(location.search);
      if (next === "all") {
        params.delete("package");
      } else {
        params.set("package", next);
      }

      const search = params.toString();
      const nextSearch = search ? `?${search}` : "";
      if (nextSearch !== location.search) {
        navigate(
          {
            pathname: location.pathname,
            search: nextSearch,
          },
          { replace: true }
        );
      }
    },
    [
      categoryFilter,
      location.pathname,
      location.search,
      navigate,
      setCategoryFilter,
    ]
  );

  return { handleCategorySelect };
};
