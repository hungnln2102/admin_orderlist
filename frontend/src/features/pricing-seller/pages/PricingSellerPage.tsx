import { useEffect, useState } from "react";
import { apiFetch } from "@/shared/api/client";

type SellerPricingItem = {
  variant_name: string;
  display_name?: string;
  gia_goc: number;
  gia_si: number;
  gia_le: number;
};

type SellerPricingResponse = {
  items?: SellerPricingItem[];
};

const money = new Intl.NumberFormat("vi-VN");

function formatVnd(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `${money.format(Math.round(safe))} ₫`;
}

function parseDurationFromVariantName(
  variantName: string,
  displayName?: string
): string {
  const candidates = [variantName, displayName ?? ""];
  for (const candidate of candidates) {
    const normalized = String(candidate || "").trim();
    const matched = normalized.match(/-{2,}\s*(\d+)\s*([md])$/i);
    if (!matched) continue;

    const value = Number(matched[1]);
    if (!Number.isFinite(value) || value <= 0) continue;

    return matched[2].toLowerCase() === "m" ? `${value} tháng` : `${value} ngày`;
  }
  return "-";
}

export default function PricingSellerPage() {
  const PAGE_SIZE = 20;
  const [items, setItems] = useState<SellerPricingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
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
  const filteredItems = items.filter((item) => {
    if (!normalizedSearch) return true;
    const variantName = String(item.variant_name || "").toLowerCase();
    const displayName = String(item.display_name || "").toLowerCase();
    return variantName.includes(normalizedSearch) || displayName.includes(normalizedSearch);
  });

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filteredItems.slice(startIndex, startIndex + PAGE_SIZE);
  const hasRows = filteredItems.length > 0;

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl rounded-xl bg-white p-4 shadow-sm sm:p-6">
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
          <div className="mb-4">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm sản phẩm theo variant..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
            />
          </div>
        ) : null}

        {!loading && !error && !hasRows ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
            Không tìm thấy sản phẩm phù hợp.
          </div>
        ) : null}

        {!loading && !error && hasRows ? (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">
                    Variant
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">
                    Thời hạn
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">
                    Giá gốc
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">
                    Gia si
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">
                    Gia le
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {pageItems.map((item) => (
                  <tr key={`${item.variant_name}-${item.gia_si}-${item.gia_le}`}>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      {item.variant_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {parseDurationFromVariantName(item.variant_name, item.display_name)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-slate-700">
                      {formatVnd(item.gia_goc)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-slate-700">
                      {formatVnd(item.gia_si)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-slate-700">
                      {formatVnd(item.gia_le)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
