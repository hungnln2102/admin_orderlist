import { useMemo, useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { ResponsiveTable, TableCard } from "@/components/ui/ResponsiveTable";
import Pagination from "@/components/ui/Pagination";
import type { ActiveKeyItem } from "./types";
import { MOCK_ACTIVE_KEYS } from "./constants";
import { ActiveKeyRow } from "./components/ActiveKeyRow";
import { ActiveKeyCard } from "./components/ActiveKeyCard";

const PAGE_SIZE = 10;

export default function ActiveKeys() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return MOCK_ACTIVE_KEYS;
    const q = searchTerm.trim().toLowerCase();
    return MOCK_ACTIVE_KEYS.filter(
      (item) =>
        item.product.toLowerCase().includes(q) ||
        item.key.toLowerCase().includes(q) ||
        item.expiry.toLowerCase().includes(q)
    );
  }, [searchTerm]);

  const totalItems = filtered.length;
  const start = (currentPage - 1) * PAGE_SIZE;
  const currentRows = filtered.slice(start, start + PAGE_SIZE);

  const handleView = (item: ActiveKeyItem) => {
    console.log("View", item);
  };

  const handleEdit = (item: ActiveKeyItem) => {
    console.log("Edit", item);
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
      </div>

      <div className="rounded-[32px] bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 border border-white/15 p-4 lg:p-5 shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7),0_14px_34px_-26px_rgba(255,255,255,0.2)] backdrop-blur-sm">
        <div className="relative w-full max-w-md">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-300/70 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm theo sản phẩm, key, thời hạn..."
            className="w-full pl-11 pr-4 py-2.5 border border-white/10 rounded-2xl bg-slate-950/40 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition-all placeholder:text-slate-400/70"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      <div className="rounded-[18px] bg-gradient-to-br from-indigo-900/70 via-slate-900/70 to-slate-950/70 border border-white/12 shadow-[0_20px_65px_-30px_rgba(0,0,0,0.85)] overflow-hidden">
        <ResponsiveTable
          showCardOnMobile
          cardView={
            currentRows.length === 0 ? (
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
                data={currentRows}
                renderCard={(item, idx) => (
                  <ActiveKeyCard
                    item={item as ActiveKeyItem}
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
                <th className="min-w-[160px]">SẢN PHẨM</th>
                <th className="min-w-[200px]">KEY</th>
                <th className="min-w-[100px]">THỜI HẠN</th>
                <th className="w-28 text-right pr-4">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {currentRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-white/70"
                  >
                    <p className="text-lg mb-2">Không tìm thấy key nào</p>
                    <p className="text-sm text-white/60">
                      Thử thay đổi từ khóa tìm kiếm
                    </p>
                  </td>
                </tr>
              ) : (
                currentRows.map((item, i) => (
                  <ActiveKeyRow
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
      </div>
    </div>
  );
}
