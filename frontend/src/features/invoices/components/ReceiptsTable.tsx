import React, { useMemo, useState } from "react";
import * as Helpers from "@/lib/helpers";
import {
  extractTransactionCodeFromNote,
  MatchableOrder,
  PaymentReceipt,
  QR_BANK_INFO,
  formatCurrencyVnd,
  resolveSender,
} from "../helpers";

type ReceiptsTableProps = {
  receipts: PaymentReceipt[];
  matchableOrders: MatchableOrder[];
  matchingReceiptId: number | null;
  onMatchReceipt: (receiptId: number, orderCode: string) => Promise<void>;
  enableMatching?: boolean;
  expandedReceiptId: number | null;
  onToggle: (receiptId: number) => void;
  onSelectReceipt?: (receipt: PaymentReceipt) => void;
  showOrderCode?: boolean;
  enableOrderCodeEdit?: boolean;
};

export const ReceiptsTable: React.FC<ReceiptsTableProps> = ({
  receipts,
  matchableOrders,
  matchingReceiptId,
  onMatchReceipt,
  enableMatching = false,
  expandedReceiptId,
  onToggle,
  onSelectReceipt,
  showOrderCode = true,
  enableOrderCodeEdit = false,
}) => {
  const [selectionByReceiptId, setSelectionByReceiptId] = useState<
    Record<number, string>
  >({});
  const [manualCodeByReceiptId, setManualCodeByReceiptId] = useState<
    Record<number, string>
  >({});
  const [rowErrorByReceiptId, setRowErrorByReceiptId] = useState<
    Record<number, string>
  >({});
  const [pendingConfirm, setPendingConfirm] = useState<{
    receiptId: number;
    orderCode: string;
  } | null>(null);
  const [editingReceiptId, setEditingReceiptId] = useState<number | null>(null);
  const [editingOrderCode, setEditingOrderCode] = useState("");

  const visibleColsBase = showOrderCode ? 7 : 6;
  const expandedColSpan = visibleColsBase + (enableMatching ? 1 : 0);
  const expandedGridClass = showOrderCode
    ? "grid grid-cols-1 md:grid-cols-5 gap-6"
    : "grid grid-cols-1 md:grid-cols-4 gap-6";
  const orderOptions = useMemo(() => {
    const seen = new Set<string>();
    return matchableOrders.filter((order) => {
      const key = (order.orderCode || "").toUpperCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [matchableOrders]);

  const getSelectedValue = (receipt: PaymentReceipt): string => {
    const stateValue = selectionByReceiptId[receipt.id];
    if (typeof stateValue === "string") return stateValue;
    const currentOrderCode = String(receipt.orderCode || "").trim().toUpperCase();
    return currentOrderCode || "";
  };

  const handleSelectMatch = async (receipt: PaymentReceipt, value: string) => {
    setSelectionByReceiptId((prev) => ({ ...prev, [receipt.id]: value }));
    setRowErrorByReceiptId((prev) => ({ ...prev, [receipt.id]: "" }));
    if (!value || value === "__manual__") return;
    setPendingConfirm({ receiptId: receipt.id, orderCode: value });
  };

  const handleSubmitManualMatch = (receipt: PaymentReceipt) => {
    const manualCode = String(manualCodeByReceiptId[receipt.id] || "")
      .trim()
      .toUpperCase();
    if (!manualCode) {
      setRowErrorByReceiptId((prev) => ({
        ...prev,
        [receipt.id]: "Bạn chưa nhập mã đơn hàng.",
      }));
      return;
    }
    setRowErrorByReceiptId((prev) => ({ ...prev, [receipt.id]: "" }));
    setPendingConfirm({ receiptId: receipt.id, orderCode: manualCode });
  };

  const handleConfirmMatch = async () => {
    if (!pendingConfirm) return;
    const { receiptId, orderCode } = pendingConfirm;
    setPendingConfirm(null);
    try {
      await onMatchReceipt(receiptId, orderCode);
      setSelectionByReceiptId((prev) => ({ ...prev, [receiptId]: orderCode }));
      setManualCodeByReceiptId((prev) => ({ ...prev, [receiptId]: "" }));
    } catch (err) {
      setRowErrorByReceiptId((prev) => ({
        ...prev,
        [receiptId]:
          err instanceof Error ? err.message : "Không thể ghép mã đơn cho biên lai.",
      }));
    }
  };

  const startEditOrderCode = (receipt: PaymentReceipt) => {
    setRowErrorByReceiptId((prev) => ({ ...prev, [receipt.id]: "" }));
    setEditingReceiptId(receipt.id);
    setEditingOrderCode(String(receipt.orderCode || "").trim().toUpperCase());
  };

  const cancelEditOrderCode = () => {
    setEditingReceiptId(null);
    setEditingOrderCode("");
  };

  const saveEditedOrderCode = async (receipt: PaymentReceipt) => {
    const nextCode = String(editingOrderCode || "").trim().toUpperCase();
    if (!nextCode) {
      setRowErrorByReceiptId((prev) => ({
        ...prev,
        [receipt.id]: "Bạn chưa nhập mã đơn hàng.",
      }));
      return;
    }
    try {
      setRowErrorByReceiptId((prev) => ({ ...prev, [receipt.id]: "" }));
      await onMatchReceipt(receipt.id, nextCode);
      cancelEditOrderCode();
    } catch (err) {
      setRowErrorByReceiptId((prev) => ({
        ...prev,
        [receipt.id]:
          err instanceof Error ? err.message : "Không thể cập nhật mã đơn.",
      }));
    }
  };

  return (
    <div className="bg-transparent overflow-visible">
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-4 text-white">
          <thead>
            <tr className="[&>th]:px-5 [&>th]:pb-2 [&>th]:text-[11px] [&>th]:font-black [&>th]:uppercase [&>th]:tracking-[0.2em] [&>th]:text-indigo-300/70 [&>th]:text-left">
              {enableMatching ? <th className="w-[320px]">GHÉP MÃ ĐƠN</th> : null}
              {showOrderCode ? <th className="w-[120px]">MÃ ĐƠN</th> : null}
              <th className="w-[180px]">NGƯỜI GỬI</th>
              <th className="w-[180px]">NGƯỜI NHẬN</th>
              <th className="w-[140px]">SỐ TIỀN</th>
              <th>NỘI DUNG CHUYỂN KHOẢN</th>
              <th className="w-[150px]">MÃ GIAO DỊCH</th>
              <th className="w-[150px] text-right pr-6">NGÀY THANH TOÁN</th>
            </tr>
          </thead>
          <tbody className="">
            {receipts.map((receipt) => {
              const isExpanded = expandedReceiptId === receipt.id;
              const selectedValue = getSelectedValue(receipt);
              const isManualInput = selectedValue === "__manual__";
              const rowError = rowErrorByReceiptId[receipt.id] || "";
              const isMatching = matchingReceiptId === receipt.id;
              const isEditingOrderCode =
                enableOrderCodeEdit && editingReceiptId === receipt.id;
              return (
                <React.Fragment key={receipt.id}>
                  <tr
                    className="group/row cursor-pointer transition-all duration-500 relative z-10"
                    onClick={() => onToggle(receipt.id)}
                    onDoubleClick={() =>
                      onSelectReceipt ? onSelectReceipt(receipt) : undefined
                    }
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
                            onChange={(event) =>
                              void handleSelectMatch(receipt, event.target.value)
                            }
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
                                value={manualCodeByReceiptId[receipt.id] || ""}
                                onChange={(event) =>
                                  setManualCodeByReceiptId((prev) => ({
                                    ...prev,
                                    [receipt.id]: event.target.value.toUpperCase(),
                                  }))
                                }
                                disabled={isMatching}
                                placeholder="Nhập mã đơn (VD: MAVC...)"
                                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs font-semibold text-white outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-60"
                              />
                              <button
                                type="button"
                                onClick={() => void handleSubmitManualMatch(receipt)}
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
                            <p className="text-[10px] font-semibold text-rose-300">
                              {rowError}
                            </p>
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
                                onChange={(event) =>
                                  setEditingOrderCode(
                                    event.target.value.toUpperCase()
                                  )
                                }
                                disabled={isMatching}
                                placeholder="Nhập mã đơn..."
                                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs font-semibold text-white outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-60"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => void saveEditedOrderCode(receipt)}
                                  disabled={isMatching}
                                  className="rounded-xl border border-emerald-300/40 bg-emerald-500/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-100 disabled:opacity-60"
                                >
                                  Lưu
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditOrderCode}
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
                                  onClick={() => startEditOrderCode(receipt)}
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
                    <td className="px-5 py-5 glass-panel border-y border-white/5 group-hover/row:border-indigo-500/30 group-hover/row:bg-indigo-500/5 transition-all duration-500">
                      <span className="text-sm font-bold text-indigo-100/90">
                        {extractTransactionCodeFromNote(receipt.note) || "—"}
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
                      <td colSpan={expandedColSpan} className="px-6 pb-8 pt-2">
                        <div className="rounded-[32px] glass-panel-light p-6 shadow-2xl border border-indigo-500/20">
                          <div className={expandedGridClass}>
                            {showOrderCode ? (
                              <div className="space-y-1">
                                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] leading-none">Mã đơn hàng</p>
                                <p className="text-sm font-black text-white">
                                  {receipt.orderCode || "—"}
                                </p>
                              </div>
                            ) : null}
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
                              <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] leading-none">Mã giao dịch</p>
                              <p className="text-sm font-bold text-indigo-100/90">
                                {extractTransactionCodeFromNote(receipt.note) || "—"}
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
      {pendingConfirm ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-md rounded-3xl border border-indigo-400/30 bg-slate-900/95 p-6 shadow-2xl">
            <h3 className="text-lg font-black text-white tracking-tight">
              Xác nhận gắn mã đơn
            </h3>
            <p className="mt-3 text-sm text-indigo-100/90 leading-relaxed">
              Bạn có chắc muốn gắn mã đơn{" "}
              <span className="font-black text-white">{pendingConfirm.orderCode}</span>{" "}
              cho biên lai này không?
            </p>
            <p className="mt-2 text-xs text-indigo-200/70 leading-relaxed">
              Khi xác nhận, hệ thống sẽ chạy luồng gán mã đơn (reconcile) và tự động
              cộng/trừ doanh thu, lợi nhuận theo đúng quy tắc đối soát hiện hành.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingConfirm(null)}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/5"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmMatch()}
                className="rounded-xl border border-indigo-300/30 bg-indigo-600/70 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
