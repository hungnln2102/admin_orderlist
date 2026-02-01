import React, { useEffect, useMemo, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import * as Helpers from "../../../../lib/helpers";
import { QR_BANK_INFO } from "../helpers";

type QrModalProps = {
  open: boolean;
  amount: string;
  note: string;
  onClose: () => void;
  onAmountChange: (value: string) => void;
  onNoteChange: (value: string) => void;
};

export const QrModal: React.FC<QrModalProps> = ({
  open,
  amount,
  note,
  onClose,
  onAmountChange,
  onNoteChange,
}) => {
  const [amountDraft, setAmountDraft] = useState(amount);
  const [noteDraft, setNoteDraft] = useState(note);

  useEffect(() => {
    if (open) {
      setAmountDraft(amount);
      setNoteDraft(note);
    }
  }, [open, amount, note]);

  const parsedAmount = useMemo(() => {
    const digits = amountDraft.replace(/[^\d]/g, "");
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
    const digits = amountDraft.replace(/[^\d]/g, "");
    setAmountDraft(digits);
    onAmountChange(digits);
  };

  const commitNote = () => {
    const nextNote = noteDraft.trim();
    setNoteDraft(nextNote);
    onNoteChange(nextNote);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-900/80 px-3 py-6">
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
                      placeholder="Ví dụ: 65000"
                      className="flex-1 rounded-xl border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm text-white focus:border-sky-400 focus:ring-2 focus:ring-sky-400/40"
                      value={amountDraft}
                      onChange={(event) => setAmountDraft(event.target.value)}
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
