import { formatDateToDMY } from "@/shared/date";
import { formatCurrency as formatMoney } from "@/shared/money";
import React from "react";
import { PowerIcon, EyeIcon, PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Supply } from "../types";
import PaymentHistoryTable from "./PaymentHistoryTable";
const formatDate = (date: string | null) => (date ? formatDateToDMY(date) : "--");

interface Props {
  supplies: Supply[];
  loading: boolean;
  expandedId: number | null;
  onToggle: (id: number) => void;
  onEdit: (supply: Supply) => void;
  onDelete: (supply: Supply) => void;
  onView: (supply: Supply) => void;
  onToggleStatus: (supply: Supply) => void;
}

import { ResponsiveTable, TableCard } from "@/components/ui/ResponsiveTable";
import { SupplyCard } from "./SupplyCard";

const SupplyList: React.FC<Props> = ({
  supplies,
  loading,
  expandedId,
  onToggle,
  onEdit,
  onDelete,
  onView,
  onToggleStatus,
}) => {
  const [page, setPage] = React.useState(1);
  const limit = 10;
  const total = supplies.length;
  const totalPages = Math.ceil(total / limit);

  React.useEffect(() => {
    if (page > Math.ceil(supplies.length / limit) && supplies.length > 0) {
      setPage(Math.ceil(supplies.length / limit));
    }
  }, [supplies.length, page, limit]);

  const paginatedSupplies = React.useMemo(() => {
    const start = (page - 1) * limit;
    return supplies.slice(start, start + limit);
  }, [supplies, page, limit]);

  return (
    <div className="supply-list rounded-3xl overflow-hidden bg-slate-950/40 backdrop-blur-2xl border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
      <ResponsiveTable
        className="supply-list__inner"
        showCardOnMobile={true}
        cardView={
            loading ? (
                <div className="p-12 flex flex-col items-center justify-center text-indigo-200/50">
                  <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mb-4" />
                  <p>Đang tải dữ liệu NCC...</p>
                </div>
            ) : supplies.length === 0 ? (
                <div className="p-12 text-center text-white/40">Chưa có nhà cung cấp nào</div>
            ) : (
                <TableCard
                    data={paginatedSupplies as unknown as Record<string, unknown>[]}
                    renderCard={(item) => (
                        <SupplyCard
                            supply={item as unknown as Supply}
                            onToggleStatus={onToggleStatus}
                            onView={onView}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    )}
                    className="p-4"
                />
            )
        }
      >
        <table className="supply-list__table w-full text-left border-collapse table-auto">
          <thead className="bg-slate-900/40 text-[9px] sm:text-[10px] uppercase text-indigo-200/50 font-bold tracking-[0.08em] sm:tracking-[0.15em] border-b border-white/5">
            <tr>
              <th className="px-3 sm:px-6 py-3 sm:py-4 font-semibold">Nhà cung cấp</th>
              <th className="px-2 sm:px-4 py-3 sm:py-4 font-semibold">Tài khoản</th>
              <th className="px-2 sm:px-4 py-3 sm:py-4 font-semibold">Tháng này</th>
              <th className="px-2 sm:px-4 py-3 sm:py-4 font-semibold">Lần cuối</th>
              <th className="px-2 sm:px-4 py-3 sm:py-4 font-semibold">Đã trả</th>
              <th className="px-2 sm:px-4 py-3 sm:py-4 font-semibold">Còn nợ</th>
              <th className="px-2 sm:px-4 py-3 sm:py-4 font-semibold text-center">T/Thái</th>
              <th className="px-3 sm:px-6 py-3 sm:py-4 font-semibold text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-16">
                  <div className="flex flex-col items-center justify-center text-indigo-300/40">
                    <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mb-3" />
                    <span className="text-sm font-medium tracking-wide">Đang đồng bộ dữ liệu...</span>
                  </div>
                </td>
              </tr>
            ) : supplies.length === 0 ? (
                <tr>
                    <td colSpan={8} className="text-center py-16 text-slate-500 text-sm font-medium tracking-wide">
                        Chưa có nhà cung cấp nào được lưu
                    </td>
                </tr>
            ) : (
              paginatedSupplies.map((supply) => (
                <SupplyRow
                  key={supply.id}
                  supply={supply}
                  isExpanded={expandedId === supply.id}
                  onToggle={onToggle}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onView={onView}
                  onToggleStatus={onToggleStatus}
                />
              ))
            )}
          </tbody>
        </table>
      </ResponsiveTable>

      {total > limit && (
        <div className="px-6 py-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-indigo-200/60 bg-indigo-950/20">
          <span className="font-medium tracking-wide">
            Hiển thị {(page - 1) * limit + 1}–{Math.min(page * limit, total)} trên tổng số <span className="text-white font-bold">{total}</span> nhà cung cấp
          </span>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                disabled={loading}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 ${
                  p === page
                    ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold shadow-[0_0_15px_rgba(99,102,241,0.5)] border border-indigo-400/30"
                    : "bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-200 text-white/60 border border-white/5 hover:border-indigo-500/30 active:scale-95"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const SupplyRow = ({
  supply,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onView,
  onToggleStatus,
}: {
  supply: Supply;
  isExpanded: boolean;
  onToggle: (id: number) => void;
  onEdit: (supply: Supply) => void;
  onDelete: (supply: Supply) => void;
  onView: (supply: Supply) => void;
  onToggleStatus: (supply: Supply) => void;
}) => {
  const netUnpaid = Number(supply.totalUnpaidImport ?? 0);
  return (
    <>
      <tr
        className={`group transition-all duration-300 cursor-pointer hover:bg-indigo-900/10 ${isExpanded ? "bg-indigo-900/20" : "bg-transparent"}`}
        onClick={() => onToggle(supply.id)}
      >
        <td className="px-3 sm:px-6 py-3.5 max-w-[130px] sm:max-w-[180px] lg:max-w-[240px]">
          <div>
            <div className="font-semibold text-white/95 text-xs sm:text-sm tracking-wide group-hover:text-indigo-300 transition-colors truncate" title={supply.sourceName || "Không Tên"}>
              {supply.sourceName || "Không Tên"}
            </div>
            <div className="text-[10px] sm:text-[11px] text-white/40 font-medium mt-0.5 truncate">Tổng đơn: {supply.totalOrders}</div>
          </div>
        </td>
        <td className="px-2 sm:px-4 py-3.5 max-w-[110px] sm:max-w-[150px]">
          <div className="tracking-wide text-xs sm:text-sm text-white/70 font-medium truncate" title={supply.numberBank || "—"}>
            {supply.numberBank || "—"}
          </div>
          <div className="text-[10px] sm:text-[11px] text-white/40 mt-0.5 truncate" title={supply.bankName || "Chưa cập nhật"}>
            {supply.bankName || "Chưa cập nhật"}
          </div>
        </td>
        <td className="px-2 sm:px-4 py-3.5 text-xs sm:text-sm font-medium whitespace-nowrap">
          <div className="text-white/80">{supply.monthlyOrders} Đơn</div>
          <div className="text-[10px] sm:text-[11px] text-emerald-400/80 mt-0.5">{formatMoney(supply.monthlyImportValue)}</div>
        </td>
        <td className="px-2 sm:px-4 py-3.5 text-white/50 text-xs sm:text-sm font-medium whitespace-nowrap">{formatDate(supply.lastOrderDate)}</td>
        <td className="px-2 sm:px-4 py-3.5 text-white/70 text-xs sm:text-sm font-medium whitespace-nowrap">{formatMoney(supply.totalPaidImport)}</td>
        <td className="px-2 sm:px-4 py-3.5 text-xs sm:text-sm whitespace-nowrap">
          {netUnpaid === 0 ? (
            <span className="text-white/30 font-medium">—</span>
          ) : (
            <span
              className={`inline-flex px-1.5 sm:px-2 py-0.5 rounded-md font-bold tracking-wide text-[11px] sm:text-xs ${
                netUnpaid > 0 ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.1)]" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              }`}
            >
              {formatMoney(Math.abs(netUnpaid))}
            </span>
          )}
        </td>
        <td className="px-2 sm:px-4 py-3.5 text-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStatus(supply);
            }}
            className={`w-7 sm:w-8 h-7 sm:h-8 mx-auto rounded-xl flex items-center justify-center transition-all duration-300 active:scale-95 ${
              supply.isActive 
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
                : "bg-white/5 text-white/30 border border-white/10 hover:bg-white/10 hover:text-white/60"
            }`}
          >
            <PowerIcon className="h-3.5 sm:h-4 w-3.5 sm:w-4 stroke-[2.5]" />
          </button>
        </td>
        <td className="px-3 sm:px-6 py-3.5 whitespace-nowrap text-right">
          <div className="flex justify-end gap-1 sm:gap-1.5 opacity-75 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView(supply);
              }}
              className="p-1.5 sm:p-2 rounded-xl bg-white/5 text-indigo-300 border border-transparent hover:border-indigo-500/30 hover:bg-indigo-500/15 hover:shadow-[0_0_10px_rgba(99,102,241,0.2)] transition-all active:scale-90"
              title="Chi tiết"
            >
              <EyeIcon className="h-3.5 sm:h-4 w-3.5 sm:w-4 stroke-2" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(supply);
              }}
              className="p-1.5 sm:p-2 rounded-xl bg-white/5 text-emerald-300 border border-transparent hover:border-emerald-500/30 hover:bg-emerald-500/15 hover:shadow-[0_0_10px_rgba(16,185,129,0.2)] transition-all active:scale-90"
              title="Chỉnh sửa"
            >
              <PencilSquareIcon className="h-3.5 sm:h-4 w-3.5 sm:w-4 stroke-2" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(supply);
              }}
              className="p-1.5 sm:p-2 rounded-xl bg-white/5 text-rose-300 border border-transparent hover:border-rose-500/30 hover:bg-rose-500/15 hover:shadow-[0_0_10px_rgba(244,63,94,0.2)] transition-all active:scale-90"
              title="Xóa"
            >
              <TrashIcon className="h-3.5 sm:h-4 w-3.5 sm:w-4 stroke-2" />
            </button>
          </div>
        </td>
      </tr>

      {isExpanded && (
        <tr className="bg-indigo-950/10">
          <td colSpan={8} className="px-4 pb-6 pt-2">
            <div className="rounded-2xl border border-indigo-500/20 bg-slate-950/60 shadow-[inset_0_2px_20px_rgba(0,0,0,0.2)] overflow-hidden">
              <PaymentHistoryTable supplyId={supply.id} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default SupplyList;
