import { formatCurrency } from "@/shared/money";
import type { ShopBankAccountItem } from "@/features/shop-bank-accounts/types";

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
  qrTransferAmount: number | null;
  shopBankAccounts: ShopBankAccountItem[];
  selectedShopBankAccount: ShopBankAccountItem | null;
  shopBankAccountsLoading: boolean;
  amountDueForPayment: (payment: UnpaidPayment) => number;
  onSelectPayment: (paymentId: number) => void;
  onConfirmPayment: (payment: UnpaidPayment) => void;
  onShopBankAccountChange: (accountId: number) => void;
};

const formatShopBankAccountOption = (item: ShopBankAccountItem) => {
  const bankLabel = item.bankShortCode || item.bankBin || item.bankDisplayName;
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
  qrTransferAmount,
  shopBankAccounts,
  selectedShopBankAccount,
  shopBankAccountsLoading,
  amountDueForPayment,
  onSelectPayment,
  onConfirmPayment,
  onShopBankAccountChange,
}: Props) {
  return (
    <div className="rounded-2xl bg-slate-900/60 border border-white/10 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.3)] h-full flex flex-col">
      <div className="flex flex-col mb-4 border-b border-white/5 pb-3">
        <h3 className="text-[13px] font-bold uppercase tracking-widest text-indigo-200 mb-1">Chu kỳ chưa thanh toán</h3>
        <span className="text-xs font-medium text-white/50">
          Cần chi <span className="text-amber-400 font-bold">{formatCurrency(totalUnpaid)}</span> | Hoàn về shop{" "}
          <span className="text-emerald-400 font-bold">{formatCurrency(totalSupplierRefund)}</span>
        </span>
      </div>
      {unpaidPayments.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-500 text-xs font-medium tracking-wide">Không có chu kỳ nợ.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2 max-h-36 overflow-y-auto custom-scroll pr-1 mb-4">
            {unpaidPayments.map((payment) => {
              const raw = Number(payment.totalImport ?? payment.import_value ?? 0);
              const display = amountDueForPayment(payment);
              const isSelected = selectedPayment?.id === payment.id;
              return (
                <div
                  key={payment.id}
                  onClick={() => onSelectPayment(payment.id)}
                  className={`w-full flex items-center justify-between rounded-xl px-4 py-3 border transition-all duration-300 cursor-pointer ${isSelected
                      ? "border-indigo-500/50 bg-indigo-500/15 shadow-[inset_0_0_15px_rgba(99,102,241,0.15)]"
                      : "border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10"
                    }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className={`font-bold text-[13px] truncate ${isSelected ? "text-indigo-100" : "text-white/90"}`}>
                      {payment.round || "Chu kỳ"}
                    </p>
                    <p className={`text-[10px] mt-0.5 uppercase tracking-wider font-bold ${isSelected ? "text-indigo-300/80" : "text-white/40"}`}>{payment.status}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p
                      className={
                        raw < 0
                          ? "text-emerald-400 font-bold text-sm tracking-wide"
                          : "text-amber-400 font-bold text-sm tracking-wide"
                      }
                    >
                      {formatCurrency(display)}
                      {raw < 0 ? " (Hoàn về bạn)" : ""}
                    </p>
                    <p className="text-white/40 text-[10px] uppercase font-bold tracking-wider mt-0.5">
                      Đã trả: <span className="text-white/70">{formatCurrency(payment.paid || 0)}</span>
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
                    <div className="text-[11px] text-white/55 text-center">
                      <p>
                        Ảnh VietQR đã kèm thông tin tài khoản và số tiền
                        {qrTransferAmount != null ? `: ${formatCurrency(qrTransferAmount)}` : ""}.
                      </p>
                      {qrTransferAmount != null &&
                        qrTransferAmount !== amountDueForPayment(selectedPayment) &&
                        Number(selectedPayment.totalImport ?? selectedPayment.import_value ?? 0) > 0 ? (
                        <p className="mt-0.5 text-amber-300/80">
                          QR đã trừ mã nhận diện NCC để tự động khớp giao dịch.
                        </p>
                      ) : null}
                    </div>
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
