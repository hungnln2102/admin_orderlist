import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/shared/api/client";

type SellerPricingItem = {
  id: number;
  product_name: string;
  gia_ctv: number;
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

export default function PricingSellerPage() {
  const [items, setItems] = useState<SellerPricingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const hasRows = useMemo(() => items.length > 0, [items]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl rounded-xl bg-white p-4 shadow-sm sm:p-6">
        <header className="mb-4 border-b border-slate-200 pb-4">
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Bảng giá sản phẩm</h1>
          <p className="mt-1 text-sm text-slate-500">Giá CTV và giá lẻ cập nhật theo hệ thống.</p>
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

        {!loading && !error && !hasRows ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
            Hiện chưa có dữ liệu giá sản phẩm.
          </div>
        ) : null}

        {!loading && !error && hasRows ? (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">
                    Tên sản phẩm
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">
                    Gia CTV
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">
                    Gia le
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-sm text-slate-900">{item.product_name || "-"}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-slate-700">
                      {formatVnd(item.gia_ctv)}
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
      </div>
    </main>
  );
}
