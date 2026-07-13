import type React from "react";

import { MatchableOrder, PaymentReceipt, type ShopBankDisplay } from "../../helpers";
import ReceiptsExpandedDetailsRow from "./ReceiptsExpandedDetailsRow";
import { buildReceiptRowView } from "./receiptRowView";

type ReceiptTableRowProps = {
  receipt: PaymentReceipt;
  orderOptions: MatchableOrder[];
  selectedValue: string;
  manualCode: string;
  rowError: string;
  isMatching: boolean;
  isManualInput: boolean;
  isEditingOrderCode: boolean;
  isExpanded: boolean;
  enableMatching: boolean;
  showOrderCode: boolean;
  enableOrderCodeEdit: boolean;
  editingOrderCode: string;
  expandedColSpan: number;
  expandedGridClass: string;
  shopBank: ShopBankDisplay;
  onToggle: (receiptId: number) => void;
  onSelectReceipt?: (receipt: PaymentReceipt) => void;
  onSelectMatch: (receipt: PaymentReceipt, value: string) => Promise<void>;
  onSubmitManualMatch: (receipt: PaymentReceipt) => void;
  onManualCodeChange: (nextCode: string) => void;
  onStartEditOrderCode: (receipt: PaymentReceipt) => void;
  onCancelEditOrderCode: () => void;
  onSaveEditedOrderCode: (receipt: PaymentReceipt) => Promise<void>;
  onEditingOrderCodeChange: (nextCode: string) => void;
};

