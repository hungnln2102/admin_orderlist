import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { STAT_CARD_ACCENTS } from "@/components/ui/StatCard";
import { apiFetch } from "@/shared/api/client";
import { showAppNotification } from "@/lib/notifications";
import * as Helpers from "@/shared/utils";
import { useDefaultShopBankAccount } from "@/features/shop-bank-accounts/hooks/useDefaultShopBankAccount";
import { toShopBankDisplay } from "@/features/shop-bank-accounts/helpers/shopBankQrDefaults";
import {
  MatchableOrder,
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
  const { config: shopBankConfig } = useDefaultShopBankAccount();
  const shopBank = useMemo(() => toShopBankDisplay(shopBankConfig), [shopBankConfig]);

  const [searchTerm, setSearchTerm] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState<ReceiptCategory>("receipt");
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [matchableOrders, setMatchableOrders] = useState<MatchableOrder[]>([]);
  const [matchingReceiptId, setMatchingReceiptId] = useState<number | null>(null);
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
  const [receiptPage, setReceiptPage] = useState(1);
  const [outOfFlowPage, setOutOfFlowPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    const fetchReceipts = async () => {
      try {
        setLoading(true);
        setError(null);
        const [receiptsResponse, ordersResponse] = await Promise.all([
          apiFetch("/api/payment-receipts"),
          apiFetch("/api/payment-receipts/matchable-orders?limit=500"),
        ]);
        if (!receiptsResponse.ok) {
          throw new Error("Không thể tải biên nhận.");
        }
        const data = await receiptsResponse.json();
        const rawList = Array.isArray(data?.receipts)
          ? data.receipts
          : Array.isArray(data)
          ? data
          : [];
        setReceipts(rawList.map(normalizeReceiptRow));
        if (ordersResponse.ok) {
          const ordersData = await ordersResponse.json();
          const ordersRaw = Array.isArray(ordersData?.orders)
            ? ordersData.orders
            : Array.isArray(ordersData)
            ? ordersData
            : [];
          const normalizedOrders = ordersRaw
            .map((item: Partial<MatchableOrder>) => ({
              id: Number(item?.id) || 0,
              orderCode: String(item?.orderCode || "").trim().toUpperCase(),
              transaction: String(item?.transaction || "").trim().toUpperCase(),
              status: String(item?.status || ""),
              customer: String(item?.customer || ""),
              informationOrder: String(item?.informationOrder || ""),
            }))
            .filter((item: MatchableOrder) => item.orderCode);
          setMatchableOrders(normalizedOrders);
        } else {
          setMatchableOrders([]);
        }
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
      const recordCategory = determineReceiptCategory(item);
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
    const mavFlowReceipts = receipts.filter(
      (item) => determineReceiptCategory(item) === "receipt"
    );
    const totalAmount = mavFlowReceipts.reduce((sum, item) => sum + item.amount, 0);
    let latestPaidAt = "";
    for (const item of mavFlowReceipts) {
      const t = item.paidAt ?? "";
      if (t && (!latestPaidAt || t > latestPaidAt)) latestPaidAt = t;
    }

    return [
      {
        name: "Tổng Biên Nhận",
        value: mavFlowReceipts.length.toString(),
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
        const category = determineReceiptCategory(item);
        acc[category] += 1;
        return acc;
      },
      { receipt: 0, "out-of-flow": 0 } as Record<ReceiptCategory, number>
    );
  }, [receipts]);

  const activePage = categoryFilter === "receipt" ? receiptPage : outOfFlowPage;
  const totalPages = Math.max(1, Math.ceil(filteredReceipts.length / PAGE_SIZE));
  const paginationItems = useMemo<(number | "ellipsis")[]>(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const clamp = (value: number, min: number, max: number) =>
      Math.min(Math.max(value, min), max);
    const startPage = clamp(activePage - 1, 2, totalPages - 3);
    const endPage = clamp(activePage + 1, 4, totalPages - 1);
    const pages: (number | "ellipsis")[] = [1];

    if (startPage > 2) pages.push("ellipsis");
    for (let page = startPage; page <= endPage; page += 1) {
      pages.push(page);
    }
    if (endPage < totalPages - 1) pages.push("ellipsis");
    pages.push(totalPages);

    return pages;
  }, [activePage, totalPages]);
  const pagedReceipts = filteredReceipts.slice(
    (activePage - 1) * PAGE_SIZE,
    activePage * PAGE_SIZE
  );
  const setActivePage = (updater: (current: number) => number) => {
    if (categoryFilter === "receipt") {
      setReceiptPage(updater);
      return;
    }
    setOutOfFlowPage(updater);
  };

  useEffect(() => {
    setReceiptPage(1);
    setOutOfFlowPage(1);
  }, [searchTerm, dateStart, dateEnd]);

  const handleExportToExcel = async () => {
    if (!filteredReceipts.length) return;
    const xlsx = await import("xlsx");
    const worksheet = buildExportWorksheet(filteredReceipts, xlsx.utils);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Biên nhận thanh toán");
    const isoDate = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    xlsx.writeFile(workbook, `payment_receipts_${isoDate}.xlsx`);
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

  const handleMatchReceipt = async (receiptId: number, orderCode: string) => {
    const rawValue = String(orderCode || "").trim().toUpperCase();
    const extractedOrderCode = rawValue.match(/MAV[A-Z0-9]{3,20}/)?.[0] || "";
    const normalizedOrderCode = extractedOrderCode || rawValue;
    if (!normalizedOrderCode) {
      throw new Error("Mã đơn hàng không hợp lệ.");
    }

    setMatchingReceiptId(receiptId);
    setError(null);
    try {
      const response = await apiFetch(`/api/payment-receipts/${receiptId}/reconcile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderCode: normalizedOrderCode }),
      });
      if (!response.ok) {
        let message = "Không thể ghép mã đơn cho biên lai.";
        try {
          const body = await response.json();
          message = body?.error || message;
        } catch {}
        throw new Error(message);
      }

      const reconcileBody = (await response.json()) as {
        paidAmountCoversOrder?: boolean;
        orderSellingPriceVnd?: number;
        totalReceiptsForOrderVnd?: number;
      };
      if (reconcileBody.paidAmountCoversOrder === false) {
        const so = formatCurrencyVndFull(
          Math.max(0, Number(reconcileBody.totalReceiptsForOrderVnd) || 0)
        );
        const gia = formatCurrencyVndFull(
          Math.max(0, Number(reconcileBody.orderSellingPriceVnd) || 0)
        );
        showAppNotification({
          type: "info",
          title: "Đã gắn mã, chưa đủ so với giá bán",
          message: `Tổng biên lai ${so} — giá bán ${gia}. Đơn vẫn ở trạng thái Chưa Thanh Toán; ghi thêm biên khi còn thiếu tiền.`,
        });
      }

      setReceipts((current) =>
        current.map((item) =>
          item.id === receiptId ? { ...item, orderCode: normalizedOrderCode } : item
        )
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không thể ghép mã đơn cho biên lai.";
      setError(message);
      throw err instanceof Error ? err : new Error(message);
    } finally {
      setMatchingReceiptId(null);
    }
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
        matchableOrders={matchableOrders}
        shopBank={shopBank}
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
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tighter">
            Biên Nhận <span className="text-indigo-400">Thanh Toán</span>
          </h1>
          <p className="text-sm font-medium text-indigo-200/60 uppercase tracking-[0.3em]">
            Digital Transaction Records & Ledger
          </p>
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
          onAddReceipt={() => setIsQrModalOpen(true)}
        />

        {error && <div className="text-sm text-red-600 px-1">{error}</div>}

        <CategoryToggle
          activeCategory={categoryFilter}
          counts={categoryCounts}
          onChange={(category) => {
            setCategoryFilter(category);
            if (category === "receipt") {
              setReceiptPage(1);
            } else {
              setOutOfFlowPage(1);
            }
          }}
        />

        <ReceiptsTable
          receipts={pagedReceipts}
          matchableOrders={matchableOrders}
          matchingReceiptId={matchingReceiptId}
          onMatchReceipt={handleMatchReceipt}
          enableMatching={categoryFilter === "out-of-flow"}
          enableOrderCodeEdit={categoryFilter === "receipt"}
          expandedReceiptId={expandedReceiptId}
          onToggle={toggleRowDetails}
          onSelectReceipt={handleSelectReceipt}
          showOrderCode={categoryFilter !== "out-of-flow"}
          shopBank={shopBank}
        />

        <div className="flex flex-col gap-3 px-1 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <div>
            Trang {activePage}/{totalPages} ? {filteredReceipts.length} dòng
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              className="h-10 min-w-10 rounded-lg border border-white/10 bg-white/5 px-3 font-bold text-indigo-100/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
              disabled={activePage <= 1}
              onClick={() => setActivePage(() => 1)}
            >
              &lt;&lt;
            </button>
            <button
              type="button"
              className="h-10 min-w-10 rounded-lg border border-white/10 bg-white/5 px-3 font-bold text-indigo-100/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
              disabled={activePage <= 1}
              onClick={() => setActivePage((current) => Math.max(1, current - 1))}
            >
              &lt;
            </button>
            {paginationItems.map((item, index) =>
              item === "ellipsis" ? (
                <span
                  key={`ellipsis-${index}`}
                  className="flex h-10 min-w-7 items-center justify-center font-black text-indigo-100/60"
                >
                  ...
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  className={`h-10 min-w-10 rounded-lg border px-3 text-sm font-black transition ${
                    item === activePage
                      ? "border-blue-400/40 bg-blue-600 text-white shadow-[0_0_24px_rgba(37,99,235,0.35)]"
                      : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                  }`}
                  onClick={() => setActivePage(() => item)}
                >
                  {item}
                </button>
              )
            )}
            <button
              type="button"
              className="h-10 min-w-10 rounded-lg border border-white/10 bg-white/5 px-3 font-bold text-indigo-100/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
              disabled={activePage >= totalPages}
              onClick={() => setActivePage((current) => Math.min(totalPages, current + 1))}
            >
              &gt;
            </button>
            <button
              type="button"
              className="h-10 min-w-10 rounded-lg border border-white/10 bg-white/5 px-3 font-bold text-indigo-100/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
              disabled={activePage >= totalPages}
              onClick={() => setActivePage(() => totalPages)}
            >
              &gt;&gt;
            </button>
          </div>
        </div>

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
