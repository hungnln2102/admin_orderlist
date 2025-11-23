import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  EyeIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  CalendarDaysIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import StatCard, { STAT_CARD_ACCENTS } from "../components/StatCard";
import GradientButton from "../components/GradientButton";
import * as Helpers from "../lib/helpers";
import { apiFetch } from "../lib/api";
import { utils as XLSXUtils, writeFile as writeXLSXFile } from "xlsx";

interface PaymentReceipt {
  id: number;
  orderCode: string;
  paidAt: string;
  amount: number;
  sender: string;
  note: string;
}

type ReceiptCategory = "receipt" | "refund";

const formatCurrencyVnd = (value: number): string => {
  if (!Number.isFinite(value)) return "VND 0";
  return `VND ${Math.round(value).toLocaleString("vi-VN")}`;
};

const formatCurrencyVndFull = (value: number): string => {
  if (!Number.isFinite(value)) return "0\u0111";
  return `${Math.round(value).toLocaleString("vi-VN")}\u0111`;
};

const determineReceiptCategory = (
  orderCode: string | null | undefined
): ReceiptCategory => {
  const normalized = (orderCode || "").toUpperCase().trim();
  if (!normalized) return "refund";
  return normalized.startsWith("MAV") ? "receipt" : "refund";
};

const CATEGORY_OPTIONS: {
  value: ReceiptCategory;
  label: string;
  description: string;
}[] = [
  {
    value: "receipt",
    label: "Biên Nhận",
    description: "Mã đơn bắt đầu bằng MAV",
  },
  {
    value: "refund",
    label: "Hoàn tiền",
    description: "Các biên nhận khác",
  },
];

const QR_BANK_INFO = {
  bankName: "VP Bank",
  accountHolder: "NGO LE NGOC HUNG",
  accountNumber: "9183400998",
  bankBin: "970422",
};

