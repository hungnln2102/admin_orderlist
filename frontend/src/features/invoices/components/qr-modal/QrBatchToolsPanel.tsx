import React from "react";
import { inputCls, labelCls, panelEmerald, panelSurface } from "./helpers";
import type { BatchItem, BatchSummary } from "./types";

type Props = {
  amountDraft: string;
  noteDraft: string;
  orderHint: string;
  batchCodesDraft: string;
  batchLoading: boolean;
  batchError: string | null;
  batchInfo: { batchCode: string; orderCount: number; totalAmount: number } | null;
  batchListLoading: boolean;
  batchListError: string | null;
  batchList: BatchSummary[];
  selectedBatchCode: string;
  selectedBatchItems: BatchItem[];
  selectedBatchLoading: boolean;
  selectedBatchError: string | null;
  onAmountDraftChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAmountDraftBlur: () => void;
  onAmountDraftEnter: () => void;
  onNoteDraftChange: (value: string) => void;
  onNoteDraftBlur: () => void;
  onNoteDraftEnter: () => void;
  onApplyAll: () => void;
  onBatchCodesDraftChange: (value: string) => void;
  onCreateBatchFromOrders: () => void;
  onOpenBatchDetail: (batchCode: string) => void;
};

export const QrBatchToolsPanel: React.FC<Props> = ({
  amountDraft,
  noteDraft,
  orderHint,
  batchCodesDraft,
  batchLoading,
  batchError,
  batchInfo,
  batchListLoading,
  batchListError,
  batchList,
  selectedBatchCode,
  selectedBatchItems,
  selectedBatchLoading,
  selectedBatchError,
  onAmountDraftChange,
  onAmountDraftBlur,
  onAmountDraftEnter,
  onNoteDraftChange,
  onNoteDraftBlur,
  onNoteDraftEnter,
  onApplyAll,
  onBatchCodesDraftChange,
  onCreateBatchFromOrders,
  onOpenBatchDetail,
}) => (
  <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
    <div className={`${panelSurface} p-4 sm:p-6 space-y-5 flex flex-col`}>
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/15 text-xs font-bold text-sky-300">
          1
        </span>
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">Cập nhật mã QR</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Số tiền và nội dung hiển thị trên VietQR bên dưới.
          </p>
        </div>
      </div>
      <div>
        <label htmlFor="qr-modal-amount" className={labelCls}>
          Số tiền (VND)
        </label>
        <input
          id="qr-modal-amount"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Ví dụ: 65000"
          className={inputCls}
          value={amountDraft}
          onChange={onAmountDraftChange}
          onBlur={onAmountDraftBlur}
          onKeyDown={(e) => e.key === "Enter" && onAmountDraftEnter()}
        />
      </div>
      <div>
        <label htmlFor="qr-modal-note" className={labelCls}>
          Nội dung chuyển khoản
        </label>
        <input
          id="qr-modal-note"
          type="text"
          placeholder="VD: NCC KY … hoặc mã MAVG"
          className={inputCls}
          value={noteDraft}
          onChange={(event) => onNoteDraftChange(event.target.value)}
          onBlur={onNoteDraftBlur}
          onKeyDown={(e) => e.key === "Enter" && onNoteDraftEnter()}
        />
      </div>
      <button
        type="button"
        className="w-full mt-auto rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 py-3 text-sm font-semibold text-white shadow-md shadow-sky-900/40 transition hover:from-sky-400 hover:to-blue-500 active:scale-[0.99]"
        onClick={onApplyAll}
      >
        Áp dụng số tiền & nội dung
      </button>
    </div>

    <div className="flex flex-col gap-4 min-h-0">
      <div className={`${panelEmerald} p-4 sm:p-6 space-y-4 flex-1 flex flex-col`}>
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-xs font-bold text-emerald-300">
            2
          </span>
          <div>
            <h3 className="text-sm font-bold text-emerald-100 tracking-tight">
              Mã nhóm biên lai (MAVG)
            </h3>
            <p className="text-xs text-emerald-200/65 mt-0.5 leading-relaxed">
              Dán mã đơn MAV… — hệ thống tạo MAVG và điền nội dung + tổng tiền.
            </p>
          </div>
        </div>
        <textarea
          id="qr-modal-batch-codes"
          rows={3}
          placeholder="MAVC…, MAVK… (phẩy hoặc xuống dòng)"
          className={`${inputCls} resize-y min-h-[6rem] border-emerald-500/20 focus:border-emerald-400/50 focus:ring-emerald-500/15 flex-1`}
          value={batchCodesDraft}
          onChange={(event) => onBatchCodesDraftChange(event.target.value)}
        />
        {orderHint ? (
          <p className="text-[11px] text-slate-500 leading-snug">
            <span className="text-slate-400 font-semibold">Gợi ý:</span> {orderHint}
          </p>
        ) : null}
        {batchError ? (
          <p className="text-xs text-rose-300">{batchError}</p>
        ) : null}
        {batchInfo ? (
          <p className="text-xs text-emerald-300 font-medium">
            Đã tạo {batchInfo.batchCode} · {batchInfo.orderCount} đơn ·{" "}
            {batchInfo.totalAmount.toLocaleString("vi-VN")} VND
          </p>
        ) : null}
        <button
          type="button"
          className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-950/50 transition hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.99]"
          onClick={onCreateBatchFromOrders}
          disabled={batchLoading}
        >
          {batchLoading ? "Đang tạo MAVG…" : "Tạo mã MAVG"}
        </button>
      </div>

      <div className={`${panelSurface} p-4 sm:p-5 space-y-3`}>
        <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            MAVG gần đây
          </h3>
          {batchListLoading ? (
            <span className="text-[11px] text-slate-500">Đang tải…</span>
          ) : null}
        </div>
        {batchListError ? (
          <p className="text-xs text-rose-300">{batchListError}</p>
        ) : null}
        {!batchListError && batchList.length === 0 && !batchListLoading ? (
          <p className="text-xs text-slate-500 py-2">Chưa có batch nào.</p>
        ) : null}
        {batchList.length > 0 ? (
          <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1 scroll-smooth">
            {batchList.map((batch) => (
              <button
                key={batch.id}
                type="button"
                className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-left transition hover:border-emerald-500/35 hover:bg-emerald-500/5"
                onClick={() => onOpenBatchDetail(batch.batchCode)}
              >
                <span className="text-xs font-semibold text-emerald-300">
                  {batch.batchCode}
                </span>
                <span className="block text-[11px] text-slate-400 mt-0.5">
                  {batch.orderCount} đơn ·{" "}
                  {(Number(batch.totalAmount) || 0).toLocaleString("vi-VN")} VND
                </span>
              </button>
            ))}
          </div>
        ) : null}
        {selectedBatchCode ? (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/20 p-3 space-y-2 mt-1">
            <p className="text-xs font-semibold text-emerald-200">
              Chi tiết · {selectedBatchCode}
            </p>
            {selectedBatchLoading ? (
              <p className="text-xs text-slate-400">Đang tải đơn trong batch…</p>
            ) : null}
            {selectedBatchError ? (
              <p className="text-xs text-rose-300">{selectedBatchError}</p>
            ) : null}
            {!selectedBatchLoading &&
            !selectedBatchError &&
            selectedBatchItems.length === 0 ? (
              <p className="text-xs text-slate-500">Batch chưa có đơn.</p>
            ) : null}
            {selectedBatchItems.length > 0 ? (
              <ul className="max-h-28 overflow-y-auto space-y-1 text-xs">
                {selectedBatchItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex justify-between gap-2 rounded-md bg-slate-900/70 px-2 py-1.5"
                  >
                    <span className="text-slate-200 font-medium">{item.orderCode}</span>
                    <span className="text-slate-400 tabular-nums shrink-0">
                      {(Number(item.amount) || 0).toLocaleString("vi-VN")}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  </div>
);
