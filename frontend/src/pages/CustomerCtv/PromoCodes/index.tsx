import { useEffect, useMemo, useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { ResponsiveTable, TableCard } from "@/components/ui/ResponsiveTable";
import Pagination from "@/components/ui/Pagination";
import type { PromoCodeItem, PromoStatus } from "./types";
import { PROMO_STATUS_OPTIONS } from "./types";
import { MOCK_PROMO_USAGE } from "./constants";
import { PromoCodeRow } from "./components/PromoCodeRow";
import { PromoCodeCard } from "./components/PromoCodeCard";
import { PromoUsageRow } from "./components/PromoUsageRow";
import { fetchPromotionCodes, mapPromotionCodeToItem } from "@/lib/promotionCodesApi";

const PAGE_SIZE = 10;
type PromoTab = "list" | "history";

export default function PromoCodes() {
  const [activeTab, setActiveTab] = useState<PromoTab>("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<PromoStatus | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [listItems, setListItems] = useState<PromoCodeItem[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setListLoading(true);
        setListError(null);
        const rows = await fetchPromotionCodes();
        if (cancelled) return;
        setListItems(rows.map(mapPromotionCodeToItem));
      } catch (err) {
        if (!cancelled) {
          setListError("Không thể tải danh sách mã khuyến mãi");
          setListItems([]);
        }
      } finally {
        if (!cancelled) setListLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    let list = listItems;
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(
        (item) =>
          item.code.toLowerCase().includes(q) ||
          item.discount.toLowerCase().includes(q) ||
          item.condition.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((item) => item.status === statusFilter);
    }
    return list;
  }, [listItems, searchTerm, statusFilter]);

  const totalItems = filtered.length;
  const start = (currentPage - 1) * PAGE_SIZE;
  const currentRows = filtered.slice(start, start + PAGE_SIZE);

  const filteredHistory = useMemo(() => {
    let list = MOCK_PROMO_USAGE;
    if (historySearchTerm.trim()) {
      const q = historySearchTerm.trim().toLowerCase();
      list = list.filter(
        (item) =>
          item.promoCode.toLowerCase().includes(q) ||
          item.account.toLowerCase().includes(q) ||
          (item.orderCode?.toLowerCase().includes(q) ?? false) ||
          item.discountAmount.toLowerCase().includes(q) ||
          item.usedAt.toLowerCase().includes(q)
      );
    }
    return list;
  }, [historySearchTerm]);

  const historyStart = (historyPage - 1) * PAGE_SIZE;
  const historyRows = filteredHistory.slice(historyStart, historyStart + PAGE_SIZE);
  const totalHistory = filteredHistory.length;

  const handleView = (item: PromoCodeItem) => {
    console.log("View", item);
  };

  const handleEdit = (item: PromoCodeItem) => {
    console.log("Edit", item);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Mã <span className="text-indigo-400">khuyến mãi</span>
          </h1>
          <p className="text-sm font-medium text-white/50 tracking-wide">
            Quản lý mã giảm giá, chiết khấu và điều kiện áp dụng
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setActiveTab("list");
            setCurrentPage(1);
          }}
          className={`px-3.5 py-1.5 rounded-2xl text-xs sm:text-sm font-medium transition-colors ${
            activeTab === "list"
              ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/40"
              : "bg-slate-900/70 text-indigo-200/80 hover:bg-slate-800"
          }`}
        >
          Danh sách mã khuyến mãi
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("history");
            setHistoryPage(1);
          }}
          className={`px-3.5 py-1.5 rounded-2xl text-xs sm:text-sm font-medium transition-colors ${
            activeTab === "history"
              ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/40"
              : "bg-slate-900/70 text-indigo-200/80 hover:bg-slate-800"
          }`}
        >
          Lịch sử sử dụng mã khuyến mãi
        </button>
      </div>

      {activeTab === "list" && (
      <>
      <div className="rounded-[32px] bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 border border-white/15 p-4 lg:p-5 shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7),0_14px_34px_-26px_rgba(255,255,255,0.2)] backdrop-blur-sm">
        {listError && (
          <div className="mb-4 rounded-xl bg-red-500/15 border border-red-500/30 px-4 py-2 text-sm text-red-200">
            {listError}
          </div>
        )}
        <div className="flex flex-col lg:flex-row lg:flex-wrap gap-4 items-stretch lg:items-center">
          <div className="relative w-full lg:flex-1 lg:min-w-[240px]">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-300/70 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm theo mã, chiết khấu, điều kiện..."
              className="w-full pl-11 pr-4 py-2.5 border border-white/10 rounded-2xl bg-slate-950/40 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition-all placeholder:text-slate-400/70"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="relative w-full sm:w-auto sm:min-w-[180px] lg:w-[200px]">
            <select
              className="w-full px-4 py-2.5 border border-white/10 rounded-2xl bg-slate-950/40 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none cursor-pointer transition-all appearance-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='2' stroke='%23818cf8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='m19.5 8.25-7.5 7.5-7.5-7.5' /%3E%3C/svg%3E")`,
                backgroundPosition: "right 1rem center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "1.1rem",
                paddingRight: "2.5rem",
              }}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as PromoStatus | "all");
                setCurrentPage(1);
              }}
            >
              {PROMO_STATUS_OPTIONS.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  className="bg-slate-900 text-white"
                >
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-[18px] bg-gradient-to-br from-indigo-900/70 via-slate-900/70 to-slate-950/70 border border-white/12 shadow-[0_20px_65px_-30px_rgba(0,0,0,0.85)] overflow-hidden">
        {listLoading ? (
          <div className="p-12 text-center text-white/70">
            Đang tải danh sách mã khuyến mãi...
          </div>
        ) : (
        <>
        <ResponsiveTable
          showCardOnMobile
          cardView={
            currentRows.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-white/70 text-lg mb-2">
                  {listItems.length === 0 ? "Chưa có mã khuyến mãi" : "Không tìm thấy mã khuyến mãi nào"}
                </p>
                <p className="text-white/60 text-sm">
                  {listItems.length === 0 ? "" : "Thử thay đổi từ khóa hoặc bộ lọc"}
                </p>
              </div>
            ) : (
              <TableCard
                data={currentRows}
                renderCard={(item, idx) => (
                  <PromoCodeCard
                    item={item as PromoCodeItem}
                    index={start + idx + 1}
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
                <th className="min-w-[120px]">MÃ KHUYẾN MÃI</th>
                <th className="min-w-[90px]">CHIẾT KHẤU</th>
                <th className="min-w-[100px]">TỐI ĐA</th>
                <th className="min-w-[140px]">ĐIỀU KIỆN</th>
                <th className="w-28">TRẠNG THÁI</th>
                <th className="w-28 text-right pr-4">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {currentRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-white/70"
                  >
                    <p className="text-lg mb-2">
                      {listItems.length === 0 ? "Chưa có mã khuyến mãi" : "Không tìm thấy mã khuyến mãi nào"}
                    </p>
                    <p className="text-sm text-white/60">
                      {listItems.length === 0 ? "" : "Thử thay đổi từ khóa hoặc bộ lọc"}
                    </p>
                  </td>
                </tr>
              ) : (
                currentRows.map((item, i) => (
                  <PromoCodeRow
                    key={item.id}
                    item={item}
                    index={start + i + 1}
                    onView={handleView}
                    onEdit={handleEdit}
                  />
                ))
              )}
            </tbody>
          </table>
        </ResponsiveTable>

        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-white/10 bg-slate-900/85 px-4 py-3 sm:px-6">
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
        </>
        )}
      </div>
      </>
      )}

      {activeTab === "history" && (
      <>
      <div className="rounded-[32px] bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 border border-white/15 p-4 lg:p-5 shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7),0_14px_34px_-26px_rgba(255,255,255,0.2)] backdrop-blur-sm">
        <div className="relative w-full max-w-md">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-300/70 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm theo mã KM, tài khoản, mã đơn, giảm giá..."
            className="w-full pl-11 pr-4 py-2.5 border border-white/10 rounded-2xl bg-slate-950/40 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition-all placeholder:text-slate-400/70"
            value={historySearchTerm}
            onChange={(e) => {
              setHistorySearchTerm(e.target.value);
              setHistoryPage(1);
            }}
          />
        </div>
      </div>

      <div className="rounded-[18px] bg-gradient-to-br from-indigo-900/70 via-slate-900/70 to-slate-950/70 border border-white/12 shadow-[0_20px_65px_-30px_rgba(0,0,0,0.85)] overflow-hidden">
        <ResponsiveTable showCardOnMobile={false}>
          <table className="min-w-full divide-y divide-white/5 text-white">
            <thead>
              <tr className="[&>th]:px-2 [&>th]:sm:px-4 [&>th]:py-3 [&>th]:text-[10px] [&>th]:sm:text-[11px] [&>th]:font-bold [&>th]:uppercase [&>th]:tracking-[0.1em] [&>th]:text-indigo-300/70 [&>th]:text-left [&>th]:bg-white/[0.03] [&>th]:whitespace-nowrap">
                <th className="w-12 text-center">STT</th>
                <th className="min-w-[120px]">MÃ KHUYẾN MÃI</th>
                <th className="min-w-[120px]">TÀI KHOẢN</th>
                <th className="min-w-[140px]">THỜI GIAN SỬ DỤNG</th>
                <th className="min-w-[100px]">MÃ ĐƠN</th>
                <th className="min-w-[100px]">GIẢM GIÁ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {historyRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-white/70">
                    <p className="text-lg mb-2">Chưa có lịch sử sử dụng</p>
                    <p className="text-sm text-white/60">Dữ liệu sẽ hiển thị khi có mã được sử dụng</p>
                  </td>
                </tr>
              ) : (
                historyRows.map((item, i) => (
                  <PromoUsageRow key={item.id} item={item} index={historyStart + i + 1} />
                ))
              )}
            </tbody>
          </table>
        </ResponsiveTable>
        {totalHistory > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-white/10 bg-slate-900/85 px-4 py-3 sm:px-6">
            <Pagination
              currentPage={historyPage}
              totalItems={totalHistory}
              pageSize={PAGE_SIZE}
              onPageChange={setHistoryPage}
            />
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
}
