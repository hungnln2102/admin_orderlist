import { buildSepayQrUrl } from "@/shared/vietqr";
import React, { useEffect, useMemo, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { BankOption } from "../types";
import { useSupplyDetail } from "../hooks/useSupplyDetail";
import { usePayments } from "../hooks/usePayments";
import { useDefaultShopBankAccount } from "@/features/shop-bank-accounts/hooks/useDefaultShopBankAccount";
import { fetchShopBankAccounts } from "@/features/shop-bank-accounts/api/shopBankAccountApi";
import type { ShopBankAccountItem } from "@/features/shop-bank-accounts/types";
import { SupplierSettlementPanel } from "./SupplierSettlementPanel";
import { SupplierMonthlyOrdersPanel } from "./SupplierMonthlyOrdersPanel";
import { SupplierOverviewCards } from "./SupplierOverviewCards";
import { encodeSupplierSignature } from "../utils/supplierPaymentSignature";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  supplyId: number | null;
  banks?: BankOption[];
  onRefreshList?: () => void;
}

type UnpaidPayment = {
  id: number;
  totalImport?: number;
  import_value?: number;
  paid?: number;
  round?: string;
  status?: string;
};

const SupplierDetailModal: React.FC<Props> = ({ isOpen, onClose, supplyId, banks = [], onRefreshList }) => {
  const { config: shopBank } = useDefaultShopBankAccount();
  const { overview, loading, error, fetchOverview, setError } = useSupplyDetail(supplyId, isOpen);
  const { confirmingId, confirmPayment } = usePayments({
    supply: overview?.supply,
    fetchOverview,
    onRefreshList,
  });
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);
  const [shopBankAccounts, setShopBankAccounts] = useState<ShopBankAccountItem[]>([]);
  const [selectedShopBankAccountId, setSelectedShopBankAccountId] = useState<number>(0);
  const [shopBankAccountsLoading, setShopBankAccountsLoading] = useState(false);

  // Tính toán các giá trị từ overview (phải đặt trước useMemo)
  const supply = overview?.supply;
  const stats = overview?.stats;
  const unpaidPayments: UnpaidPayment[] = overview?.unpaidPayments || [];
  const logOrdersByMonth: Array<{
    month: number;
    orders: Array<{
      orderListId: number;
      idOrder: string;
      importCost: number;
      refundAmount: number;
      nccPaymentStatus: string;
      loggedAt: string;
    }>;
  }> = overview?.logOrdersByMonth || [];
  const selectedPayment = unpaidPayments.find((p) => p.id === selectedPaymentId) || unpaidPayments[0] || null;
  const selectedShopBankAccount =
    shopBankAccounts.find((item) => item.id === selectedShopBankAccountId) ||
    shopBankAccounts.find((item) => item.isDefault && item.isActive) ||
    shopBankAccounts.find((item) => item.isActive) ||
    null;

  useEffect(() => {
    if (!isOpen) return;
    setShopBankAccountsLoading(true);
    void fetchShopBankAccounts()
      .then((items) => {
        const activeItems = items.filter((item) => item.isActive);
        setShopBankAccounts(activeItems);
        const preferred =
          activeItems.find((item) => item.isDefault) || activeItems[0] || null;
        setSelectedShopBankAccountId(preferred?.id ?? 0);
      })
      .catch(() => {
        setShopBankAccounts([]);
        setSelectedShopBankAccountId(0);
      })
      .finally(() => setShopBankAccountsLoading(false));
  }, [isOpen]);

  // useMemo phải được gọi trước conditional return
  // Còn nợ âm = NCC trả mình → QR dùng STK của tôi; số tiền = số dương.
  const qrImageUrl = useMemo(() => {
    if (!supply || !selectedPayment) return null;
    const raw = Number(selectedPayment.totalImport ?? selectedPayment.import_value ?? 0);
    const paid = Number(selectedPayment.paid ?? 0);
    const isNegative = raw < 0;
    let amount = isNegative ? Math.abs(raw) : Math.max(0, raw - paid);
    if (amount <= 0) return null;
    
    if (!isNegative && supply.id) {
      amount = encodeSupplierSignature(amount, supply.id);
    }

    if (isNegative) {
      return buildSepayQrUrl({
        accountNumber: selectedShopBankAccount?.accountNumber || shopBank.accountNumber,
        bankCode:
          selectedShopBankAccount?.bankShortCode ||
          selectedShopBankAccount?.bankBin ||
          shopBank.bankCode,
        amount,
        accountName: selectedShopBankAccount?.accountHolder || shopBank.accountHolder,
      });
    }
    if (!supply.numberBank || !supply.binBank) return null;
    return buildSepayQrUrl({
      accountNumber: supply.numberBank,
      bankCode: supply.binBank,
      amount,
      accountName: supply.nameBank || supply.sourceName || "",
    });
  }, [supply, selectedPayment, shopBank, selectedShopBankAccount]);

  const amountDueForPayment = (p: { totalImport?: number; import_value?: number; paid?: number }) => {
    const raw = Number(p.totalImport ?? p.import_value ?? 0);
    const paid = Number(p.paid ?? 0);
    if (raw < 0) return Math.max(0, Math.abs(raw) - paid);
    return Math.max(0, raw - paid);
  };

  const handleConfirmPayment = async (p: {
    id: number;
    totalImport?: number;
    import_value?: number;
    paid?: number;
  }) => {
    if (p.id == null || !Number.isFinite(Number(p.id))) return;
    if (!selectedShopBankAccount?.id) {
      setError("Vui lòng chọn STK shop để ghi nhận thanh toán NCC.");
      return;
    }
    const result = await confirmPayment(p.id, {
      paidAmount: amountDueForPayment(p),
      supplyId: supply?.id,
      shopBankAccountId: selectedShopBankAccount.id,
    });
    if (!result.success) {
      setError(result.error || "Không thể thanh toán chu kỳ");
    }
  };

  const handleClose = () => {
    setSelectedPaymentId(null);
    setExpandedMonth(null);
    onClose();
  };

  // Early return sau khi tất cả hooks đã được gọi
  if (!isOpen || !supplyId) return null;

  const totals = unpaidPayments.reduce(
    (acc, p) => {
      const raw = Number(p.totalImport ?? p.import_value ?? 0);
      const due = amountDueForPayment(p);
      if (raw < 0) {
        acc.supplierRefundToShop += due;
      } else {
        acc.payableToSupplier += due;
      }
      return acc;
    },
    { payableToSupplier: 0, supplierRefundToShop: 0 }
  );
  const totalUnpaid = totals.payableToSupplier;
  const totalSupplierRefund = totals.supplierRefundToShop;
  const monthlyLogOrders = logOrdersByMonth
    .map((item) => ({
      month: Number(item.month) || 0,
      orders: Array.isArray(item.orders) ? item.orders.length : 0,
    }))
    .filter((item) => item.month > 0)
    .sort((a, b) => a.month - b.month);
  const logOrdersByMonthMap = new Map<number, Array<{
    orderListId: number;
    idOrder: string;
    importCost: number;
    refundAmount: number;
    nccPaymentStatus: string;
    loggedAt: string;
  }>>(
    logOrdersByMonth.map((item) => [item.month, item.orders || []])
  );
  const statusLabel = supply?.isActive ? "Đang hoạt động" : "Tạm dừng";
  const bankNameResolved =
    supply?.bankName ||
    banks.find((b) => (b.bin || "").trim() === (supply?.binBank || "").trim())?.name ||
    supply?.binBank ||
    "--";
  const statCards = [
    { label: "Tổng đơn", value: stats?.totalOrders ?? 0 },
    { label: "Đã thanh toán", value: stats?.paidOrders ?? 0 },
    { label: "Chưa thanh toán", value: stats?.unpaidOrders ?? 0 },
    { label: "Đã hủy", value: stats?.canceledOrders ?? 0 },
  ];

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-2" onClick={handleClose}>
        <div
          className="glass-panel-dark border border-white/5 p-5 md:p-6 rounded-[32px] text-white w-full max-w-4xl max-h-[95vh] shadow-2xl overflow-y-auto custom-scroll"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1" />
            <h2 className="text-xl font-bold text-center">Chi tiết Nhà Cung Cấp</h2>
            <div className="flex-1 flex justify-end">
              <button onClick={handleClose} className="p-2 rounded-full hover:bg-white/10 transition text-white/70" aria-label="Đóng">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 text-center text-white/70">Đang tải chi tiết...</div>
          ) : error ? (
            <div className="mt-6 bg-rose-500/10 text-rose-200 border border-rose-500/40 rounded-xl p-4 flex items-center justify-between gap-3">
              <span>{error}</span>
              <button onClick={fetchOverview} className="px-3 py-1 rounded-lg bg-rose-500 text-white text-sm hover:bg-rose-600">
                Thử lại
              </button>
            </div>
          ) : (
            <>
              <SupplierOverviewCards
                supply={supply}
                stats={stats}
                bankName={bankNameResolved}
                statusLabel={statusLabel}
                totalUnpaid={totalUnpaid}
                totalSupplierRefund={totalSupplierRefund}
              />

              <div className="grid md:grid-cols-2 gap-3 mt-3 items-start">
                <SupplierSettlementPanel
                  unpaidPayments={unpaidPayments}
                  selectedPayment={selectedPayment}
                  totalUnpaid={totalUnpaid}
                  totalSupplierRefund={totalSupplierRefund}
                  confirmingId={confirmingId}
                  qrImageUrl={qrImageUrl}
                  shopBankAccounts={shopBankAccounts}
                  selectedShopBankAccount={selectedShopBankAccount}
                  shopBankAccountsLoading={shopBankAccountsLoading}
                  amountDueForPayment={amountDueForPayment}
                  onSelectPayment={setSelectedPaymentId}
                  onConfirmPayment={(payment) => void handleConfirmPayment(payment)}
                  onShopBankAccountChange={setSelectedShopBankAccountId}
                />

                {/* Đơn theo tháng */}
                <SupplierMonthlyOrdersPanel
                  monthlyLogOrders={monthlyLogOrders}
                  logOrdersByMonthMap={logOrdersByMonthMap}
                  expandedMonth={expandedMonth}
                  onToggleMonth={(month) =>
                    setExpandedMonth((prev) => (prev === month ? null : month))
                  }
                />
              </div>

              <div className="mt-4 text-right">
                <button onClick={handleClose} className="px-10 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold transition-all active:scale-95">
                  Đóng
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </ModalPortal>
  );
};

export default SupplierDetailModal;
