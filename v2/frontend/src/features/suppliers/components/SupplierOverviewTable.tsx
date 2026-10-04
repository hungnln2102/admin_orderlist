import React from "react";
import {
  ChevronDown,
  ChevronRight,
  Power,
  Eye,
  Pencil,
  Trash2,
  FileText,
  Loader2,
  ChevronLeft,
} from "lucide-react";
import { SupplierItem, SupplierCostLogItem } from "../types";

interface SupplierOverviewTableProps {
  suppliers: SupplierItem[];
  loadingOverview: boolean;
  expandedSupplierIds: number[];
  toggleExpandSupplier: (id: number) => void;
  supplierLogsMap: Record<number, { logs: SupplierCostLogItem[]; loading: boolean }>;
  supplierPageMap: Record<number, number>;
  setSupplierPageMap: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  supplierPageSizeMap: Record<number, number>;
  setSupplierPageSizeMap: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  formatCurrency: (val: number) => string;
  formatDate: (dateStr?: string | null) => string;
  onToggleStatus: (supplier: SupplierItem) => void;
  onSelectDetail: (id: number) => void;
  onOpenEditModal: (supplier: SupplierItem) => void;
  onConfirmDelete: (supplier: SupplierItem) => void;
}

export const SupplierOverviewTable: React.FC<SupplierOverviewTableProps> = ({
  suppliers,
  loadingOverview,
  expandedSupplierIds,
  toggleExpandSupplier,
  supplierLogsMap,
  supplierPageMap,
  setSupplierPageMap,
  supplierPageSizeMap,
  setSupplierPageSizeMap,
  formatCurrency,
  formatDate,
  onToggleStatus,
  onSelectDetail,
  onOpenEditModal,
  onConfirmDelete,
}) => {
  return (
    <div className="w-full">
      {/* Mobile Card List View */}
      <div className="block sm:hidden divide-y divide-slate-800/80 p-3 space-y-3">
        {suppliers.map((s) => (
          <div key={s.id} className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
              <span className="font-bold text-white text-sm">{s.supplier_name}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  s.active_supply
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                }`}
              >
                {s.active_supply ? "Đang cấp" : "Tạm dừng"}
              </span>
            </div>
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Tài khoản Bank:</span>
                <span className="font-mono text-slate-200">
                  {s.number_bank || "—"} ({s.account_holder || "—"})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tổng đơn nhập:</span>
                <span className="font-semibold">{s.total_orders} đơn</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Còn nợ NCC:</span>
                <span className="font-mono font-bold text-amber-400">
                  {formatCurrency(s.total_debt || 0)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
              <button
                onClick={() => onSelectDetail(s.id)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-cyan-300 font-medium hover:bg-slate-700 transition-all"
              >
                Chi tiết
              </button>
              <button
                onClick={() => onOpenEditModal(s)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 font-medium hover:bg-slate-700 transition-all"
              >
                Sửa
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Master-Detail Table */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-800/60">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10.5px] border-b border-slate-800/80">
            <tr>
              <th className="py-3.5 px-3 w-8 text-center"></th>
              <th className="py-3.5 px-4">Nhà Cung Cấp</th>
              <th className="py-3.5 px-4">Tài Khoản</th>
              <th className="py-3.5 px-4 text-center">Tháng Này</th>
              <th className="py-3.5 px-3 text-center">Lần Cuối</th>
              <th className="py-3.5 px-3 text-right">Đã Trả</th>
              <th className="py-3.5 px-3 text-right">Còn Nợ</th>
              <th className="py-3.5 px-3 text-center">T/Thái</th>
              <th className="py-3.5 px-4 text-center">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 text-slate-300 font-medium">
            {loadingOverview ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 text-cyan-400 animate-spin inline mr-2" />
                  Đang tải dữ liệu Nhà cung cấp...
                </td>
              </tr>
            ) : suppliers.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500 italic">
                  Không tìm thấy nhà cung cấp nào
                </td>
              </tr>
            ) : (
              suppliers.map((s) => {
                const isExpanded = expandedSupplierIds.includes(s.id);
                const logsInfo = supplierLogsMap[s.id];

                return (
                  <React.Fragment key={s.id}>
                    {/* Supplier Master Row */}
                    <tr
                      onClick={() => toggleExpandSupplier(s.id)}
                      className={`hover:bg-slate-900/60 transition-colors group cursor-pointer ${
                        isExpanded ? "bg-slate-900/40" : ""
                      }`}
                    >
                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpandSupplier(s.id);
                          }}
                          className={`p-1 rounded-md transition-all ${
                            isExpanded
                              ? "bg-indigo-500/20 text-indigo-400"
                              : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                          }`}
                          title={isExpanded ? "Thu gọn danh sách đơn" : "Mở rộng danh sách đơn"}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      <td className="py-3.5 px-4">
                        <div>
                          <div className="font-bold text-slate-100 group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                            <span>{s.supplier_name}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Tổng đơn: {s.total_orders}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div>
                          <div className="font-semibold text-slate-200">
                            {s.number_bank || "Chưa cập nhật"}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {s.account_holder || "Chưa cập nhật"}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div>
                          <div className="font-bold text-slate-200">{s.current_month_orders} Đơn</div>
                          <div className="text-[11px] font-semibold text-emerald-400 mt-0.5">
                            {formatCurrency(s.current_month_cost)}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-center text-slate-300">
                        {formatDate(s.last_order_date)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-bold text-emerald-400">
                        {formatCurrency(s.total_paid)}
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        {s.total_debt > 0 ? (
                          <span className="inline-block px-2.5 py-1 rounded-md text-xs font-black bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            {formatCurrency(s.total_debt)}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-bold">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleStatus(s);
                          }}
                          className={`p-1.5 rounded-lg border transition-all ${
                            s.active_supply
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                              : "bg-slate-800/60 border-slate-700/60 text-slate-500 hover:bg-slate-800"
                          }`}
                          title={
                            s.active_supply
                              ? "Đang hoạt động (Bấm để ngưng)"
                              : "Đã ngưng (Bấm để kích hoạt)"
                          }
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectDetail(s.id);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-all"
                            title="Xem chi tiết V1"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenEditModal(s);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-all"
                            title="Chỉnh sửa thông tin"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onConfirmDelete(s);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-all"
                            title="Xóa nhà cung cấp"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* EXPANDED ACCORDION ROW: COST LOGS */}
                    {isExpanded && (() => {
                      const currentPage = supplierPageMap[s.id] || 1;
                      const pageSize = supplierPageSizeMap[s.id] || 10;
                      const totalLogs = logsInfo?.logs ? logsInfo.logs.length : 0;
                      const totalPages = Math.ceil(totalLogs / pageSize) || 1;
                      const startIndex = (currentPage - 1) * pageSize;
                      const paginatedLogs = logsInfo?.logs
                        ? logsInfo.logs.slice(startIndex, startIndex + pageSize)
                        : [];

                      return (
                        <tr className="bg-slate-950/80">
                          <td colSpan={9} className="p-4 border-l-4 border-indigo-500">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-xs">
                                <div className="font-bold text-slate-200 flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-indigo-400" />
                                  <span>LỊCH SỬ ĐƠN HÀNG & CHI PHÍ: {s.supplier_name}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                    <span>Hiển thị:</span>
                                    <select
                                      value={pageSize}
                                      onChange={(e) => {
                                        const newSize = Number(e.target.value);
                                        setSupplierPageSizeMap((prev) => ({ ...prev, [s.id]: newSize }));
                                        setSupplierPageMap((prev) => ({ ...prev, [s.id]: 1 }));
                                      }}
                                      className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500"
                                    >
                                      <option value={5}>5 đơn / trang</option>
                                      <option value={10}>10 đơn / trang</option>
                                      <option value={20}>20 đơn / trang</option>
                                    </select>
                                  </div>
                                  <span className="text-[11px] text-slate-400 font-semibold">
                                    Tổng {totalLogs} bản ghi
                                  </span>
                                </div>
                              </div>

                              {logsInfo?.loading ? (
                                <div className="py-6 text-center text-slate-400 text-xs">
                                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin inline mr-2" />
                                  Đang tải lịch sử đơn hàng của nhà cung cấp...
                                </div>
                              ) : !logsInfo?.logs || logsInfo.logs.length === 0 ? (
                                <div className="py-6 text-center text-slate-500 italic text-xs">
                                  Chưa có lịch sử đơn hàng phát sinh cho nhà cung cấp này
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="overflow-x-auto rounded-lg border border-slate-800/80 bg-[#080b13]">
                                    <table className="w-full text-left text-xs">
                                      <thead className="bg-slate-900/90 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                                        <tr>
                                          <th className="py-2.5 px-3 text-center">STT</th>
                                          <th className="py-2.5 px-4">MÃ ĐƠN HÀNG</th>
                                          <th className="py-2.5 px-4 text-right">TIỀN NHẬP</th>
                                          <th className="py-2.5 px-4 text-right">TIỀN HOÀN</th>
                                          <th className="py-2.5 px-4 text-center">TRẠNG THÁI TT</th>
                                          <th className="py-2.5 px-4 text-center">NGÀY GHI NHẬN</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-800/40 text-slate-300 font-medium">
                                        {paginatedLogs.map((log, idx) => (
                                          <tr
                                            key={log.id}
                                            className="hover:bg-slate-900/40 transition-colors"
                                          >
                                            <td className="py-2.5 px-3 text-center text-slate-500 text-[11px]">
                                              {startIndex + idx + 1}
                                            </td>
                                            <td className="py-2.5 px-4 font-mono font-bold text-cyan-400">
                                              {log.id_order}
                                            </td>
                                            <td className="py-2.5 px-4 text-right font-bold text-slate-200">
                                              {formatCurrency(log.import_cost)}
                                            </td>
                                            <td className="py-2.5 px-4 text-right font-semibold text-amber-400">
                                              {formatCurrency(log.refund_amount)}
                                            </td>
                                            <td className="py-2.5 px-4 text-center">
                                              {log.ncc_payment_status === "Đã Thanh Toán" ? (
                                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                                                  Đã Thanh Toán
                                                </span>
                                              ) : (
                                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20">
                                                  Chưa Thanh Toán
                                                </span>
                                              )}
                                            </td>
                                            <td className="py-2.5 px-4 text-center text-slate-400 text-[11px]">
                                              {formatDate(log.logged_at)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* Pagination Controls Footer for Expanded Log Table */}
                                  {totalPages > 1 && (
                                    <div className="flex items-center justify-between px-2 pt-2 text-[11px] text-slate-400">
                                      <div>
                                        Hiển thị <strong>{startIndex + 1} - {Math.min(startIndex + pageSize, totalLogs)}</strong> trên {totalLogs} đơn
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() =>
                                            setSupplierPageMap((prev) => ({
                                              ...prev,
                                              [s.id]: Math.max(1, currentPage - 1),
                                            }))
                                          }
                                          disabled={currentPage <= 1}
                                          className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 font-semibold"
                                        >
                                          <ChevronLeft className="w-3.5 h-3.5" />
                                          <span>Trước</span>
                                        </button>

                                        <span className="text-slate-300 font-bold px-1">
                                          {currentPage} / {totalPages}
                                        </span>

                                        <button
                                          onClick={() =>
                                            setSupplierPageMap((prev) => ({
                                              ...prev,
                                              [s.id]: Math.min(totalPages, currentPage + 1),
                                            }))
                                          }
                                          disabled={currentPage >= totalPages}
                                          className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 font-semibold"
                                        >
                                          <span>Sau</span>
                                          <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })()}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
