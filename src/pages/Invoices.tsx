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
import * as Helpers from "../lib/helpers";
import { apiFetch } from "../lib/api";

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

const CATEGORY_OPTIONS: {
  value: ReceiptCategory;
  label: string;
  description: string;
}[] = [
  {
    value: "receipt",
    label: "Receipt",
    description: "Order code starts with MAV",
  },
  {
    value: "refund",
    label: "Refund",
    description: "Other incoming transfers",
  },
];

export default function Invoices() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ReceiptCategory>(
    "receipt"
  );
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentReceipt | null>(
    null
  );
  const [rangePickerOpen, setRangePickerOpen] = useState(false);
  const dateRangeRef = useRef<HTMLDivElement | null>(null);

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

    const determineCategory = (orderCode: string | null | undefined) => {
      const normalized = (orderCode || "").toUpperCase().trim();
      if (!normalized) return "refund";
      return normalized.startsWith("MAV") ? "receipt" : "refund";
    };

    return receipts.filter((item) => {
      const recordCategory = determineCategory(item.orderCode);
      const matchesSearch =
        !normalized ||
        [item.orderCode, item.note, item.sender]
          .map((value) => value?.toLowerCase() ?? "")
          .some((value) => value.includes(normalized));

      const paidTimestamp = parseDate(
        Helpers.formatDateToDMY(item.paidAt) || ""
      );

      const withinStart =
        startTime === null || paidTimestamp === null || paidTimestamp >= startTime;
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
    const uniqueSenders = new Set(receipts.map((item) => item.sender)).size;
    const latestPaidAt = receipts.length > 0 ? receipts[0].paidAt ?? "" : "";

    return [
      {
        name: "Total receipts",
        value: receipts.length.toString(),
        icon: CheckCircleIcon,
        color: "bg-blue-500",
      },
      {
        name: "Total amount",
        value: Helpers.formatCurrencyShort(totalAmount),
        icon: CheckCircleIcon,
        color: "bg-green-500",
      },
      {
        name: "Unique senders",
        value: uniqueSenders.toString(),
        icon: ClockIcon,
        color: "bg-yellow-500",
      },
      {
        name: "Latest payment",
        value: latestPaidAt
          ? Helpers.formatDateToDMY(latestPaidAt) ?? "--"
          : "--",
        icon: XCircleIcon,
        color: "bg-purple-500",
      },
    ];
  }, [receipts]);

  const categoryCounts = useMemo(() => {
    return receipts.reduce(
      (acc, item) => {
        const code = (item.orderCode || "").toUpperCase();
        if (code.startsWith("MAV")) {
          acc.receipt += 1;
        } else {
          acc.refund += 1;
        }
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
          throw new Error("Unable to load payment receipts.");
        }
        const data = await response.json();
        setReceipts(Array.isArray(data.receipts) ? data.receipts : []);
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error ? err.message : "Unable to load payment receipts."
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment receipts</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track incoming transfers recorded in the database
          </p>
        </div>
        <button className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition">
          <PlusIcon className="w-4 h-4 mr-2" />
          Add receipt
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-xl shadow-sm p-4 flex items-center">
            <div className={`${stat.color} text-white p-3 rounded-lg mr-4`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{stat.name}</p>
              <p className="text-xl font-semibold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search order code, sender or note..."
              className="w-full pl-12 pr-4 py-3 border border-gray-200 bg-gray-50/60 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <div
            className="relative flex items-stretch"
            ref={dateRangeRef}
          >
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
                  Date range
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
                      From
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
                      To
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
                    Clear range
                  </button>
                  <div className="flex gap-2">
                    <button
                      className="px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                      onClick={() => setRangePickerOpen(false)}
                    >
                      Close
                    </button>
                    <button
                      className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                      onClick={() => setRangePickerOpen(false)}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button className="px-5 py-3 rounded-2xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors shadow-sm">
            Export list
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
                  Order code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sender
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transfer note
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paid date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
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
                    <span className="block truncate">{receipt.note || "--"}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {receipt.paidAt ? Helpers.formatDateToDMY(receipt.paidAt) : "--"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex space-x-2 justify-end">
                      <button
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="View invoice"
                        onClick={() => handleViewReceipt(receipt)}
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button className="text-green-600 hover:text-green-900 p-1 rounded" title="Print invoice">
                        <PrinterIcon className="h-4 w-4" />
                      </button>
                      <button className="text-purple-600 hover:text-purple-900 p-1 rounded" title="Download">
                        <ArrowDownTrayIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && filteredReceipts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-2">No receipts found</div>
            <div className="text-gray-500">Try another keyword</div>
          </div>
        )}
        {loading && (
          <div className="text-center py-8 text-gray-500 text-sm">
            Loading data...
          </div>
        )}
      </div>

      {viewModalOpen && selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Receipt detail
              </h2>
              <button
                onClick={closeViewModal}
                className="text-gray-400 hover:text-gray-600 transition rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Close"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">Order code</p>
                  <p className="font-semibold text-gray-900">
                    {selectedReceipt.orderCode || "--"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Paid date</p>
                  <p className="font-semibold text-gray-900">
                    {selectedReceipt.paidAt
                      ? Helpers.formatDateToDMY(selectedReceipt.paidAt)
                      : "--"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Sender</p>
                  <p className="font-semibold text-gray-900">
                    {selectedReceipt.sender || "--"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Amount</p>
                  <p className="font-semibold text-gray-900">
                    {formatCurrencyVnd(selectedReceipt.amount)}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-gray-500 mb-1 text-sm">
                  Transfer note
                </p>
                <div className="p-3 rounded-lg border border-gray-200 text-sm text-gray-800 bg-gray-50 min-h-[80px]">
                  {selectedReceipt.note || "No note"}
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={closeViewModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
