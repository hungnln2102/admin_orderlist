import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircleIcon, PlusIcon, XCircleIcon } from "@heroicons/react/24/outline";
import GradientButton from "../../../components/ui/GradientButton";
import { STAT_CARD_ACCENTS } from "../../../components/ui/StatCard";
import { apiFetch } from "../../../lib/api";
import * as Helpers from "../../../lib/helpers";
import { utils as XLSXUtils, writeFile as writeXLSXFile } from "xlsx";
import {
  PaymentReceipt,
  ReceiptCategory,
  buildExportWorksheet,
  determineReceiptCategory,
  formatCurrencyVndFull,
  normalizeReceiptRow,
  parseDMYDate,
  resolveSender,
  toDisplayDate,
  toISODate,
} from "./helpers";
import { StatsGrid } from "./components/StatsGrid";
import { FiltersBar } from "./components/FiltersBar";
import { CategoryToggle } from "./components/CategoryToggle";
import { ReceiptsTable } from "./components/ReceiptsTable";
import { QrModal } from "./components/QrModal";
import { ReceiptDetailModal } from "./components/ReceiptDetailModal";

export default function Invoices() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState<ReceiptCategory>("receipt");
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rangePickerOpen, setRangePickerOpen] = useState(false);
  const [expandedReceiptId, setExpandedReceiptId] = useState<number | null>(
    null
  );
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrAmount, setQrAmount] = useState("");
  const [qrNote, setQrNote] = useState("");
  const [selectedReceipt, setSelectedReceipt] =
    useState<PaymentReceipt | null>(null);
  const dateRangeRef = useRef<HTMLDivElement | null>(null);

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
        const rawList = Array.isArray(data?.receipts)
          ? data.receipts
          : Array.isArray(data)
          ? data
          : [];
        setReceipts(rawList.map(normalizeReceiptRow));
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Không thể tải biên nhận.");
      } finally {
        setLoading(false);
      }
    };

    fetchReceipts();
  }, []);

  const filteredReceipts = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    const startTime = parseDMYDate(dateStart);
    const endTime = parseDMYDate(dateEnd);

    return receipts.filter((item) => {
      const recordCategory = determineReceiptCategory(item.orderCode);
      const matchesSearch =
        !normalized ||
        [item.orderCode, item.note, resolveSender(item)]
          .map((value) => value?.toLowerCase() ?? "")
          .some((value) => value.includes(normalized));

      const paidTimestamp = parseDMYDate(
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
        name: "Biên Nhận Gần Nhất",
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

  const handleExportToExcel = () => {
    if (!filteredReceipts.length) return;
    const worksheet = buildExportWorksheet(filteredReceipts);
    const workbook = XLSXUtils.book_new();
    XLSXUtils.book_append_sheet(workbook, worksheet, "Biên nhận thanh toán");
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

  const dateRangeDisplay =
    dateStart && dateEnd
      ? `${dateStart} - ${dateEnd}`
      : "dd/mm/yyyy - dd/mm/yyyy";

  const toggleRowDetails = (receiptId: number) => {
    setExpandedReceiptId((current) =>
      current === receiptId ? null : receiptId
    );
  };

  const handleSelectReceipt = (receipt: PaymentReceipt) => {
    setSelectedReceipt(receipt);
  };

  const closeDetailModal = () => {
    setSelectedReceipt(null);
  };

  return (
    <>
      <QrModal
        open={isQrModalOpen}
        amount={qrAmount}
        note={qrNote}
        onClose={() => setIsQrModalOpen(false)}
        onAmountChange={setQrAmount}
        onNoteChange={setQrNote}
      />

      <ReceiptDetailModal
        open={!!selectedReceipt}
        receipt={selectedReceipt}
        onClose={closeDetailModal}
      />

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white drop-shadow-sm">
              Biên nhận thanh toán
            </h1>
            <p className="mt-1 text-sm text-white/80">
              Theo dõi giao dịch chuyển khoản được lưu trong hệ thống
            </p>
          </div>
          <GradientButton
            icon={PlusIcon}
            className="mt-4 sm:mt-0"
            onClick={() => setIsQrModalOpen(true)}
          >
            Thêm biên nhận
          </GradientButton>
        </div>

        <StatsGrid stats={stats} />

        <FiltersBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          dateStart={dateStart}
          dateEnd={dateEnd}
          dateRangeDisplay={dateRangeDisplay}
          rangePickerOpen={rangePickerOpen}
          setRangePickerOpen={setRangePickerOpen}
          dateRangeRef={dateRangeRef}
          toDisplayDate={toDisplayDate}
          toISODate={toISODate}
          onDateStartChange={setDateStart}
          onDateEndChange={setDateEnd}
          onExport={handleExportToExcel}
          exportDisabled={exportDisabled}
        />

        {error && <div className="text-sm text-red-600 px-1">{error}</div>}

        <CategoryToggle
          activeCategory={categoryFilter}
          counts={categoryCounts}
          onChange={setCategoryFilter}
        />

        <ReceiptsTable
          receipts={filteredReceipts}
          expandedReceiptId={expandedReceiptId}
          onToggle={toggleRowDetails}
          onSelectReceipt={handleSelectReceipt}
        />

        {!loading && filteredReceipts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-white/70 text-lg mb-2">Không có Biên Nhận</div>
            <div className="text-white/60">Thử từ khóa khác</div>
          </div>
        )}
        {loading && (
          <div className="text-center py-8 text-white/60 text-sm">
            Đang tải dữ liệu...
          </div>
        )}
      </div>
    </>
  );
}
