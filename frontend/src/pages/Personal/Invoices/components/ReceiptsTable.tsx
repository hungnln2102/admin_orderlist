import React from "react";
import * as Helpers from "../../../../lib/helpers";
import {
  PaymentReceipt,
  QR_BANK_INFO,
  formatCurrencyVnd,
  resolveSender,
} from "../helpers";

type ReceiptsTableProps = {
  receipts: PaymentReceipt[];
  expandedReceiptId: number | null;
  onToggle: (receiptId: number) => void;
  onSelectReceipt?: (receipt: PaymentReceipt) => void;
};

export const ReceiptsTable: React.FC<ReceiptsTableProps> = ({
  receipts,
  expandedReceiptId,
  onToggle,
  onSelectReceipt,
}) => {
  return (
    <div className="bg-transparent overflow-visible">
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-4 text-white">
          <thead>
            <tr className="[&>th]:px-5 [&>th]:pb-2 [&>th]:text-[11px] [&>th]:font-black [&>th]:uppercase [&>th]:tracking-[0.2em] [&>th]:text-indigo-300/70 [&>th]:text-left">
              <th className="w-[120px]">MÃ ĐƠN</th>
              <th className="w-[180px]">NGƯỜI GỬI</th>
              <th className="w-[180px]">NGƯỜI NHẬN</th>
              <th className="w-[140px]">SỐ TIỀN</th>
              <th>NỘI DUNG CHUYỂN KHOẢN</th>
              <th className="w-[150px] text-right pr-6">NGÀY THANH TOÁN</th>
            </tr>
          </thead>
          <tbody className="">
            {receipts.map((receipt) => {
              const isExpanded = expandedReceiptId === receipt.id;
              return (
                <React.Fragment key={receipt.id}>
                  <tr
                    className="group/row cursor-pointer transition-all duration-500 relative z-10"
                    onClick={() => onToggle(receipt.id)}
                    onDoubleClick={() =>
                      onSelectReceipt ? onSelectReceipt(receipt) : undefined
                    }
                  >
                    <td className="px-5 py-5 first:rounded-l-[24px] glass-panel border-y border-white/5 group-hover/row:border-indigo-500/30 group-hover/row:bg-indigo-500/5 transition-all duration-500">
                      <span className="text-sm font-bold text-white tracking-wider uppercase">
                        {receipt.orderCode || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-5 glass-panel border-y border-white/5 group-hover/row:border-indigo-500/30 group-hover/row:bg-indigo-500/5 transition-all duration-500">
                      <div className="text-sm font-bold text-white tracking-tight">
                        {resolveSender(receipt) || "—"}
                      </div>
                    </td>
                    <td className="px-5 py-5 glass-panel border-y border-white/5 group-hover/row:border-indigo-500/30 group-hover/row:bg-indigo-500/5 transition-all duration-500">
                      <div className="text-xs font-medium text-white/80">
                        {receipt.receiver || QR_BANK_INFO.accountNumber}
                      </div>
                    </td>
                    <td className="px-5 py-5 glass-panel border-y border-white/5 group-hover/row:border-indigo-500/30 group-hover/row:bg-indigo-500/5 transition-all duration-500">
                      <span className="text-sm font-bold text-emerald-400 tracking-tight">
                        {formatCurrencyVnd(receipt.amount)}
                      </span>
                    </td>
                    <td className="px-5 py-5 glass-panel border-y border-white/5 group-hover/row:border-indigo-500/30 group-hover/row:bg-indigo-500/5 transition-all duration-500 max-w-xs">
                      <span className="block truncate text-[13px] text-white/60 font-medium">
                        {receipt.note || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-5 last:rounded-r-[24px] glass-panel border-y border-white/5 group-hover/row:border-indigo-500/30 group-hover/row:bg-indigo-500/5 transition-all duration-500 text-right pr-6">
                      <span className="text-xs font-bold text-indigo-300/80 tracking-tighter">
                        {receipt.paidAt
                          ? Helpers.formatDateToDMY(receipt.paidAt)
                          : "—"}
                      </span>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="animate-in fade-in slide-in-from-top-2 duration-300 relative z-0">
                      <td colSpan={6} className="px-6 pb-8 pt-2">
                        <div className="rounded-[32px] glass-panel-light p-6 shadow-2xl border border-indigo-500/20">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] leading-none">Mã đơn hàng</p>
                              <p className="text-sm font-black text-white">
                                {receipt.orderCode || "—"}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] leading-none">Người gửi</p>
                              <p className="text-sm font-bold text-white">
                                {resolveSender(receipt) || "—"}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] leading-none">Người nhận</p>
                              <p className="text-sm font-medium text-indigo-200/80">
                                {QR_BANK_INFO.accountNumber}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] leading-none">Ngày thanh toán</p>
                              <p className="text-sm font-bold text-indigo-100/90">
                                {receipt.paidAt
                                  ? Helpers.formatDateToDMY(receipt.paidAt)
                                  : "—"}
                              </p>
                            </div>
                          </div>
                          
                          <div className="mt-6 pt-6 border-t border-white/5">
                            <div className="space-y-2">
                              <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] leading-none">
                                Nội dung chuyển khoản
                              </p>
                              <div className="relative overflow-hidden rounded-2xl bg-slate-950/40 p-4 border border-white/5">
                                <p className="text-[13px] font-medium text-indigo-50 leading-relaxed italic">
                                  "{receipt.note || "Không có nội dung ghi chú đi kèm."}"
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
