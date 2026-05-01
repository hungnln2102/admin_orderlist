import React, { useEffect, useMemo, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ModalPortal } from "@/components/ui/ModalPortal";
import * as Helpers from "@/lib/helpers";
import { apiFetch } from "@/lib/api";
import { QR_BANK_INFO } from "../helpers";
import type { MatchableOrder } from "../helpers";

const digitsOnly = (value: string) => value.replace(/\D/g, "");

const formatVndThousands = (digits: string): string => {
  if (!digits) return "";
  const n = Number(digits);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("vi-VN");
};

type QrModalProps = {
  open: boolean;
  amount: string;
  note: string;
  matchableOrders: MatchableOrder[];
  onClose: () => void;
  onAmountChange: (value: string) => void;
  onNoteChange: (value: string) => void;
};

type BatchSummary = {
  id: number;
  batchCode: string;
  totalAmount: number;
  orderCount: number;
  status: string;
  paidReceiptId: number | null;
  paidAt: string | null;
  createdAt: string | null;
};

type BatchItem = {
  id: number;
  orderCode: string;
  orderListId: number | null;
  amount: number;
  status: string;
  createdAt: string | null;
};

export const QrModal: React.FC<QrModalProps> = ({
  open,
  amount,
  note,
  matchableOrders,
  onClose,
  onAmountChange,
  onNoteChange,
}) => {
  const [amountDraft, setAmountDraft] = useState(amount);
  const [noteDraft, setNoteDraft] = useState(note);
  const [batchCodesDraft, setBatchCodesDraft] = useState("");
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchInfo, setBatchInfo] = useState<{
    batchCode: string;
    orderCount: number;
    totalAmount: number;
  } | null>(null);
  const [batchListLoading, setBatchListLoading] = useState(false);
  const [batchListError, setBatchListError] = useState<string | null>(null);
  const [batchList, setBatchList] = useState<BatchSummary[]>([]);
  const [selectedBatchCode, setSelectedBatchCode] = useState<string>("");
  const [selectedBatchItems, setSelectedBatchItems] = useState<BatchItem[]>([]);
  const [selectedBatchLoading, setSelectedBatchLoading] = useState(false);
  const [selectedBatchError, setSelectedBatchError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const digits = digitsOnly(amount);
      setAmountDraft(digits ? formatVndThousands(digits) : "");
      setNoteDraft(note);
      setBatchCodesDraft("");
      setBatchError(null);
      setBatchInfo(null);
      setBatchLoading(false);
      setSelectedBatchCode("");
      setSelectedBatchItems([]);
      setSelectedBatchError(null);
    }
  }, [open, amount, note]);

  useEffect(() => {
    if (!open) return;
    let ignore = false;
    const fetchBatchList = async () => {
      setBatchListLoading(true);
      setBatchListError(null);
      try {
        const response = await apiFetch("/api/payment-receipts/batches?limit=15");
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(String(body?.error || "Không thể tải danh sách batch."));
        }
        if (!ignore) {
          const rows = Array.isArray(body?.batches) ? body.batches : [];
          setBatchList(rows);
        }
      } catch (error) {
        if (!ignore) {
          setBatchListError(
            error instanceof Error
              ? error.message
              : "Không thể tải danh sách batch."
          );
          setBatchList([]);
        }
      } finally {
        if (!ignore) setBatchListLoading(false);
      }
    };
    fetchBatchList();
    return () => {
      ignore = true;
    };
  }, [open, batchInfo]);

  const orderHint = useMemo(() => {
    const preview = matchableOrders
      .slice(0, 10)
      .map((item) => item.orderCode)
      .filter(Boolean)
      .join(", ");
    return preview;
  }, [matchableOrders]);

  const parsedAmount = useMemo(() => {
    const digits = digitsOnly(amountDraft);
    if (!digits) return 0;
    const value = Number(digits);
    return Number.isFinite(value) ? value : 0;
  }, [amountDraft]);

  const formattedAmountDisplay =
    parsedAmount > 0
      ? `${parsedAmount.toLocaleString("vi-VN")} VND`
      : "Chưa Cập Nhật";

  const qrImageUrl = useMemo(() => {
    return Helpers.buildSepayQrUrl({
      accountNumber: QR_BANK_INFO.accountNumber,
      bankCode: QR_BANK_INFO.bankCode,
      amount: parsedAmount,
      description: noteDraft.trim(),
      accountName: QR_BANK_INFO.accountHolder,
    });
  }, [parsedAmount, noteDraft]);

  const noteDisplay = noteDraft.trim() || "Chưa có nội dung";

  const commitAmount = () => {
    const digits = digitsOnly(amountDraft);
    setAmountDraft(digits ? formatVndThousands(digits) : "");
    onAmountChange(digits);
  };

  const handleAmountInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const digits = digitsOnly(event.target.value);
    if (!digits) {
      setAmountDraft("");
      return;
    }
    setAmountDraft(formatVndThousands(digits));
  };

  const commitNote = () => {
    const nextNote = noteDraft.trim();
    setNoteDraft(nextNote);
    onNoteChange(nextNote);
  };

  const createBatchFromOrders = async () => {
    const orderCodes = (
      batchCodesDraft.toUpperCase().match(/MAV[A-Z0-9]{3,20}/g) || []
    ).filter((code) => !/^MAVG/i.test(code));
    const uniqueOrderCodes = [...new Set(orderCodes)];
    if (uniqueOrderCodes.length === 0) {
      setBatchError("Vui lòng nhập ít nhất 1 mã đơn MAV để tạo mã nhóm.");
      return;
    }
    setBatchLoading(true);
    setBatchError(null);
    setBatchInfo(null);
    try {
      const response = await apiFetch("/api/payment-receipts/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderCodes: uniqueOrderCodes,
          note: noteDraft.trim() || null,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          String(body?.error || "Không thể tạo mã biên lai nhóm (MAVG).")
        );
      }
      const nextBatchCode = String(body?.batchCode || "").trim().toUpperCase();
      const nextAmount = Number(body?.totalAmount) || 0;
      if (!nextBatchCode) {
        throw new Error("Không nhận được batchCode từ server.");
      }

      setNoteDraft(nextBatchCode);
      onNoteChange(nextBatchCode);

      if (nextAmount > 0) {
        const nextDigits = String(Math.round(nextAmount));
        setAmountDraft(formatVndThousands(nextDigits));
        onAmountChange(nextDigits);
      }

      setBatchInfo({
        batchCode: nextBatchCode,
        orderCount: Number(body?.orderCount) || uniqueOrderCodes.length,
        totalAmount: nextAmount,
      });
      setSelectedBatchCode(nextBatchCode);
      setSelectedBatchItems([]);
      setSelectedBatchError(null);
    } catch (error) {
      setBatchError(
        error instanceof Error
          ? error.message
          : "Không thể tạo mã biên lai nhóm."
      );
    } finally {
      setBatchLoading(false);
    }
  };

  const openBatchDetail = async (batchCode: string) => {
    const normalized = String(batchCode || "").trim().toUpperCase();
    if (!normalized) return;
    setSelectedBatchCode(normalized);
    setSelectedBatchLoading(true);
    setSelectedBatchError(null);
    try {
      const response = await apiFetch(
        `/api/payment-receipts/batches/${encodeURIComponent(normalized)}`
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(body?.error || "Không thể tải chi tiết batch."));
      }
      const items = Array.isArray(body?.items) ? body.items : [];
      setSelectedBatchItems(items);
      setBatchCodesDraft(items.map((item: BatchItem) => item.orderCode).join(", "));
      setNoteDraft(normalized);
      onNoteChange(normalized);
      if (body?.batch?.totalAmount) {
        const digits = String(Math.round(Number(body.batch.totalAmount) || 0));
        if (Number(digits) > 0) {
          setAmountDraft(formatVndThousands(digits));
          onAmountChange(digits);
        }
      }
    } catch (error) {
      setSelectedBatchItems([]);
      setSelectedBatchError(
        error instanceof Error ? error.message : "Không thể tải chi tiết batch."
      );
    } finally {
      setSelectedBatchLoading(false);
    }
  };

  if (!open) return null;

  const panelSurface =
    "rounded-2xl border border-white/[0.08] bg-gradient-to-br from-slate-800/35 via-slate-900/50 to-slate-950/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]";
  const panelEmerald =
    "rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/25 via-slate-900/45 to-slate-950/55 shadow-[inset_0_1px_0_0_rgba(16,185,129,0.12)]";
  const labelCls =
    "block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1.5";
  const inputCls =
    "w-full rounded-xl border border-white/10 bg-slate-950/75 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-500/20 outline-none transition";
  const applyAll = () => {
    commitAmount();
    commitNote();
  };

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-slate-950/80 backdrop-blur-md px-3 py-6 sm:py-10">
      <div className="relative w-full max-w-6xl overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-b from-[#151c2e] via-[#0f141c] to-[#0a0d12] text-white shadow-[0_32px_96px_-20px_rgba(0,0,0,0.85)] ring-1 ring-white/[0.06]">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/35 to-transparent"
          aria-hidden
        />
        <button
          type="button"
          className="absolute right-3 top-3 z-10 rounded-full p-2.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
          onClick={onClose}
          aria-label="Đóng"
        >
          <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
        <div className="px-5 py-7 sm:px-9 sm:py-9 space-y-5 sm:space-y-6 pt-14 sm:pt-10">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300/90">
              VietQR · Sepay
            </span>
            <h2 className="text-[1.35rem] sm:text-2xl font-bold text-white tracking-tight leading-snug">
              Tạo thông tin thanh toán qua QR Code
            </h2>
            <p className="text-sm text-slate-400/95 leading-relaxed max-w-xl mx-auto">
              Trên: nhập số tiền và nội dung hoặc gộp đơn MAVG. Dưới: mã QR và thông tin giao dịch
              khớp với các ô đã nhập.
            </p>
          </div>

          {/* Tài khoản nhận */}
          <div
            className={`${panelSurface} p-3.5 sm:p-4 flex items-center gap-3 sm:gap-4`}
          >
            <img
              src="https://companieslogo.com/img/orig/VPB.VN-b0a9916f.png?t=1722928514"
              alt=""
              className="h-10 w-10 object-contain shrink-0 rounded-xl bg-white/12 p-1.5 ring-1 ring-white/10"
            />
            <div className="min-w-0 flex-1 text-left">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Tài khoản nhận
              </p>
              <p className="font-mono text-sm font-semibold text-white tracking-tight truncate">
                {QR_BANK_INFO.accountNumber}
              </p>
              <p className="text-xs text-slate-400 truncate">{QR_BANK_INFO.accountHolder}</p>
            </div>
          </div>

          {/* Hàng trên: 2 khối ngang */}
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
                  onChange={handleAmountInputChange}
                  onBlur={commitAmount}
                  onKeyDown={(e) => e.key === "Enter" && commitAmount()}
                />
              </div>
              <div>
                <label htmlFor="qr-modal-note" className={labelCls}>
                  Nội dung chuyển khoản
                </label>
                <input
                  id="qr-modal-note"
                  type="text"
                  placeholder="VD: TT NCC kỳ … hoặc mã MAVG"
                  className={inputCls}
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  onBlur={commitNote}
                  onKeyDown={(e) => e.key === "Enter" && commitNote()}
                />
              </div>
              <button
                type="button"
                className="w-full mt-auto rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 py-3 text-sm font-semibold text-white shadow-md shadow-sky-900/40 transition hover:from-sky-400 hover:to-blue-500 active:scale-[0.99]"
                onClick={applyAll}
              >
                Áp dụng số tiền & nội dung
              </button>
            </div>

            <div className="flex flex-col gap-4 min-h-0">
              <div
                className={`${panelEmerald} p-4 sm:p-6 space-y-4 flex-1 flex flex-col`}
              >
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
                  onChange={(event) => setBatchCodesDraft(event.target.value)}
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
                  onClick={createBatchFromOrders}
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
                        onClick={() => openBatchDetail(batch.batchCode)}
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

          {/* Hàng dưới: VietQR */}
          <div
            className={`${panelSurface} p-6 sm:p-8 flex flex-col items-center gap-8 relative overflow-hidden`}
          >
            <div
              className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-sky-500/15 blur-3xl"
              aria-hidden
            />
            <div className="relative flex flex-col items-center text-center space-y-4 w-full">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/20 text-xs font-bold text-violet-200">
                  3
                </span>
                <p className="text-sm font-semibold text-sky-200/95 tracking-tight">
                  Quét mã QR để thanh toán
                </p>
              </div>
              <div className="relative mx-auto">
                <div
                  className="absolute -inset-[3px] rounded-[1.35rem] bg-gradient-to-br from-sky-400/30 via-white/10 to-violet-500/25 opacity-80 blur-[2px]"
                  aria-hidden
                />
                <div className="relative rounded-2xl bg-white p-4 sm:p-5 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.5)]">
                  <img
                    src={qrImageUrl}
                    alt="Mã QR chuyển khoản VietQR"
                    className="h-52 w-52 sm:h-56 sm:w-56 object-contain block mx-auto"
                  />
                </div>
              </div>
              <a
                href={qrImageUrl}
                download
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-900/30 transition hover:from-sky-400 hover:to-blue-500"
              >
                Tải ảnh QR
              </a>
            </div>
            <dl className="relative w-full max-w-lg mx-auto space-y-0 rounded-2xl border border-white/[0.07] bg-slate-950/55 px-4 py-1 divide-y divide-white/[0.06]">
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-slate-500 shrink-0 text-sm">Ngân hàng</dt>
                <dd className="font-medium text-slate-100 text-right text-sm">{QR_BANK_INFO.bankName}</dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-slate-500 shrink-0 text-sm">Số tài khoản</dt>
                <dd className="font-mono font-semibold text-slate-100 text-right break-all text-sm">
                  {QR_BANK_INFO.accountNumber}
                </dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-slate-500 shrink-0 text-sm">Chủ TK</dt>
                <dd className="font-medium text-slate-100 text-right uppercase text-xs sm:text-sm leading-snug">
                  {QR_BANK_INFO.accountHolder}
                </dd>
              </div>
              <div className="flex justify-between gap-4 py-3 items-baseline">
                <dt className="text-slate-500 shrink-0 text-sm">Số tiền</dt>
                <dd className="font-semibold text-amber-200 tabular-nums text-right text-sm">
                  {formattedAmountDisplay}
                </dd>
              </div>
              <div className="flex justify-between gap-4 py-3 items-start">
                <dt className="text-slate-500 shrink-0 text-sm pt-0.5">Nội dung</dt>
                <dd className="font-medium text-violet-200 text-right break-words max-w-[70%] text-sm">
                  {noteDisplay}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};
