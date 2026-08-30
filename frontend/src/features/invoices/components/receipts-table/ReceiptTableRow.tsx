/* eslint-disable max-lines, @typescript-eslint/no-explicit-any */
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { apiFetch } from "@/shared/api/client";

import { MatchableOrder, PaymentReceipt, ReceiptFlowType, type ShopBankDisplay } from "../../helpers";
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
  enableAllocation?: boolean;
  onAllocate?: (receipt: PaymentReceipt) => void;
  showCategoryReason?: boolean;
  flowTypes?: ReceiptFlowType[];
  onClassifyReceipt?: (receiptId: number, flowTypeId: number, note?: string, linkedExpenseId?: number, orderCodes?: string[]) => Promise<void>;
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
  enableAllocation,
  onAllocate,
  showCategoryReason = false,
  flowTypes = [],
  onClassifyReceipt,
}) => {
  const rowView = buildReceiptRowView(receipt, shopBank);

  const [selectedFlowTypeId, setSelectedFlowTypeId] = useState<number | null>(null);
  const [classificationNote, setClassificationNote] = useState("");
  const [classifying, setClassifying] = useState(false);
  const [classificationError, setClassificationError] = useState<string | null>(null);
  const [orderCodesInput, setOrderCodesInput] = useState("");

  const [linkMode, setLinkMode] = useState<"create" | "link">("create");
  const [unlinkedExpenses, setUnlinkedExpenses] = useState<any[]>([]);
  const [selectedExpenseId, setSelectedExpenseId] = useState<number | null>(null);
  const [loadingExpenses, setLoadingExpenses] = useState(false);

  // Lọc flow types theo chiều tiền (Thu vs Chi)
  const filteredFlowTypes = useMemo(() => {
    const isOut = rowView.isOutboundTransfer || receipt.amount < 0;
    return flowTypes.filter(
      (ft) =>
        ft.direction === "neutral" ||
        (isOut ? ft.direction === "out" : ft.direction === "in")
    );
  }, [flowTypes, receipt.amount, rowView.isOutboundTransfer]);

  const selectedFlowType = useMemo(() => {
    return flowTypes.find((ft) => ft.id === selectedFlowTypeId) || null;
  }, [flowTypes, selectedFlowTypeId]);

  const selectedFlowTypeEffect = selectedFlowType?.effect || null;

  const fetchUnlinkedExpenses = useCallback(async () => {
    try {
      setLoadingExpenses(true);
      const expenseType =
        selectedFlowTypeEffect === "withdrawal"
          ? "withdraw_profit"
          : selectedFlowTypeEffect === "import_order"
          ? "external_import"
          : "";
      const res = await apiFetch(`/api/payment-receipts/unlinked-expenses?receiptId=${receipt.id}&expenseType=${expenseType}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data?.success && Array.isArray(data.list)) {
        setUnlinkedExpenses(data.list);
        if (data.list.length > 0) {
          setSelectedExpenseId(data.list[0].id);
        } else {
          setSelectedExpenseId(null);
        }
      }
    } catch {
      setClassificationError("Không thể tải danh sách chi phí chưa ghép.");
    } finally {
      setLoadingExpenses(false);
    }
  }, [receipt.id, selectedFlowTypeEffect]);

  useEffect(() => {
    if (linkMode === "link" && selectedFlowTypeId) {
      void fetchUnlinkedExpenses();
    }
  }, [linkMode, selectedFlowTypeId, fetchUnlinkedExpenses]);

  const handleClassifyClick = async () => {
    if (!selectedFlowTypeId || !onClassifyReceipt) return;
    try {
      setClassifying(true);
      setClassificationError(null);
      const expenseId = linkMode === "link" && selectedExpenseId ? selectedExpenseId : undefined;
      const orderCodes = selectedFlowTypeEffect === "import_order" && linkMode === "create" && orderCodesInput
        ? orderCodesInput.split(",").map((c) => c.trim()).filter(Boolean)
        : undefined;
      await onClassifyReceipt(receipt.id, selectedFlowTypeId, classificationNote, expenseId, orderCodes);
    } catch (err) {
      setClassificationError(err instanceof Error ? err.message : "Không thể phân loại biên lai.");
    } finally {
      setClassifying(false);
    }
  };

  return (
    <>
      <tr
        className="group/row cursor-pointer transition-all duration-500 relative z-10"
        onClick={() => onToggle(receipt.id)}
        onDoubleClick={() => (onSelectReceipt ? onSelectReceipt(receipt) : undefined)}
      >
        {showCategoryReason ? (
          <td className="px-5 py-5 first:rounded-l-[24px] glass-panel border-y border-white/5 group-hover/row:border-indigo-500/30 group-hover/row:bg-indigo-500/5 transition-all duration-500">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold shadow-sm ${
                  !receipt.isFinancialPosted
                    ? "bg-slate-500/15 border-slate-400/30 text-slate-300 shadow-slate-950/40"
                    : Number(receipt.amount) < 0 || (receipt as any).outboundAmount > 0
                    ? "bg-rose-500/15 border-rose-400/30 text-rose-300 shadow-rose-950/40"
                    : "bg-emerald-500/15 border-emerald-400/30 text-emerald-300 shadow-emerald-950/40"
                }`}
              >
                <span>
                  {!receipt.isFinancialPosted
                    ? "⏳"
                    : Number(receipt.amount) < 0 || (receipt as any).outboundAmount > 0
                    ? "💸"
                    : "💰"}
                </span>
                <span>
                  {!receipt.isFinancialPosted
                    ? "Chưa phân loại"
                    : receipt.flowTypeLabel ||
                      receipt.outboundReasonLabel ||
                      receipt.outboundReason ||
                      (Number(receipt.amount) < 0 || (receipt as any).outboundAmount > 0
                        ? "Chi phí ngoài luồng"
                        : "Doanh thu ngoài luồng")}
                </span>
              </span>
            </div>
          </td>
        ) : onClassifyReceipt && flowTypes.length > 0 ? (
          <td className="px-5 py-5 first:rounded-l-[24px] glass-panel border-y border-white/5 group-hover/row:border-indigo-500/30 group-hover/row:bg-indigo-500/5 transition-all duration-500 align-middle">
            <div
              className="flex flex-col gap-2.5 p-3 rounded-2xl bg-slate-900/30 border border-white/5 shadow-inner min-w-[220px]"
              onClick={(event) => event.stopPropagation()}
              onDoubleClick={(event) => event.stopPropagation()}
            >
              <div className="relative">
                <select
                  value={selectedFlowTypeId || ""}
                  onChange={(event) => {
                    const val = event.target.value;
                    setSelectedFlowTypeId(val ? Number(val) : null);
                    setClassificationError(null);
                    setLinkMode("create");
                    setUnlinkedExpenses([]);
                    setSelectedExpenseId(null);
                    setOrderCodesInput("");
                  }}
                  disabled={classifying}
                  className="w-full appearance-none rounded-xl border border-white/10 bg-slate-950/60 pl-3 pr-8 py-2 text-xs font-bold text-indigo-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 disabled:opacity-60 transition-all cursor-pointer"
                >
                  <option value="" className="bg-slate-950 text-white/60">Chọn loại phân loại...</option>
                  {filteredFlowTypes.map((ft) => (
                    <option key={ft.id} value={ft.id} className="bg-slate-950 text-white">
                      {ft.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-white/40">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {selectedFlowTypeEffect === "order_match" ? (
                <div className="space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="relative">
                    <select
                      value={selectedValue}
                      onChange={(event) => void onSelectMatch(receipt, event.target.value)}
                      disabled={isMatching}
                      className="w-full appearance-none rounded-xl border border-white/10 bg-slate-950/60 pl-3 pr-8 py-2 text-xs font-bold text-indigo-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 disabled:opacity-60 transition-all cursor-pointer"
                    >
                      <option value="" className="bg-slate-950 text-white/60">Chọn đơn cần ghép...</option>
                      <option value="__manual__" className="bg-slate-950 text-white">Tự điền mã đơn hàng</option>
                      {orderOptions.map((order) => (
                        <option key={order.orderCode} value={order.orderCode} className="bg-slate-950 text-white">
                          {order.orderCode} - {order.status}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-white/40">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  {isManualInput && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={manualCode}
                        onChange={(event) => onManualCodeChange(event.target.value)}
                        disabled={isMatching}
                        placeholder="Nhập mã đơn (VD: MAVC...)"
                        className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs font-medium text-white placeholder-white/30 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 disabled:opacity-60 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => void onSubmitManualMatch(receipt)}
                        disabled={isMatching}
                        className="shrink-0 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg shadow-indigo-950/40 active:scale-[0.96] transition-all disabled:opacity-50"
                      >
                        Ghép
                      </button>
                    </div>
                  )}
                  {isMatching && (
                    <p className="text-[10px] font-bold text-indigo-300/80 animate-pulse flex items-center gap-1">
                      <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Đang ghép đơn...
                    </p>
                  )}
                  {rowError && (
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2">
                      <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>{rowError}</span>
                    </div>
                  )}
                </div>
              ) : selectedFlowTypeId ? (
                <div className="space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  {/* Tabs/Toggles for Linking Options */}
                  {(selectedFlowTypeEffect === "withdrawal" || selectedFlowTypeEffect === "import_order") && (
                    <div className="flex p-0.5 bg-slate-950/60 rounded-xl border border-white/5 gap-1">
                      <button
                        type="button"
                        onClick={() => setLinkMode("create")}
                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all duration-300 ${
                          linkMode === "create"
                            ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm"
                            : "text-slate-400 border border-transparent hover:text-slate-200"
                        }`}
                      >
                        Tạo log mới
                      </button>
                      <button
                        type="button"
                        onClick={() => setLinkMode("link")}
                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all duration-300 ${
                          linkMode === "link"
                            ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm"
								            : "text-slate-400 border border-transparent hover:text-slate-200"
                        }`}
                      >
                        Ghép log có sẵn
                      </button>
                    </div>
                  )}

                  {linkMode === "link" && (selectedFlowTypeEffect === "withdrawal" || selectedFlowTypeEffect === "import_order") ? (
                    <div className="space-y-2">
                      {loadingExpenses ? (
                        <p className="text-[10px] font-semibold text-slate-400 animate-pulse py-1">Đang tải danh sách log...</p>
                      ) : unlinkedExpenses.length === 0 ? (
                        <p className="text-[10px] font-semibold text-rose-300 py-1">Không tìm thấy log chi phí phù hợp gần đây.</p>
                      ) : (
                        <div className="relative">
                          <select
                            value={selectedExpenseId || ""}
                            onChange={(e) => setSelectedExpenseId(Number(e.target.value))}
                            disabled={classifying}
                            className="w-full appearance-none rounded-xl border border-white/10 bg-slate-950/60 pl-3 pr-8 py-2 text-xs font-bold text-indigo-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 disabled:opacity-60 transition-all cursor-pointer"
                          >
                            {unlinkedExpenses.map((exp) => (
                              <option key={exp.id} value={exp.id} className="bg-slate-950 text-white">
                                {new Date(exp.created_at).toLocaleDateString("vi-VN")} - {exp.reason || "Không lý do"} ({Number(exp.amount).toLocaleString("vi-VN")}đ)
                              </option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-white/40">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedFlowTypeEffect === "import_order" && (
                        <input
                          type="text"
                          value={orderCodesInput}
                          onChange={(event) => setOrderCodesInput(event.target.value)}
                          disabled={classifying}
                          placeholder="Mã đơn phân bổ (phẩy, VD: MAV123...)"
                          className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs font-medium text-white placeholder-white/30 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 disabled:opacity-60 transition-all font-mono"
                        />
                      )}
                      <input
                        type="text"
                        value={classificationNote}
                        onChange={(event) => setClassificationNote(event.target.value)}
                        disabled={classifying}
                        placeholder="Ghi chú phân loại (tùy chọn)..."
                        className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs font-medium text-white placeholder-white/30 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 disabled:opacity-60 transition-all"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleClassifyClick}
                    disabled={classifying || (linkMode === "link" && !selectedExpenseId)}
                    className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-indigo-950/50 hover:shadow-indigo-500/20 active:scale-[0.98] hover:scale-[1.01] transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {classifying ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Đang xử lý...
                      </span>
                    ) : linkMode === "link" ? (
                      "Xác nhận ghép log"
                    ) : (
                      "Xác nhận phân loại"
                    )}
                  </button>
                  {classificationError && (
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2 animate-in fade-in duration-200">
                      <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>{classificationError}</span>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </td>
        ) : enableAllocation && ((receipt as any).outboundAmount > 0 || Number(receipt.amount) < 0) ? (
          <td className="px-5 py-5 first:rounded-l-[24px] glass-panel border-y border-white/5 group-hover/row:border-indigo-500/30 group-hover/row:bg-indigo-500/5 transition-all duration-500">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAllocate?.(receipt);
              }}
              className="w-full rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition-colors"
            >
              Phân bổ chi phí
            </button>
          </td>
        ) : enableMatching ? (
          <td className="px-5 py-5 first:rounded-l-[24px] glass-panel border-y border-white/5 group-hover/row:border-indigo-500/30 group-hover/row:bg-indigo-500/5 transition-all duration-500 align-middle">
            <div
              className="flex flex-col gap-2.5 p-3 rounded-2xl bg-slate-900/30 border border-white/5 shadow-inner min-w-[220px]"
              onClick={(event) => event.stopPropagation()}
              onDoubleClick={(event) => event.stopPropagation()}
            >
              <div className="relative">
                <select
                  value={selectedValue}
                  onChange={(event) => void onSelectMatch(receipt, event.target.value)}
                  disabled={isMatching}
                  className="w-full appearance-none rounded-xl border border-white/10 bg-slate-950/60 pl-3 pr-8 py-2 text-xs font-bold text-indigo-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 disabled:opacity-60 transition-all cursor-pointer"
                >
                  <option value="" className="bg-slate-950 text-white/60">Chọn đơn cần ghép...</option>
                  <option value="__manual__" className="bg-slate-950 text-white">Tự điền mã đơn hàng</option>
                  {orderOptions.map((order) => (
                    <option key={order.orderCode} value={order.orderCode} className="bg-slate-950 text-white">
                      {order.orderCode} - {order.status}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-white/40">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
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
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs font-medium text-white placeholder-white/30 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 disabled:opacity-60 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => void onSubmitManualMatch(receipt)}
                    disabled={isMatching}
                    className="shrink-0 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg shadow-indigo-950/40 active:scale-[0.96] transition-all disabled:opacity-50"
                  >
                    Ghép
                  </button>
                </div>
              )}
              {isMatching ? (
                <p className="text-[10px] font-bold text-indigo-300/80 animate-pulse flex items-center gap-1">
                  <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Đang ghép biên lai...
                </p>
              ) : null}
              {rowError ? (
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2 animate-in fade-in duration-200">
                  <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{rowError}</span>
                </div>
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
                <div className="flex flex-col gap-1">
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
                  {receipt.originalOrderCode && receipt.originalOrderCode !== receipt.orderCode ? (
                    <span className="text-[10px] text-indigo-300 font-medium tracking-wide uppercase italic">
                      Đơn gốc: {receipt.originalOrderCode}
                    </span>
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
