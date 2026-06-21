import type { ShopBankAccountItem } from "@/features/shop-bank-accounts/types";
import * as Helpers from "@/shared/utils";

type UnpaidPayment = {
  id: number;
  totalImport?: number;
  import_value?: number;
  paid?: number;
  round?: string;
  status?: string;
};

type Props = {
  unpaidPayments: UnpaidPayment[];
  selectedPayment: UnpaidPayment | null;
  totalUnpaid: number;
  totalSupplierRefund: number;
  confirmingId: number | null;
  qrImageUrl: string | null;
  shopBankAccounts: ShopBankAccountItem[];
  selectedShopBankAccount: ShopBankAccountItem | null;
  shopBankAccountsLoading: boolean;
  amountDueForPayment: (payment: UnpaidPayment) => number;
  onSelectPayment: (paymentId: number) => void;
  onConfirmPayment: (payment: UnpaidPayment) => void;
  onShopBankAccountChange: (accountId: number) => void;
};

const formatShopBankAccountOption = (item: ShopBankAccountItem) => {
  const bankLabel = item.bankDisplayName || item.bankShortCode || item.bankBin;
  return [item.accountNumber, bankLabel, item.accountHolder]
    .filter(Boolean)
    .join(" · ");
};

export function SupplierSettlementPanel({
  unpaidPayments,
  selectedPayment,
  totalUnpaid,
  totalSupplierRefund,
  confirmingId,
  qrImageUrl,
  shopBankAccounts,
  selectedShopBankAccount,
  shopBankAccountsLoading,
  amountDueForPayment,
  onSelectPayment,
  onConfirmPayment,
  onShopBankAccountChange,
}: Props) {
  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white/80">Chu kỳ chưa thanh toán</h3>
        <span className="text-xs text-white/60">
          Cần chi {Helpers.formatCurrency(totalUnpaid)} | Hoàn về shop{" "}
          {Helpers.formatCurrency(totalSupplierRefund)}
        </span>
      </div>
      {unpaidPayments.length === 0 ? (
        <p className="text-white/50 text-sm">Không có chu kỳ nợ.</p>
      ) : (
        <>
          <div className="space-y-1.5 max-h-28 overflow-y-auto custom-scroll scroll-overlay mb-3">
            {unpaidPayments.map((payment) => {
              const raw = Number(payment.totalImport ?? payment.import_value ?? 0);
              const display = amountDueForPayment(payment);
              const isSelected = selectedPayment?.id === payment.id;
              return (
                <div
                  key={payment.id}
                  onClick={() => onSelectPayment(payment.id)}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2 border transition cursor-pointer ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-500/20"
                      : "border-white/5 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">
                      {payment.round || "Chu kỳ"}
                    </p>
                    <p className="text-xs text-white/60">{payment.status}</p>
                  </div>
                  <div className="text-right text-sm mr-2">
                    <p
                      className={
                        raw < 0
                          ? "text-emerald-400 font-semibold"
                          : "text-rose-400 font-semibold"
                      }
                    >
                      {Helpers.formatCurrency(display)}
                      {raw < 0 ? " (Hoàn về bạn)" : ""}
                    </p>
                    <p className="text-white/40 text-xs">
                      Đã trả: {Helpers.formatCurrency(payment.paid || 0)}
                    </p>
                  </div>
                  <button
                    disabled={confirmingId === payment.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      onConfirmPayment(payment);
                    }}
                    className="px-3 py-1.5 text-xs rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60 font-semibold transition flex-shrink-0"
                  >
                    {confirmingId === payment.id ? "..." : "Thanh toán"}
                  </button>
                </div>
              );
            })}
          </div>

          {selectedPayment ? (
            <div className="mt-2 space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/50">
                  {Number(selectedPayment.totalImport ?? selectedPayment.import_value ?? 0) < 0
                    ? "STK nhận hoàn"
                    : "STK chi trả"}
                </label>
                <select
                  value={selectedShopBankAccount?.id || ""}
                  onChange={(event) =>
                    onShopBankAccountChange(Number(event.target.value) || 0)
                  }
                  disabled={shopBankAccountsLoading || confirmingId === selectedPayment.id}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-emerald-400/40 focus:outline-none"
                >
                  {shopBankAccounts.length === 0 ? (
                    <option value="">Chưa có STK active</option>
                  ) : (
                    shopBankAccounts.map((item) => (
                      <option key={item.id} value={item.id}>
                        {formatShopBankAccountOption(item)}
                        {item.isDefault ? " (mặc định)" : ""}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                {qrImageUrl ? (
                  <>
                    <img src={qrImageUrl} alt="QR" className="w-64 rounded-lg shadow-lg" />
                    <p className="text-[11px] text-white/55 text-center">
                      Ảnh VietQR đã kèm thông tin tài khoản và số tiền.
                    </p>
                  </>
                ) : (
                  <div className="w-64 h-64 bg-white/10 rounded-lg flex items-center justify-center text-xs text-center p-2">
                    {Number(selectedPayment.totalImport ?? selectedPayment.import_value ?? 0) < 0
                      ? "QR Shop chưa sẵn sàng"
                      : "Thiếu thông tin NH NCC"}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
