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
    <div className="rounded-[18px] bg-gradient-to-br from-indigo-900/70 via-slate-900/70 to-slate-950/70 border border-white/12 shadow-[0_20px_65px_-30px_rgba(0,0,0,0.85)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10 text-white">
          <thead className="bg-slate-900/90">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                Mã Đơn
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                Người Gửi
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                Người Nhận
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                Số Tiền
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                Nội Dung Chuyển Khoản
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                Ngày Thanh Toán
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {receipts.map((receipt, index) => {
              const isExpanded = expandedReceiptId === receipt.id;
              return (
                <React.Fragment key={receipt.id}>
                  <tr
                    className={`transition ${
                      index % 2 === 0
                        ? "bg-slate-900/55"
                        : "bg-indigo-950/40"
                    } hover:bg-indigo-600/25 ${
                      isExpanded ? "ring-2 ring-indigo-400/60" : ""
                    } cursor-pointer`}
                    onClick={() => onToggle(receipt.id)}
                    onDoubleClick={() =>
                      onSelectReceipt ? onSelectReceipt(receipt) : undefined
                    }
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-semibold">
                      {receipt.orderCode || "--"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">
                        {resolveSender(receipt) || "--"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">
                        {receipt.receiver || QR_BANK_INFO.accountNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-white">
                      {formatCurrencyVnd(receipt.amount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-white/90 max-w-xs">
                      <span className="block truncate text-white/90">
                        {receipt.note || "--"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">
                      {receipt.paidAt
                        ? Helpers.formatDateToDMY(receipt.paidAt)
                        : "--"}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-indigo-900/35">
                      <td colSpan={6} className="px-6 pb-5 pt-2">
                        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-white/90 space-y-2">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <p className="text-xs text-white/60">Mã đơn</p>
                              <p className="font-semibold text-white">
                                {receipt.orderCode || "--"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-white/60">Người gửi</p>
                              <p className="font-semibold text-white">
                                {resolveSender(receipt) || "--"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-white/60">Người nhận</p>
                              <p className="font-semibold text-white">
                                {QR_BANK_INFO.accountNumber}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-white/60">Số tiền</p>
                              <p className="font-semibold text-emerald-200">
                                {formatCurrencyVnd(receipt.amount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-white/60">
                                Ngày thanh toán
                              </p>
                              <p className="font-semibold text-white">
                                {receipt.paidAt
                                  ? Helpers.formatDateToDMY(receipt.paidAt)
                                  : "--"}
                              </p>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-white/60">
                              Nội dung chuyển khoản
                            </p>
                            <p className="mt-1 rounded-xl bg-white/5 px-3 py-2 text-white">
                              {receipt.note || "Không có ghi chú"}
                            </p>
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
