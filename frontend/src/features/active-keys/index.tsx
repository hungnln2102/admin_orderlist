import { useEffect, useMemo, useState } from "react";
import { MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import { ResponsiveTable, TableCard } from "@/components/ui/ResponsiveTable";
import Pagination from "@/components/ui/Pagination";
import type { ActiveKeyItem } from "./types";
import { ActiveKeyRow } from "./components/ActiveKeyRow";
import { ActiveKeyCard } from "./components/ActiveKeyCard";
import { CreateKeyModal } from "./components/CreateKeyModal";
import { apiFetch } from "@/lib/api";

const PAGE_SIZE = 10;

export default function ActiveKeys() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"keys" | "products">("keys");
  const [keyPage, setKeyPage] = useState(1);
  const [productPage, setProductPage] = useState(1);
  const [keys, setKeys] = useState<ActiveKeyItem[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const resp = await apiFetch("/api/key-active/keys");
        if (!resp.ok) {
          throw new Error("Failed to fetch active keys");
        }
        const payload = await resp.json();
        const items = Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(payload)
          ? payload
          : [];
        if (!cancelled) {
          setKeys(items);
        }
      } catch {
        if (!cancelled) {
          setKeys([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return keys;
    const q = searchTerm.trim().toLowerCase();
    return keys.filter(
      (item) =>
        item.account.toLowerCase().includes(q) ||
        item.product.toLowerCase().includes(q) ||
        item.key.toLowerCase().includes(q) ||
        item.expiry.toLowerCase().includes(q)
    );
  }, [searchTerm, keys]);

  const totalKeyItems = filtered.length;
  const startKey = (keyPage - 1) * PAGE_SIZE;
  const currentKeyRows = filtered.slice(startKey, startKey + PAGE_SIZE);

  const productSummary = useMemo(() => {
    const map = new Map<
      string,
      { product: string; keyCount: number }
    >();
    filtered.forEach((item) => {
      const label = (item.systemName || item.product || "").trim();
      if (!label) return;
      const existing = map.get(label) || {
        product: label,
        keyCount: 0,
      };
      existing.keyCount += 1;
      map.set(label, existing);
    });
    return Array.from(map.values());
  }, [filtered]);

  const totalProductItems = productSummary.length;
  const startProduct = (productPage - 1) * PAGE_SIZE;
  const currentProductRows = productSummary.slice(
    startProduct,
    startProduct + PAGE_SIZE
  );

  const handleView = (item: ActiveKeyItem) => {
    console.log("View", item);
  };

  const handleEdit = (item: ActiveKeyItem) => {
    console.log("Edit", item);
  };

  const handleCreateSuccess = (item: ActiveKeyItem) => {
    setKeys((prev) => [item, ...prev]);
    setCreateModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Quản lí <span className="text-indigo-400">Key active</span>
          </h1>
          <p className="text-sm font-medium text-white/50 tracking-wide">
            Xem và quản lý key kích hoạt sản phẩm
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
        >
          <PlusIcon className="h-5 w-5" />
          Tạo key
        </button>
      </div>

      <CreateKeyModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      <div className="rounded-[32px] bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 border border-white/15 p-4 lg:p-5 shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7),0_14px_34px_-26px_rgba(255,255,255,0.2)] backdrop-blur-sm">
        <div className="relative w-full max-w-md">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-300/70 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm theo mã đơn hàng, sản phẩm, key, thời hạn..."
            className="w-full pl-11 pr-4 py-2.5 border border-white/10 rounded-2xl bg-slate-950/40 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition-all placeholder:text-slate-400/70"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setKeyPage(1);
              setProductPage(1);
            }}
          />
        </div>
      </div>

      <div className="rounded-[18px] bg-gradient-to-br from-indigo-900/70 via-slate-900/70 to-slate-950/70 border border-white/12 shadow-[0_20px_65px_-30px_rgba(0,0,0,0.85)] overflow-hidden">
        <div className="flex border-b border-white/10 bg-white/[0.02]">
          <button
            type="button"
            onClick={() => setActiveTab("keys")}
            className={`flex-1 px-4 py-3 text-xs sm:text-sm font-semibold tracking-wide uppercase ${
              activeTab === "keys"
                ? "text-indigo-300 border-b-2 border-indigo-400 bg-white/[0.03]"
                : "text-white/60 hover:text-white hover:bg-white/[0.03]"
            }`}
          >
            Danh sách Key
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("products")}
            className={`flex-1 px-4 py-3 text-xs sm:text-sm font-semibold tracking-wide uppercase ${
              activeTab === "products"
                ? "text-indigo-300 border-b-2 border-indigo-400 bg-white/[0.03]"
                : "text-white/60 hover:text-white hover:bg-white/[0.03]"
            }`}
          >
            Danh sách sản phẩm
          </button>
        </div>

        {activeTab === "keys" ? (
          <>
            <ResponsiveTable
              showCardOnMobile
              cardView={
                currentKeyRows.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-white/70 text-lg mb-2">
                      Không tìm thấy key nào
                    </p>
                    <p className="text-white/60 text-sm">
                      Thử thay đổi từ khóa tìm kiếm
                    </p>
                  </div>
                ) : (
                  <TableCard
                    data={currentKeyRows}
                    renderCard={(item, idx) => (
                      <ActiveKeyCard
                        item={item as ActiveKeyItem}
                        index={startKey + idx + 1}
                        onView={handleView}
                        onEdit={handleEdit}
                      />
                    )}
                    className="p-4"
                  />
                )
              }
            >
              <table className="min-w-full divide-y divide-white/5 text-white">
                <thead>
                  <tr className="[&>th]:px-2 [&>th]:sm:px-4 [&>th]:py-3 [&>th]:text-[10px] [&>th]:sm:text-[11px] [&>th]:font-bold [&>th]:uppercase [&>th]:tracking-[0.1em] [&>th]:text-indigo-300/70 [&>th]:text-left [&>th]:bg-white/[0.03] [&>th]:whitespace-nowrap">
                    <th className="w-12 text-center">STT</th>
                    <th className="min-w-[140px]">MÃ ĐƠN HÀNG</th>
                    <th className="min-w-[160px]">SẢN PHẨM</th>
                    <th className="min-w-[200px]">KEY</th>
                    <th className="min-w-[100px]">THỜI HẠN</th>
                    <th className="w-28 text-right pr-4">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {currentKeyRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-12 text-center text-white/70"
                      >
                        <p className="text-lg mb-2">Không tìm thấy key nào</p>
                        <p className="text-sm text-white/60">
                          Thử thay đổi từ khóa tìm kiếm
                        </p>
                      </td>
                    </tr>
                  ) : (
                    currentKeyRows.map((item, i) => (
                      <ActiveKeyRow
                        key={item.id}
                        item={item}
                        index={startKey + i + 1}
                        onView={handleView}
                        onEdit={handleEdit}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </ResponsiveTable>

            {totalKeyItems > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-white/10 bg-slate-900/85 px-4 py-3 sm:px-6">
                <Pagination
                  currentPage={keyPage}
                  totalItems={totalKeyItems}
                  pageSize={PAGE_SIZE}
                  onPageChange={setKeyPage}
                />
              </div>
            )}
          </>
        ) : (
          <>
            <ResponsiveTable showCardOnMobile>
              <table className="min-w-full divide-y divide-white/5 text-white">
                <thead>
                  <tr className="[&>th]:px-2 [&>th]:sm:px-4 [&>th]:py-3 [&>th]:text-[10px] [&>th]:sm:text-[11px] [&>th]:font-bold [&>th]:uppercase [&>th]:tracking-[0.1em] [&>th]:text-indigo-300/70 [&>th]:text-left [&>th]:bg-white/[0.03] [&>th]:whitespace-nowrap">
                    <th className="w-12 text-center">STT</th>
                    <th className="min-w-[180px]">SẢN PHẨM</th>
                    <th className="min-w-[120px]">SỐ LƯỢNG KEY</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {currentProductRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-12 text-center text-white/70"
                      >
                        <p className="text-lg mb-2">
                          Không tìm thấy sản phẩm nào
                        </p>
                        <p className="text-sm text-white/60">
                          Thử thay đổi từ khóa tìm kiếm
                        </p>
                      </td>
                    </tr>
                  ) : (
                    currentProductRows.map((item, index) => (
                      <tr key={item.product}>
                        <td className="px-2 sm:px-4 py-3 text-center text-sm text-white/80">
                          {startProduct + index + 1}
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-sm font-medium text-white">
                          {item.product}
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-sm text-white/80">
                          {item.keyCount}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </ResponsiveTable>

            {totalProductItems > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-white/10 bg-slate-900/85 px-4 py-3 sm:px-6">
                <Pagination
                  currentPage={productPage}
                  totalItems={totalProductItems}
                  pageSize={PAGE_SIZE}
                  onPageChange={setProductPage}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
