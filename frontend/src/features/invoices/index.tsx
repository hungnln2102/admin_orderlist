import { useEffect, useMemo, useRef, useState } from "react";
import { showAppNotification } from "@/lib/notifications";
import { useDefaultShopBankAccount } from "@/features/shop-bank-accounts/hooks/useDefaultShopBankAccount";
import { toShopBankDisplay } from "@/features/shop-bank-accounts/helpers/shopBankQrDefaults";
import {
  MatchableOrder,
  PaymentReceipt,
  ReceiptCategory,
  buildExportWorksheet,
  toDisplayDate,
  toISODate,
} from "./helpers";
import { StatsGrid } from "./components/StatsGrid";
import { FiltersBar } from "./components/FiltersBar";
import { CategoryToggle } from "./components/CategoryToggle";
import { ReceiptsTable } from "./components/ReceiptsTable";
import { OffFlowReceiptsPanel } from "./components/OffFlowReceiptsPanel";
import { QrModal } from "./components/QrModal";
import { ReceiptDetailModal } from "./components/ReceiptDetailModal";
import { InvoicesPagination } from "./components/InvoicesPagination";
import { useInvoicesPagination } from "./hooks/useInvoicesPagination";
import { useInvoiceReceipts } from "./hooks/useInvoiceReceipts";
import { useInvoiceDerivations } from "./hooks/useInvoiceDerivations";

export default function Invoices() {
  const { config: shopBankConfig } = useDefaultShopBankAccount();
  const shopBank = useMemo(() => toShopBankDisplay(shopBankConfig), [shopBankConfig]);

  const [searchTerm, setSearchTerm] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState<ReceiptCategory>("receipt");
  const { receipts, setReceipts, matchableOrders, loading, error, setError } =
    useInvoiceReceipts();
  const [matchingReceiptId, setMatchingReceiptId] = useState<number | null>(null);
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

  const { filteredReceipts, stats, categoryCounts } = useInvoiceDerivations({
    receipts,
    searchTerm,
    dateStart,
    dateEnd,
    categoryFilter,
  });

  const {
    activePage,
    totalPages,
    paginationItems,
    pagedItems: pagedReceipts,
    setActivePage,
  } = useInvoicesPagination({
    items: filteredReceipts,
    pageSize: PAGE_SIZE,
    receiptPage,
    outOfFlowPage,
    activeCategory: categoryFilter,
    setReceiptPage,
    setOutOfFlowPage,
  });

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

        {categoryFilter === "out-of-flow" ? (
          <OffFlowReceiptsPanel
            receipts={pagedReceipts}
            matchableOrders={matchableOrders}
            matchingReceiptId={matchingReceiptId}
            onMatchReceipt={handleMatchReceipt}
            expandedReceiptId={expandedReceiptId}
            onToggle={toggleRowDetails}
            onSelectReceipt={handleSelectReceipt}
            shopBank={shopBank}
          />
        ) : (
          <ReceiptsTable
            receipts={pagedReceipts}
            matchableOrders={matchableOrders}
            matchingReceiptId={matchingReceiptId}
            onMatchReceipt={handleMatchReceipt}
            enableMatching={false}
            enableOrderCodeEdit={true}
            expandedReceiptId={expandedReceiptId}
            onToggle={toggleRowDetails}
            onSelectReceipt={handleSelectReceipt}
            showOrderCode={true}
            shopBank={shopBank}
          />
        )}

        <InvoicesPagination
          activePage={activePage}
          totalPages={totalPages}
          totalItems={filteredReceipts.length}
          paginationItems={paginationItems}
          onSetPage={setActivePage}
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
