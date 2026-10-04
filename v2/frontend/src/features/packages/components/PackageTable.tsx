import React from "react";
import {
  Package,
  ChevronDown,
  ChevronRight,
  Edit2,
  Eye,
  Trash2,
  Zap,
} from "lucide-react";
import { PackageItem } from "../types";

interface PackageTableProps {
  loading: boolean;
  filteredItems: PackageItem[];
  selectedCategory: string;
  expandedRowId: number | null;
  onToggleExpandRow: (id: number) => void;
  onEditItem: (item: PackageItem) => void;
  onViewItem: (item: PackageItem) => void;
  onDeleteItem: (id: number) => void;
}

const fmt = (v: number) => new Intl.NumberFormat("vi-VN").format(v);

export const PackageTable: React.FC<PackageTableProps> = ({
  loading,
  filteredItems,
  selectedCategory,
  expandedRowId,
  onToggleExpandRow,
  onEditItem,
  onViewItem,
  onDeleteItem,
}) => {
  return (
    <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 backdrop-blur-xl shadow-xl overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden sm:block overflow-x-auto custom-scrollbar">
        <table className="w-full min-w-[850px] border-collapse text-left">
          <thead>
            <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
              <th className="py-3.5 px-4 w-36">TÊN GÓI</th>
              <th className="py-3.5 px-4 min-w-[200px]">THÔNG TIN GÓI</th>
              <th className="py-3.5 px-4 w-44">SỐ LƯỢNG</th>
              <th className="py-3.5 px-4 w-28">NCC</th>
              <th className="py-3.5 px-4 w-32 text-right">GIÁ NHẬP</th>
              <th className="py-3.5 px-4 w-36 text-center">NGÀY HẾT HẠN</th>
              <th className="py-3.5 px-4 min-w-[120px]">GHI CHÚ</th>
              <th className="py-3.5 px-4 w-28 text-right">THAO TÁC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-7 h-7 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    <span>Đang tải danh sách kho gói...</span>
                  </div>
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Package className="w-9 h-9 text-slate-600 stroke-[1.5]" />
                    <span className="text-sm font-medium">Không tìm thấy gói nào thuộc loại "{selectedCategory}"</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const availSlots = Math.max(0, item.totalSlots - item.usedSlots);
                const percentUsed = Math.min(100, Math.round((item.usedSlots / item.totalSlots) * 100));
                const isExpanded = expandedRowId === item.id;

                return (
                  <React.Fragment key={item.id}>
                    <tr
                      onClick={() => onToggleExpandRow(item.id)}
                      className={`hover:bg-slate-800/60 transition-colors group cursor-pointer select-none ${
                        isExpanded ? "bg-slate-800/50" : ""
                      }`}
                    >
                      {/* Tên gói */}
                      <td className="py-3.5 px-4 font-bold text-white group-hover:text-cyan-300 transition-colors">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-cyan-400 shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 shrink-0" />
                          )}
                          <span>{item.name}</span>
                        </div>
                      </td>

                      {/* Thông tin gói / Email */}
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {item.accountInfo}
                      </td>

                      {/* Số lượng + Slot Progress bar */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-white font-mono">
                              {item.usedSlots} / {item.totalSlots} Vị trí
                            </span>
                            <span className={`text-[10px] uppercase font-bold ${availSlots === 0 ? "text-rose-400" : "text-emerald-400"}`}>
                              TRỐNG: {availSlots}
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                percentUsed >= 100
                                  ? "bg-rose-500"
                                  : percentUsed >= 50
                                  ? "bg-amber-400"
                                  : "bg-emerald-400"
                              }`}
                              style={{ width: `${percentUsed}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* NCC */}
                      <td className="py-3.5 px-4 font-semibold text-purple-300">
                        {item.supplier}
                      </td>

                      {/* Giá nhập */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-200">
                        {fmt(item.costPrice)} <span className="text-[10px] font-normal text-slate-500">VND</span>
                      </td>

                      {/* Ngày hết hạn */}
                      <td className="py-3.5 px-4 text-center font-mono text-slate-300">
                        {item.expiredAt}
                      </td>

                      {/* Ghi chú */}
                      <td className="py-3.5 px-4 text-slate-400 truncate max-w-[150px]">
                        {item.note || "—"}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onEditItem(item)}
                            className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Sửa thông tin gói"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onViewItem(item)}
                            className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteItem(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Xóa gói"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Slot Grid */}
                    {isExpanded && (
                      <tr className="bg-slate-950/90 border-b border-cyan-500/20">
                        <td colSpan={8} className="p-4 sm:p-6">
                          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl backdrop-blur-xl">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                              <div>
                                <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                                  <Zap className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                                  Chi Tiết Các Vị Trí ({item.name})
                                </h4>
                                <p className="text-xs font-mono text-slate-400 mt-0.5">{item.accountInfo}</p>
                              </div>
                              <div className="px-3.5 py-1.5 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-extrabold tracking-wider uppercase text-cyan-300">
                                {item.usedSlots} DÙNG / {availSlots} TRỐNG
                              </div>
                            </div>

                            {/* Slot Grid Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                              {Array.from({ length: item.totalSlots }, (_, idx) => {
                                const slotNum = idx + 1;
                                const assignment = item.slotAssignments?.[idx];
                                const isUsed = Boolean(assignment) || slotNum <= item.usedSlots;

                                return (
                                  <div
                                    key={slotNum}
                                    className={`p-3.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all duration-300 hover:scale-[1.03] ${
                                      isUsed
                                        ? "bg-amber-500/10 border-amber-500/20 text-amber-200 shadow-lg shadow-amber-950/20"
                                        : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300 shadow-lg shadow-emerald-950/20"
                                    }`}
                                  >
                                    <div className={`p-2 rounded-lg mb-1.5 ${isUsed ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                                      <Zap className="w-4 h-4" />
                                    </div>

                                    <div className="text-xs font-bold text-white truncate max-w-full" title={assignment?.customerContact || assignment?.customerName || `Slot ${slotNum}`}>
                                      {assignment?.customerContact || assignment?.customerName || `Slot ${slotNum}`}
                                    </div>

                                    {assignment?.orderCode && (
                                      <div className="text-[10px] font-bold text-amber-400/90 tracking-wide mt-0.5 truncate max-w-full">
                                        ĐƠN: {assignment.orderCode}
                                      </div>
                                    )}

                                    {assignment?.customerName && (
                                      <div className="text-[10px] text-slate-400 truncate max-w-full">
                                        {assignment.customerName}
                                      </div>
                                    )}

                                    {!assignment && isUsed && (
                                      <div className="text-[10px] font-bold text-amber-400/80 uppercase tracking-widest mt-1">
                                        ĐÃ DÙNG
                                      </div>
                                    )}

                                    {!isUsed && (
                                      <div className="text-[10px] font-bold text-emerald-400/90 uppercase tracking-widest mt-1">
                                        AVAILABLE
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="block sm:hidden divide-y divide-slate-800/80 p-3 space-y-3">
        {loading ? (
          <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <div className="w-7 h-7 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span>Đang tải danh sách kho gói...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <Package className="w-9 h-9 text-slate-600 stroke-[1.5]" />
            <span className="text-sm font-medium">Không tìm thấy gói nào thuộc loại "{selectedCategory}"</span>
          </div>
        ) : (
          filteredItems.map((item) => {
            const availSlots = Math.max(0, item.totalSlots - item.usedSlots);
            const percentUsed = Math.min(100, Math.round((item.usedSlots / item.totalSlots) * 100));

            return (
              <div key={item.id} className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3 shadow-md mt-3 first:mt-0 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-base">{item.name}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onEditItem(item)}
                      className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer bg-slate-800/50"
                      title="Sửa thông tin gói"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onViewItem(item)}
                      className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer bg-slate-800/50"
                      title="Xem chi tiết"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                
                <div className="font-mono text-slate-300 text-xs">
                  {item.accountInfo}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-white font-mono">
                      {item.usedSlots} / {item.totalSlots} Vị trí
                    </span>
                    <span className={`text-[10px] uppercase font-bold ${availSlots === 0 ? "text-rose-400" : "text-emerald-400"}`}>
                      TRỐNG: {availSlots}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        percentUsed >= 100
                          ? "bg-rose-500"
                          : percentUsed >= 50
                          ? "bg-amber-400"
                          : "bg-emerald-400"
                      }`}
                      style={{ width: `${percentUsed}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-1">
                    <span className="text-slate-500 block">NCC</span>
                    <span className="text-purple-300 font-semibold block">{item.supplier}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-500 block">Ngày hết hạn</span>
                    <span className="text-slate-300 font-mono block">{item.expiredAt}</span>
                  </div>
                </div>
                
                <div className="space-y-1 mt-2">
                   <span className="text-slate-500 block text-xs">Giá nhập</span>
                   <span className="text-slate-200 font-mono font-bold text-sm block">{fmt(item.costPrice)} <span className="text-[10px] font-normal text-slate-500">VND</span></span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