export default function Invoices() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState<ReceiptCategory>("receipt");
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentReceipt | null>(
    null
  );
  const [rangePickerOpen, setRangePickerOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isAmountEditing, setIsAmountEditing] = useState(false);
  const [isNoteEditing, setIsNoteEditing] = useState(false);
  const [qrAmount, setQrAmount] = useState("");
  const [qrNote, setQrNote] = useState("");
  const [qrAmountDraft, setQrAmountDraft] = useState("");
  const [qrNoteDraft, setQrNoteDraft] = useState("");
  const dateRangeRef = useRef<HTMLDivElement | null>(null);

  const parsedAmount = useMemo(() => {
    const digits = qrAmount.replace(/[^\d]/g, "");
    if (!digits) return 0;
    const value = Number(digits);
    return Number.isFinite(value) ? value : 0;
  }, [qrAmount]);

  const formattedAmountDisplay =
    parsedAmount > 0
      ? `${parsedAmount.toLocaleString("vi-VN")} VND`
      : "Chưa cập nhật";

  const qrImageUrl = useMemo(() => {
    const base = `https://img.vietqr.io/image/${QR_BANK_INFO.bankBin}-${QR_BANK_INFO.accountNumber}-qr_only.jpg`;
    const params = new URLSearchParams({
      accountName: QR_BANK_INFO.accountHolder,
    });
    if (parsedAmount > 0) {
      params.set("amount", parsedAmount.toString());
    }
    if (qrNote.trim()) {
      params.set("addInfo", qrNote.trim());
    }
    return `${base}?${params.toString()}`;
  }, [parsedAmount, qrNote]);

  const handleOpenQrModal = () => {
    setIsQrModalOpen(true);
    setQrAmountDraft(qrAmount);
    setQrNoteDraft(qrNote);
  };

  const handleCloseQrModal = () => {
    setIsQrModalOpen(false);
    setIsAmountEditing(false);
    setIsNoteEditing(false);
  };

  const commitAmount = () => {
    const digits = qrAmountDraft.replace(/[^\d]/g, "");
    setQrAmount(digits);
    setIsAmountEditing(false);
  };

  const commitNote = () => {
    setQrNote(qrNoteDraft.trim());
    setIsNoteEditing(false);
  };

  const noteDisplay = qrNote.trim() || "Chưa có nội dung";

  const filteredReceipts = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();

    const parseDate = (value: string): number | null => {
      const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!match) return null;
      const [, d, m, y] = match.map(Number);
      return new Date(y, m - 1, d).getTime();
    };

    const startTime = parseDate(dateStart);
    const endTime = parseDate(dateEnd);

    return receipts.filter((item) => {
      const recordCategory = determineReceiptCategory(item.orderCode);
      const matchesSearch =
        !normalized ||
        [item.orderCode, item.note, item.sender]
          .map((value) => value?.toLowerCase() ?? "")
          .some((value) => value.includes(normalized));

      const paidTimestamp = parseDate(
        Helpers.formatDateToDMY(item.paidAt) || ""
      );

      const withinStart =
        startTime === null ||
        paidTimestamp === null ||
        paidTimestamp >= startTime;
      const withinEnd =
        endTime === null || paidTimestamp === null || paidTimestamp <= endTime;

      const matchesCategory = recordCategory === categoryFilter;

      return matchesSearch && withinStart && withinEnd && matchesCategory;
    });
  }, [receipts, searchTerm, dateStart, dateEnd, categoryFilter]);

  const stats = useMemo(() => {
    const totalAmount = receipts.reduce((sum, item) => {
      return (item.orderCode || "").toUpperCase().startsWith("MAV")
        ? sum + item.amount
        : sum;
    }, 0);
    const latestPaidAt = receipts.length > 0 ? receipts[0].paidAt ?? "" : "";

    return [
      {
        name: "Tổng Biên Nhận",
        value: receipts.length.toString(),
        icon: CheckCircleIcon,
        accent: STAT_CARD_ACCENTS.sky,
      },
      {
        name: "Tổng Số Tiền",
        value: formatCurrencyVndFull(totalAmount),
        icon: CheckCircleIcon,
        accent: STAT_CARD_ACCENTS.emerald,
      },
      {
        name: "Biên Lai Gần Nhất",
        value: latestPaidAt
          ? Helpers.formatDateToDMY(latestPaidAt) ?? "--"
          : "--",
        icon: XCircleIcon,
        accent: STAT_CARD_ACCENTS.violet,
      },
    ];
  }, [receipts]);

  const categoryCounts = useMemo(() => {
    return receipts.reduce(
      (acc, item) => {
        const category = determineReceiptCategory(item.orderCode);
        acc[category] += 1;
        return acc;
      },
      { receipt: 0, refund: 0 } as Record<ReceiptCategory, number>
    );
  }, [receipts]);

  useEffect(() => {
    const fetchReceipts = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiFetch("/api/payment-receipts");
        if (!response.ok) {
          throw new Error("Không thể tải biên nhận.");
        }
        const data = await response.json();
        setReceipts(Array.isArray(data.receipts) ? data.receipts : []);
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error ? err.message : "Không thể tải biên nhận."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchReceipts();
  }, []);

  const handleViewReceipt = (receipt: PaymentReceipt) => {
    setSelectedReceipt(receipt);
    setViewModalOpen(true);
  };

  const closeViewModal = () => {
    setSelectedReceipt(null);
    setViewModalOpen(false);
  };

  const handleExportToExcel = () => {
    if (!filteredReceipts.length) return;

    const headerRow = [
      "#",
      "Ma don",
      "Nguoi gui",
      "So tien goc",
      "So tien dinh dang",
      "Noi dung chuyen khoan",
      "Ngay thanh toan",
      "Nhom",
    ];

    const dataRows = filteredReceipts.map((receipt, index) => [
      index + 1,
      receipt.orderCode || "",
      receipt.sender || "",
      receipt.amount,
      formatCurrencyVnd(receipt.amount),
      receipt.note || "",
      receipt.paidAt ? Helpers.formatDateToDMY(receipt.paidAt) : "",
      determineReceiptCategory(receipt.orderCode) === "receipt"
        ? "Bien nhan"
        : "Hoan tien",
    ]);

    const worksheet = XLSXUtils.aoa_to_sheet([headerRow, ...dataRows]);
    worksheet["!cols"] = [
      { wch: 5 },
      { wch: 18 },
      { wch: 26 },
      { wch: 14 },
      { wch: 20 },
      { wch: 48 },
      { wch: 14 },
      { wch: 12 },
    ];

    const workbook = XLSXUtils.book_new();
    XLSXUtils.book_append_sheet(workbook, worksheet, "Bien nhan thanh toan");
    const isoDate = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    writeXLSXFile(workbook, `payment_receipts_${isoDate}.xlsx`);
  };

  const exportDisabled = loading || filteredReceipts.length === 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dateRangeRef.current &&
        !dateRangeRef.current.contains(event.target as Node)
      ) {
        setRangePickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toDisplayDate = (value: string): string => {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return value;
    const [, y, m, d] = match;
    return `${d}/${m}/${y}`;
  };

  const dateRangeDisplay =
    dateStart && dateEnd
      ? `${dateStart} - ${dateEnd}`
      : "dd/mm/yyyy - dd/mm/yyyy";

  const toISODate = (value: string): string => {
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return "";
    const [, d, m, y] = match;
    return `${y}-${m}-${d}`;
  };

  return (
    <>
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/80 px-3 py-6">
          <div className="w-full max-w-5xl rounded-3xl bg-slate-900 text-white shadow-2xl border border-slate-700 relative">
            <button
              className="absolute right-6 top-6 text-slate-400 hover:text-white transition"
              onClick={handleCloseQrModal}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            <div className="px-6 py-10 space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-semibold">
                  Tạo Thông Tin Thanh Toán Qua QR Code
                </h2>
                <p className="text-sm text-slate-300">
                  Quét mã QR để chuyển khoản nhanh chóng. Điền số tiền và nội
                  dung để cập nhật chi tiết.
                </p>
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6 flex flex-col items-center text-center space-y-4">
                  <p className="text-lg font-semibold text-sky-200">
                    Quét Mã QR Để Thanh Toán
                  </p>
                  <div className="rounded-2xl bg-white p-4">
                    <img
                      src={qrImageUrl}
                      alt="QR thanh toán"
                      className="h-64 w-64 object-contain"
                    />
                  </div>
                  <a
                    href={qrImageUrl}
                    download
                    className="inline-flex items-center justify-center rounded-full bg-sky-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-400"
                  >
                    Tải ảnh QR
                  </a>
                  <div className="w-full text-left space-y-1 text-sm text-slate-200">
                    <p>
                      Ngân hàng:{" "}
                      <span className="font-semibold">
                        {QR_BANK_INFO.bankName}
                      </span>
                    </p>
                    <p>
                      Số tài khoản:{" "}
                      <span className="font-semibold">
                        {QR_BANK_INFO.accountNumber}
                      </span>
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
                      <span>Thẻ Hưởng</span>
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
                        onClick={() => {
                          setIsAmountEditing(true);
                          setQrAmountDraft(qrAmount || "");
                        }}
                      >
                        + Thêm số tiền
                      </button>
                      {isAmountEditing && (
                        <div className="mt-3 flex items-center gap-3">
                          <input
                            type="text"
                            placeholder="Ví dụ: 65000"
                            className="flex-1 rounded-xl border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm text-white focus:border-sky-400 focus:ring-2 focus:ring-sky-400/40"
                            value={qrAmountDraft}
                            onChange={(event) =>
                              setQrAmountDraft(event.target.value)
                            }
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
                      )}
                    </div>
                    <div>
                      <button
                        type="button"
                        className="w-full rounded-xl border border-violet-400/50 bg-slate-900/40 px-4 py-2 text-sm font-semibold text-violet-200 hover:border-violet-300 transition"
                        onClick={() => {
                          setIsNoteEditing(true);
                          setQrNoteDraft(qrNote || "");
                        }}
                      >
                        + Thêm nội dung
                      </button>
                      {isNoteEditing && (
                        <div className="mt-3 flex items-center gap-3">
                          <input
                            type="text"
                            placeholder="Nhập nội dung"
                            className="flex-1 rounded-xl border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm text-white focus:border-violet-400 focus:ring-2 focus:ring-violet-400/30"
                            value={qrNoteDraft}
                            onChange={(event) =>
                              setQrNoteDraft(event.target.value)
                            }
                            onBlur={commitNote}
                          />
                          <button
                            type="button"
                            className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white"
                            onClick={commitNote}
                          >
                            OK
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-900/60 p-4 text-sm text-slate-200 space-y-2">
                    <p>
                      <span className="text-slate-400">Số tiền hiện tại:</span>{" "}
                      <span className="font-semibold text-white">
                        {formattedAmountDisplay}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-400">Nội dung hiện tại:</span>{" "}
                      <span className="font-semibold text-white">
                        {noteDisplay}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500">
                      * Nhấn OK hoặc rời khỏi ô nhập để cập nhật thông tin vào
                      QR.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Biên Nhận Thanh Toán
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Theo dõi giao dịch chuyển đến được lưu trong hệ thống
            </p>
          </div>
          <GradientButton
            icon={PlusIcon}
            className="mt-4 sm:mt-0"
            onClick={handleOpenQrModal}
          >
            Thêm biên nhận
          </GradientButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {stats.map((stat) => (
            <StatCard
              key={stat.name}
              title={stat.name}
              value={stat.value}
              icon={stat.icon}
              accent={stat.accent}
            />
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm mã đơn người gửi hoặc ghi chú..."
                className="w-full pl-12 pr-4 py-3 border border-gray-200 bg-gray-50/60 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <div className="relative flex items-stretch" ref={dateRangeRef}>
              <button
                type="button"
                onClick={() => setRangePickerOpen((prev) => !prev)}
                className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border transition w-full lg:w-64 ${
                  rangePickerOpen
                    ? "border-blue-500 bg-blue-50/40"
                    : "border-gray-200 bg-gray-50/60 hover:bg-gray-100"
                }`}
              >
                <div className="flex flex-col text-left">
                  <span className="text-xs uppercase tracking-wide text-gray-400">
                    Khoảng Ngày
                  </span>
                  <span className="text-sm font-medium text-gray-800">
                    {dateRangeDisplay}
                  </span>
                </div>
                <CalendarDaysIcon
                  className={`w-5 h-5 ${
                    rangePickerOpen ? "text-blue-600" : "text-gray-400"
                  }`}
                />
              </button>

              {rangePickerOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-10 p-4 space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                        Từ Ngày
                      </label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        value={toISODate(dateStart)}
                        onChange={(event) =>
                          setDateStart(
                            event.target.value
                              ? toDisplayDate(event.target.value)
                              : ""
                          )
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                        Đến Ngày
                      </label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        value={toISODate(dateEnd)}
                        onChange={(event) =>
                          setDateEnd(
                            event.target.value
                              ? toDisplayDate(event.target.value)
                              : ""
                          )
                        }
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <button
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      onClick={() => {
                        setDateStart("");
                        setDateEnd("");
                      }}
                    >
                      Xóa Khoảng
                    </button>
                    <div className="flex gap-2">
                      <button
                        className="px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                        onClick={() => setRangePickerOpen(false)}
                      >
                        Đóng
                      </button>
                      <button
                        className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                        onClick={() => setRangePickerOpen(false)}
                      >
                        Áp Dụng
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleExportToExcel}
              disabled={exportDisabled}
              className={`px-5 py-3 rounded-2xl bg-gray-900 text-white text-sm font-semibold transition-colors shadow-sm ${
                exportDisabled
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:bg-gray-700"
              }`}
            >
              Tải Về
            </button>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col sm:flex-row gap-3">
          {CATEGORY_OPTIONS.map((option) => {
            const isActive = categoryFilter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setCategoryFilter(option.value)}
                className={`flex-1 min-w-[180px] text-left rounded-2xl border p-4 transition ${
                  isActive
                    ? "border-blue-500 bg-blue-50/70"
                    : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {option.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {option.description}
                    </p>
                  </div>
                  <span className="text-lg font-semibold text-gray-900">
                    {categoryCounts[option.value]}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mã Đơn
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Người Nhận
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Số Tiền
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nội Dung Chuyển Khoản
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ngày Thanh Toán
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReceipts.map((receipt) => (
                  <tr key={receipt.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                      {receipt.orderCode || "--"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {receipt.sender || "--"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      {formatCurrencyVnd(receipt.amount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 max-w-xs">
                      <span className="block truncate">
                        {receipt.note || "--"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {receipt.paidAt
                        ? Helpers.formatDateToDMY(receipt.paidAt)
                        : "--"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && filteredReceipts.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">
                Không Có Biên Nhận
              </div>
              <div className="text-gray-500">Thử từ khóa khác</div>
            </div>
          )}
          {loading && (
            <div className="text-center py-8 text-gray-500 text-sm">
              Đang tải dữ liệu...
            </div>
          )}
        </div>

        {viewModalOpen && selectedReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Chi tiết biên nhận
                </h2>
                <button
                  onClick={closeViewModal}
                  className="text-gray-400 hover:text-gray-600 transition rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Đóng"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="px-5 py-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 mb-1">Mã Đơn</p>
                    <p className="font-semibold text-gray-900">
                      {selectedReceipt.orderCode || "--"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Ngày Thanh Toán</p>
                    <p className="font-semibold text-gray-900">
                      {selectedReceipt.paidAt
                        ? Helpers.formatDateToDMY(selectedReceipt.paidAt)
                        : "--"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Người Gửi</p>
                    <p className="font-semibold text-gray-900">
                      {selectedReceipt.sender || "--"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Số Tiền</p>
                    <p className="font-semibold text-gray-900">
                      {formatCurrencyVnd(selectedReceipt.amount)}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-gray-500 mb-1 text-sm">
                    Nội Dung Chuyển Khoản
                  </p>
                  <div className="p-3 rounded-lg border border-gray-200 text-sm text-gray-800 bg-gray-50 min-h-[80px]">
                    {selectedReceipt.note || "Không có ghi chú"}
                  </div>
                </div>
              </div>
              <div className="px-5 py-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={closeViewModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
