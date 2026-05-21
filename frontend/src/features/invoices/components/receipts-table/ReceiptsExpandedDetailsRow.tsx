import type React from "react";

import * as Helpers from "@/shared/utils";

import {
  extractTransactionCodeFromNote,
  type PaymentReceipt,
  resolveSender,
  type ShopBankDisplay,
} from "../../helpers";

type ReceiptsExpandedDetailsRowProps = {
  receipt: PaymentReceipt;
  expandedColSpan: number;
  expandedGridClass: string;
  showOrderCode: boolean;
  shopBank: ShopBankDisplay;
};

const ReceiptsExpandedDetailsRow: React.FC<ReceiptsExpandedDetailsRowProps> = ({
  receipt,
  expandedColSpan,
  expandedGridClass,
  showOrderCode,
  shopBank,
}) => (
  <tr className="animate-in fade-in slide-in-from-top-2 duration-300 relative z-0">
    <td colSpan={expandedColSpan} className="px-6 pb-8 pt-2">
      <div className="rounded-[32px] glass-panel-light p-6 shadow-2xl border border-indigo-500/20">
        <div className={expandedGridClass}>
          {showOrderCode ? (
            <div className="space-y-1">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] leading-none">
                Mã đơn hàng
              </p>
              <p className="text-sm font-black text-white">{receipt.orderCode || "—"}</p>
            </div>
          ) : null}
          <div className="space-y-1">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] leading-none">
              Người gửi
            </p>
            <p className="text-sm font-bold text-white">{resolveSender(receipt) || "—"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] leading-none">
              Người nhận
            </p>
            <p className="text-sm font-medium text-indigo-200/80">
              {shopBank.accountNumber || "—"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] leading-none">
              Mã giao dịch
            </p>
            <p className="text-sm font-bold text-indigo-100/90">
              {extractTransactionCodeFromNote(receipt.note) || "—"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] leading-none">
              Ngày thanh toán
            </p>
            <p className="text-sm font-bold text-indigo-100/90">
              {receipt.paidAt ? Helpers.formatDateToDMY(receipt.paidAt) : "—"}
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
);

export default ReceiptsExpandedDetailsRow;
