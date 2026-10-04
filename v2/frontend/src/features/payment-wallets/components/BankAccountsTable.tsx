import React from "react";
import { Star, ArrowUpRight, Edit2, Trash2, Loader2 } from "lucide-react";
import { BankAccountItem } from "../types";

interface BankAccountsTableProps {
  loading: boolean;
  bankAccounts: BankAccountItem[];
  onSetDefault: (id: number) => void;
  onOpenWithdraw: (item: BankAccountItem) => void;
  onOpenEdit: (item: BankAccountItem) => void;
  onOpenDelete: (item: BankAccountItem) => void;
}

const formatVND = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount || 0);

export const BankAccountsTable: React.FC<BankAccountsTableProps> = ({
  loading,
  bankAccounts,
  onSetDefault,
  onOpenWithdraw,
  onOpenEdit,
  onOpenDelete,
}) => {
  return (
    <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 backdrop-blur-xl shadow-xl overflow-hidden">
      <div className="w-full">
        {/* Desktop Bank Table */}
        <div className="hidden sm:block overflow-x-auto custom-scrollbar flex-1 w-full">
          <table className="w-full text-left border-collapse text-xs min-w-[850px]">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none whitespace-nowrap">
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th className="py-3.5 px-4">STK / Chủ Tài Khoản</th>
                <th className="py-3.5 px-4">Ngân Hàng</th>
                <th className="py-3.5 px-4 text-right">Tổng Tiền CK</th>
                <th className="py-3.5 px-4 text-right">Đã Rút</th>
                <th className="py-3.5 px-4 text-right">Số Dư Còn Lại</th>
                <th className="py-3.5 px-4 text-center">Trạng Thái</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-400 mx-auto mb-2" />
                    <span>Đang tải dữ liệu từ cơ sở dữ liệu...</span>
                  </td>
                </tr>
              ) : bankAccounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Chưa có tài khoản ngân hàng nào. Bấm nút "Thêm STK Mới" để bắt đầu.
                  </td>
                </tr>
              ) : (
                bankAccounts.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 text-center text-slate-500 font-mono">
                      {index + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-cyan-300 text-sm">{item.accountNumber}</div>
                      <div className="text-slate-200 font-semibold mt-0.5">{item.accountHolder}</div>
                      {item.label && <div className="text-[11px] text-cyan-400/70 mt-0.5">{item.label}</div>}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <div className="font-bold text-slate-200">{item.bankDisplayName || item.bankShortCode || "—"}</div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        {item.bankShortCode ? `${item.bankShortCode} · ` : ""}BIN: {item.bankBin || "—"}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-300 whitespace-nowrap">
                      {formatVND(item.totalReceived)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-400/90 whitespace-nowrap">
                      {formatVND(item.totalWithdrawn)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400 text-sm whitespace-nowrap">
                      {formatVND(item.balanceRemaining)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex flex-row items-center justify-center gap-1.5 whitespace-nowrap">
                        {item.isDefault && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                            ★ Mặc định
                          </span>
                        )}
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${item.isActive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-slate-800 text-slate-500 border border-slate-700"}`}>
                          {item.isActive ? "Đang bật" : "Tắt"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!item.isDefault && (
                          <button
                            onClick={() => onSetDefault(item.id)}
                            title="Đặt mặc định"
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-300 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onOpenWithdraw(item)}
                          title="Rút tiền"
                          className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" /> Rút Tiền
                        </button>
                        <button
                          onClick={() => onOpenEdit(item)}
                          title="Sửa"
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onOpenDelete(item)}
                          title="Xóa"
                          className="p-1.5 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Bank Card View */}
        <div className="block sm:hidden divide-y divide-slate-800/80 p-3 space-y-3">
          {bankAccounts.map((item) => (
            <div key={item.id} className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3 shadow-md">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                <span className="font-bold text-cyan-400 font-mono text-sm">{item.accountNumber}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.isActive ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/15 text-rose-400 border border-rose-500/30"}`}>
                  {item.isActive ? "Đang chạy" : "Tắt"}
                </span>
              </div>
              <div className="space-y-1 text-xs text-slate-300">
                <div className="flex justify-between"><span>Chủ tài khoản:</span><span className="font-semibold">{item.accountHolder}</span></div>
                <div className="flex justify-between"><span>Ngân hàng:</span><span>{item.bankShortCode || item.bankDisplayName || "—"}</span></div>
                <div className="flex justify-between"><span>Số dư khả dụng:</span><span className="font-bold text-emerald-400 font-mono">{formatVND(item.balanceRemaining)}</span></div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
                <button onClick={() => onOpenWithdraw(item)} className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-semibold cursor-pointer">Rút Tiền</button>
                <button onClick={() => onOpenEdit(item)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs cursor-pointer">Sửa</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