const ReceiptTableRow: React.FC<ReceiptTableRowProps> = ({
  receipt,
  orderOptions,
  selectedValue,
  manualCode,
  rowError,
  isMatching,
  isManualInput,
  isEditingOrderCode,
  isExpanded,
  enableMatching,
  showOrderCode,
  enableOrderCodeEdit,
  editingOrderCode,
  expandedColSpan,
  expandedGridClass,
  shopBank,
  onToggle,
  onSelectReceipt,
  onSelectMatch,
  onSubmitManualMatch,
  onManualCodeChange,
  onStartEditOrderCode,
  onCancelEditOrderCode,
  onSaveEditedOrderCode,
  onEditingOrderCodeChange,
}) => {
  const rowView = buildReceiptRowView(receipt, shopBank);

  return (
    <>
      <tr
        className="group/row cursor-pointer transition-all duration-500 relative z-10"
        onClick={() => onToggle(receipt.id)}
        onDoubleClick={() => (onSelectReceipt ? onSelectReceipt(receipt) : undefined)}
      >
        {enableMatching ? (
          <td className="px-5 py-5 first:rounded-l-[24px] glass-panel border-y border-white/5 group-hover/row:border-indigo-500/30 group-hover/row:bg-indigo-500/5 transition-all duration-500">
            <div
              className="space-y-2"
              onClick={(event) => event.stopPropagation()}
              onDoubleClick={(event) => event.stopPropagation()}
            >
              <select
                value={selectedValue}
                onChange={(event) => void onSelectMatch(receipt, event.target.value)}
                disabled={isMatching}
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs font-semibold text-white outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-60"
              >
                <option value="">Chọn đơn cần ghép...</option>
                <option value="__manual__">Tự điền mã đơn hàng</option>
                {orderOptions.map((order) => (
                  <option key={order.orderCode} value={order.orderCode}>
                    {order.orderCode} - {order.status}
                  </option>
                ))}
              </select>
              {String(receipt.orderCode || "").trim() ? (
                <p className="text-[10px] text-white/55 font-medium leading-snug">
                  CK đã gắn mã parse{" "}
                  <span className="font-bold text-indigo-200/95">
                    {String(receipt.orderCode).trim().toUpperCase()}
                  </span>
                  . Ghép sang đơn khả dụng để đưa vào tab Biên nhận.
                </p>
              ) : null}
              {isManualInput && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(event) => onManualCodeChange(event.target.value)}
                    disabled={isMatching}
                    placeholder="Nhập mã đơn (VD: MAVC...)"
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs font-semibold text-white outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => void onSubmitManualMatch(receipt)}
                    disabled={isMatching}
                    className="shrink-0 rounded-xl border border-indigo-400/40 bg-indigo-500/20 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-indigo-100 disabled:opacity-60"
                  >
                    Ghép
                  </button>
                </div>
              )}
              {isMatching ? (
                <p className="text-[10px] font-semibold text-indigo-200/70">
                  Đang ghép biên lai...
                </p>
              ) : null}
              {rowError ? (
                <p className="text-[10px] font-semibold text-rose-300">{rowError}</p>
              ) : null}
            </div>
          </td>
        ) : null}
        {showOrderCode ? (
          <td
            className={`px-5 py-5 glass-panel border-y border-white/5 group-hover/row:border-indigo-500/30 group-hover/row:bg-indigo-500/5 transition-all duration-500 ${
              enableMatching ? "" : "first:rounded-l-[24px]"
            }`}
          >
            <div
              className="space-y-2"
              onClick={(event) => event.stopPropagation()}
              onDoubleClick={(event) => event.stopPropagation()}
            >
              {isEditingOrderCode ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editingOrderCode}
                    onChange={(event) => onEditingOrderCodeChange(event.target.value)}
                    disabled={isMatching}
                    placeholder="Nhập mã đơn..."
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs font-semibold text-white outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-60"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void onSaveEditedOrderCode(receipt)}
                      disabled={isMatching}
                      className="rounded-xl border border-emerald-300/40 bg-emerald-500/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-100 disabled:opacity-60"
                    >
                      Lưu
                    </button>
                    <button
                      type="button"
                      onClick={onCancelEditOrderCode}
                      disabled={isMatching}
                      className="rounded-xl border border-white/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/80 disabled:opacity-60"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white tracking-wider uppercase">
                    {receipt.orderCode || "—"}
                  </span>
                  {enableOrderCodeEdit ? (
                    <button
                      type="button"
                      onClick={() => onStartEditOrderCode(receipt)}
                      disabled={isMatching}
                      className="rounded-lg border border-indigo-400/40 bg-indigo-500/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-100 disabled:opacity-60"
                    >
                      Sửa
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </td>
        ) : null}
        <td className="px-5 py-5 glass-panel border-y border-white/5 group-hover/row:border-indigo-500/30 group-hover/row:bg-indigo-500/5 transition-all duration-500">
          <div className="text-sm font-bold text-white tracking-tight">{rowView.senderDisplay}</div>
        </td>
        <td className="px-5 py-5 glass-panel border-y border-white/5 group-hover/row:border-indigo-500/30 group-hover/row:bg-indigo-500/5 transition-all duration-500">
          <div className="text-xs font-medium text-white/80">{rowView.receiverDisplay}</div>
        </td>
        <td className="px-5 py-5 glass-panel border-y border-white/5 group-hover/row:border-indigo-500/30 group-hover/row:bg-indigo-500/5 transition-all duration-500">
          <span className={`text-sm font-bold ${rowView.amountClassName} tracking-tight`}>
            {rowView.amountDisplay}
          </span>
        </td>
        <td className="px-5 py-5 glass-panel border-y border-white/5 group-hover/row:border-indigo-500/30 group-hover/row:bg-indigo-500/5 transition-all duration-500 max-w-xs">
          {rowView.isOutboundTransfer ? (
            <div className="mb-1 inline-flex items-center rounded-full border border-red-400/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-red-200">
              {rowView.outboundReasonLabel}
            </div>
          ) : null}
          <span className="block truncate text-[13px] text-white/60 font-medium">
            {rowView.contentDisplay}
          </span>
        </td>
        <td className="px-5 py-5 glass-panel border-y border-white/5 group-hover/row:border-indigo-500/30 group-hover/row:bg-indigo-500/5 transition-all duration-500">
          <span className="text-sm font-bold text-indigo-100/90">
            {rowView.transactionCodeDisplay}
          </span>
        </td>
        <td className="px-5 py-5 last:rounded-r-[24px] glass-panel border-y border-white/5 group-hover/row:border-indigo-500/30 group-hover/row:bg-indigo-500/5 transition-all duration-500 text-right pr-6">
          <span className="text-xs font-bold text-indigo-300/80 tracking-tighter">
            {rowView.paidAtDisplay}
          </span>
        </td>
      </tr>
      {isExpanded ? (
        <ReceiptsExpandedDetailsRow
          receipt={receipt}
          expandedColSpan={expandedColSpan}
          expandedGridClass={expandedGridClass}
          showOrderCode={showOrderCode}
          shopBank={shopBank}
        />
      ) : null}
    </>
  );
};

export default ReceiptTableRow;
