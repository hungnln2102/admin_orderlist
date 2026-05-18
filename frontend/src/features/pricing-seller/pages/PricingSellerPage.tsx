import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/shared/api/client";
import CategoryFilterPanel from "../components/CategoryFilterPanel";
import SellerPricingTable from "../components/SellerPricingTable";
import type { SellerPricingItem, SellerPricingResponse } from "../types";
import { getCategoryFilterOptions } from "../utils";

export default function PricingSellerPage() {
  const PAGE_SIZE = 20;
  const [items, setItems] = useState<SellerPricingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiFetch("/api/public/pricing/seller-table");
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = (await res.json()) as SellerPricingResponse;
        if (!active) return;
        setItems(Array.isArray(data.items) ? data.items : []);
      } catch {
        if (!active) return;
        setError("Không thể tải bảng giá. Vui lòng thử lại.");
        setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();
    return () => {
      active = false;
    };
  }, []);

  const normalizedSearch = search.trim().toLowerCase();
  const categoryOptions = useMemo(() => getCategoryFilterOptions(items), [items]);

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const matchesSearch = !normalizedSearch
          ? true
          : String(item.variant_name || "").toLowerCase().includes(normalizedSearch) ||
            String(item.display_name || "").toLowerCase().includes(normalizedSearch) ||
            String(item.product_name || "").toLowerCase().includes(normalizedSearch);

        const matchesCategory =
          activeCategoryId == null
            ? true
            : Array.isArray(item.categories) &&
              item.categories.some((category) => Number(category?.id) === activeCategoryId);

        return matchesSearch && matchesCategory;
      }),
    [activeCategoryId, items, normalizedSearch]
  );

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filteredItems.slice(startIndex, startIndex + PAGE_SIZE);
  const hasRows = filteredItems.length > 0;

  useEffect(() => {
    setPage(1);
  }, [search, activeCategoryId]);

  useEffect(() => {
    if (
      activeCategoryId != null &&
      !categoryOptions.some((category) => category.id === activeCategoryId)
    ) {
      setActiveCategoryId(null);
    }
  }, [activeCategoryId, categoryOptions]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl rounded-xl bg-white p-4 shadow-sm sm:p-6">
        <header className="mb-4 border-b border-slate-200 pb-4">
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Bảng giá bán</h1>
          <p className="mt-1 text-sm text-slate-500">Giá sỉ và giá lẻ theo từng variant.</p>
        </header>

        {loading ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
            Đang tải dữ liệu bảng giá...
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {!loading && !error ? (
          <div className="mb-4 space-y-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm sản phẩm theo variant hoặc tên product..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
            />
            <p className="text-xs text-slate-500">
              Đang lọc danh mục:{" "}
              <span className="font-medium text-slate-700">
                {activeCategoryId == null
                  ? "Tất cả"
                  : categoryOptions.find((item) => item.id === activeCategoryId)?.name || "Tất cả"}
              </span>
            </p>
          </div>
        ) : null}

        {!loading && !error && !hasRows ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
            Không tìm thấy sản phẩm phù hợp.
          </div>
        ) : null}

        {!loading && !error && hasRows ? (
          <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
            <CategoryFilterPanel
              categories={categoryOptions}
              activeCategoryId={activeCategoryId}
              onChangeCategory={setActiveCategoryId}
            />
            <SellerPricingTable items={pageItems} />
          </div>
        ) : null}

        {!loading && !error && hasRows ? (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              Hiển thị {startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, filteredItems.length)} /{" "}
              {filteredItems.length} sản phẩm
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage <= 1}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Trước
              </button>
              <span className="text-sm text-slate-700">
                Trang {currentPage}/{totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sau
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
