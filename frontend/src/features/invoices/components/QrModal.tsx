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

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-slate-900/80 px-3 py-6">
      <div className="w-full max-w-5xl rounded-3xl bg-slate-900 text-white shadow-2xl border border-slate-700 relative z-[100]">
        <button
          className="absolute right-6 top-6 text-slate-400 hover:text-indigo-100 transition"
          onClick={onClose}
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
        <div className="px-6 py-10 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold">
              Tạo thông tin thanh toán qua QR Code
            </h2>
            <p className="text-sm text-slate-300">
              Quét mã QR để chuyển khoản nhanh. Nhập số tiền và nội dung để cập
              nhật chi tiết.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6 flex flex-col items-center text-center space-y-4">
              <p className="text-lg font-semibold text-sky-200">
                Quét mã QR để thanh toán
              </p>
              <div className="rounded-2xl bg-white p-4 relative z-0">
                <img
                  src={qrImageUrl}
                  alt="QR thanh toan"
                  className="h-64 w-64 object-contain relative z-0"
                />
              </div>
              <a
                href={qrImageUrl}
                download
                className="inline-flex items-center justify-center rounded-full bg-sky-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-400 relative z-10"
              >
                Tải ảnh QR
              </a>
              <div className="w-full text-left space-y-1 text-sm text-slate-200">
                <p>
                  Ngân hàng: <span className="font-semibold">{QR_BANK_INFO.bankName}</span>
                </p>
                <p>
                  Số tài khoản:{" "}
                  <span className="font-semibold">{QR_BANK_INFO.accountNumber}</span>
                </p>
                <p>
                  Chủ tài khoản:{" "}
                  <span className="font-semibold uppercase">
                    {QR_BANK_INFO.accountHolder}
                  </span>
                </p>
                <p>
                  Số tiền:{" "}
                  <span className="font-semibold text-rose-200">
                    {formattedAmountDisplay}
                  </span>
                </p>
                <p>
                  Nội dung:{" "}
                  <span className="font-semibold text-violet-200">
                    {noteDisplay}
                  </span>
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6 space-y-5">
              <div className="flex items-center space-x-3 border-b border-slate-700 pb-4">
                <img
                  src="https://companieslogo.com/img/orig/VPB.VN-b0a9916f.png?t=1722928514"
                  alt="VPBank"
                  className="h-10 w-10 object-contain"
                />
                <div>
                  <p className="text-sm uppercase tracking-wide text-slate-300">
                    Ngân hàng
                  </p>
                  <p className="text-lg font-semibold text-white">
                    {QR_BANK_INFO.bankName}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm text-slate-300">
                  <span>Thụ hưởng</span>
                  <span className="font-semibold text-white">
                    {QR_BANK_INFO.accountHolder}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-slate-300">Số Tài Khoản</p>
                  <div className="rounded-xl border border-slate-600 bg-slate-900/50 px-3 py-2 text-white font-semibold">
                    {QR_BANK_INFO.accountNumber}
                  </div>
                </div>
              </div>
              <div className="space-y-5">
                <div>
                  <button
                    type="button"
                    className="w-full rounded-xl border border-sky-400/50 bg-slate-900/40 px-4 py-2 text-sm font-semibold text-sky-200 hover:border-sky-300 transition"
                    onClick={commitAmount}
                  >
                    + Thêm số tiền
                  </button>
                  <div className="mt-3 flex items-center gap-3">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="Ví dụ: 65.000"
                      className="flex-1 rounded-xl border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm text-white focus:border-sky-400 focus:ring-2 focus:ring-sky-400/40"
                      value={amountDraft}
                      onChange={handleAmountInputChange}
                      onBlur={commitAmount}
                    />
                    <button
                      type="button"
                      className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white"
                      onClick={commitAmount}
                    >
                      OK
                    </button>
                  </div>
                </div>
                <div>
                  <button
                    type="button"
                    className="w-full rounded-xl border border-violet-400/50 bg-slate-900/40 px-4 py-2 text-sm font-semibold text-violet-200 hover:border-violet-300 transition"
                    onClick={commitNote}
                  >
                    + Thêm nội dung
                  </button>
                  <div className="mt-3 flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Nhập nội dung"
                      className="flex-1 rounded-xl border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm text-white focus:border-violet-400 focus:ring-2 focus:ring-violet-400/30"
                      value={noteDraft}
                      onChange={(event) => setNoteDraft(event.target.value)}
                      onBlur={commitNote}
                    />
                    <button
                      type="button"
                      className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white"
                      onClick={commitNote}
                    >
                      Lưu
                    </button>
                  </div>
                </div>
                <div>
                  <button
                    type="button"
                    className="w-full rounded-xl border border-emerald-400/50 bg-slate-900/40 px-4 py-2 text-sm font-semibold text-emerald-200 hover:border-emerald-300 transition"
                    onClick={createBatchFromOrders}
                    disabled={batchLoading}
                  >
                    {batchLoading ? "Đang tạo MAVG..." : "+ Tạo mã nhóm MAVG từ nhiều đơn"}
                  </button>
                  <div className="mt-3 space-y-2">
                    <textarea
                      rows={3}
                      placeholder="Nhập mã đơn, ngăn cách bằng dấu phẩy/dấu cách (VD: MAVL123, MAVK234, ...)"
                      className="w-full rounded-xl border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
                      value={batchCodesDraft}
                      onChange={(event) => setBatchCodesDraft(event.target.value)}
                    />
                    {orderHint ? (
                      <p className="text-[11px] text-slate-400">
                        Gợi ý đơn có thể ghép: {orderHint}
                      </p>
                    ) : null}
                    {batchError ? (
                      <p className="text-xs text-rose-300">{batchError}</p>
                    ) : null}
                    {batchInfo ? (
                      <p className="text-xs text-emerald-300">
                        Đã tạo {batchInfo.batchCode} ({batchInfo.orderCount} đơn,{" "}
                        {batchInfo.totalAmount.toLocaleString("vi-VN")} VND).
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-600 bg-slate-900/40 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-emerald-200">
                      Batch MAVG gần đây
                    </p>
                    {batchListLoading ? (
                      <span className="text-[11px] text-slate-400">Đang tải...</span>
                    ) : null}
                  </div>
                  {batchListError ? (
                    <p className="text-xs text-rose-300">{batchListError}</p>
                  ) : null}
                  {!batchListError && batchList.length === 0 && !batchListLoading ? (
                    <p className="text-xs text-slate-400">Chưa có batch MAVG nào.</p>
                  ) : null}
                  {batchList.length > 0 ? (
                    <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                      {batchList.map((batch) => (
                        <button
                          key={batch.id}
                          type="button"
                          className="w-full rounded-lg border border-slate-600 bg-slate-800/60 px-3 py-2 text-left hover:border-emerald-400/60 transition"
                          onClick={() => openBatchDetail(batch.batchCode)}
                        >
                          <p className="text-xs font-semibold text-emerald-200">
                            {batch.batchCode}
                          </p>
                          <p className="text-[11px] text-slate-300">
                            {batch.orderCount} đơn -{" "}
                            {(Number(batch.totalAmount) || 0).toLocaleString("vi-VN")} VND
                          </p>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {selectedBatchCode ? (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
                      <p className="text-xs font-semibold text-emerald-200">
                        Chi tiết {selectedBatchCode}
                      </p>
                      {selectedBatchLoading ? (
                        <p className="text-xs text-slate-300">Đang tải danh sách đơn...</p>
                      ) : null}
                      {selectedBatchError ? (
                        <p className="text-xs text-rose-300">{selectedBatchError}</p>
                      ) : null}
                      {!selectedBatchLoading &&
                      !selectedBatchError &&
                      selectedBatchItems.length === 0 ? (
                        <p className="text-xs text-slate-300">Batch chưa có đơn.</p>
                      ) : null}
                      {selectedBatchItems.length > 0 ? (
                        <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                          {selectedBatchItems.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between rounded-md bg-slate-900/50 px-2 py-1"
                            >
                              <span className="text-xs text-white">{item.orderCode}</span>
                              <span className="text-[11px] text-slate-300">
                                {(Number(item.amount) || 0).toLocaleString("vi-VN")} VND
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};
