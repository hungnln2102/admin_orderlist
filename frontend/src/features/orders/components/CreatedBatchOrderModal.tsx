import React, { useMemo } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ORDER_FIELDS, type Order } from "@/constants";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { useDefaultShopBankAccount } from "@/features/shop-bank-accounts/hooks/useDefaultShopBankAccount";
import { buildSepayQrUrl } from "@/shared/vietqr";
import { normalizeExactVnd } from "@/shared/money";
import { formatCurrency } from "../utils/ordersHelpers";
import { t } from "@/i18n";
import type { CreatedOrderBatchView } from "../hooks/useOrdersModals";

type CreatedBatchOrderModalProps = {
  isOpen: boolean;
  batch: CreatedOrderBatchView | null;
  onClose: () => void;
};

const getOrderCode = (order: Order): string =>
  String(order?.[ORDER_FIELDS.ID_ORDER] || "").trim().toUpperCase();

const getOrderPrice = (order: Order): number =>
  Math.max(0, Number(order?.[ORDER_FIELDS.PRICE]) || 0);

export const CreatedBatchOrderModal: React.FC<CreatedBatchOrderModalProps> = ({
  isOpen,
  batch,
  onClose,
}) => {
  const { config: shopBankConfig } = useDefaultShopBankAccount();

  const qrAmount = normalizeExactVnd(Number(batch?.totalAmount) || 0);
  const qrImageUrl = useMemo(() => {
    if (!batch || !shopBankConfig.accountNumber || !shopBankConfig.bankCode || qrAmount <= 0) {
      return "";
    }
    return buildSepayQrUrl({
      accountNumber: shopBankConfig.accountNumber,
      bankCode: shopBankConfig.bankCode,
      amount: qrAmount,
      description: "",
      accountName: shopBankConfig.accountHolder || undefined,
    });
  }, [batch, qrAmount, shopBankConfig.accountHolder, shopBankConfig.accountNumber, shopBankConfig.bankCode]);

  if (!isOpen || !batch) return null;

  const baseTotal = Math.max(0, Number(batch.baseTotal) || 0);
  const suffix = Number(batch.amountSuffix) || 0;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-2 backdrop-blur-sm sm:p-4 md:p-6"
        onClick={onClose}
      >
        <div
          className="flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-white/10 bg-slate-900/95 text-slate-100 shadow-[0_18px_48px_-28px_rgba(0,0,0,0.8)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="sticky top-0 z-10 flex items-center justify-center border-b border-white/10 bg-slate-800/90 p-4">
            <h3 className="text-lg font-semibold text-white sm:text-xl">
              {t("orders.batch.modal_title")}: <span className="text-blue-500">{batch.batchCode}</span>
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 text-gray-400 transition-colors hover:text-white"
              aria-label={t("common.close")}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="grid gap-4 overflow-y-auto p-4 sm:p-6 lg:grid-cols-[1fr_360px]">
            <section className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm uppercase tracking-wide text-slate-400">{t("orders.batch.order_list")}</p>
                  <p className="text-xl font-semibold text-white">{t("orders.batch.count_in_batch", { count: batch.orders.length })}</p>
                </div>
                <div className="rounded-full border border-emerald-400/40 px-3 py-1 text-sm font-semibold text-emerald-300">
                  {t("orders.batch.qr_badge")}
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-white/10">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-800/80 text-xs uppercase tracking-wide text-slate-300">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">{t("orders.batch.column_order_code")}</th>
                      <th className="px-3 py-2">{t("orders.batch.column_product")}</th>
                      <th className="px-3 py-2 text-right">{t("orders.batch.column_amount")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {batch.orders.map((order, index) => (
                      <tr key={`${getOrderCode(order)}-${index}`} className="bg-slate-900/40">
                        <td className="px-3 py-2 text-slate-400">{index + 1}</td>
                        <td className="px-3 py-2 font-mono font-semibold text-blue-300">{getOrderCode(order)}</td>
                        <td className="px-3 py-2 text-slate-200">
                          {String(order?.[ORDER_FIELDS.ID_PRODUCT] || "-")}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-slate-100">
                          {formatCurrency(getOrderPrice(order))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div className="rounded-lg border border-white/10 bg-slate-900/60 p-3">
                  <p className="text-slate-400">{t("orders.batch.total_price")}</p>
                  <p className="font-semibold text-white">{formatCurrency(batch.totalPrice)}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-slate-900/60 p-3">
                  <p className="text-slate-400">{t("orders.batch.total_before_suffix")}</p>
                  <p className="font-semibold text-white">{formatCurrency(baseTotal || batch.totalPrice)}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-slate-900/60 p-3">
                  <p className="text-slate-400">{t("orders.batch.suffix")}</p>
                  <p className="font-semibold text-white">{suffix > 0 ? `+${suffix}` : "-"}</p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-emerald-400/40 bg-slate-950/50 p-4 text-center">
              <p className="mb-2 text-sm uppercase tracking-wide text-emerald-300">{t("orders.batch.qr_title")}</p>
              <p className="mb-3 font-mono text-lg font-semibold text-blue-300">{batch.batchCode}</p>
              {qrImageUrl ? (
                <img
                  src={qrImageUrl}
                  alt={`QR gộp ${batch.batchCode}`}
                  className="mx-auto w-full max-w-[300px] rounded-lg bg-white p-2 shadow-lg"
                />
              ) : (
                <div className="flex min-h-[260px] items-center justify-center rounded-lg border border-dashed border-white/20 text-sm text-slate-400">
                  {t("orders.batch.missing_bank")}
                </div>
              )}
              <div className="mt-4 space-y-1 text-sm text-slate-300">
                <p>{t("orders.batch.bank")}: <span className="font-semibold text-white">{shopBankConfig.bankDisplayName || shopBankConfig.bankCode || "-"}</span></p>
                <p>{t("orders.batch.account_number")}: <span className="font-mono font-semibold text-white">{shopBankConfig.accountNumber || "-"}</span></p>
                <p>{t("orders.batch.account_holder")}: <span className="font-semibold text-white">{shopBankConfig.accountHolder || "-"}</span></p>
                <p className="pt-2 text-lg font-bold text-red-300">{t("orders.batch.column_amount")}: {formatCurrency(qrAmount)}</p>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {t("orders.batch.qr_note")}
              </p>
            </section>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
