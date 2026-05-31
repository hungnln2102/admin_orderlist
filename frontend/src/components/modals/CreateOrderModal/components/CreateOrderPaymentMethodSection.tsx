import { useEffect, useMemo, useState } from "react";
import { ORDER_CODE_PREFIXES, ORDER_FIELDS } from "../../../../constants";
import { fetchUsdtExchangeRate } from "@/features/usdt-wallets/api/usdtWalletApi";
import { convertVndToUsd, formatUsdtMoney } from "@/features/usdt-wallets/helpers/formatUsdtMoney";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/features/usdt-wallets/types";
import { panelClass, panelTitleClass } from "../helpers";
import type { CustomerType } from "../types";

type CreateOrderPaymentMethodSectionProps = {
  customerType: CustomerType;
  orderCreationKind: "sales" | "import";
  priceValue: string | number | undefined;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
};

export function CreateOrderPaymentMethodSection({
  customerType,
  orderCreationKind,
  priceValue,
  paymentMethod,
  onPaymentMethodChange,
}: CreateOrderPaymentMethodSectionProps) {
  const [vndPerUsdt, setVndPerUsdt] = useState<number | null>(null);
  const [rateError, setRateError] = useState<string | null>(null);

  const isGift = customerType === ORDER_CODE_PREFIXES.GIFT;
  const showSection = orderCreationKind === "sales" && !isGift;

  useEffect(() => {
    if (!showSection) return;
    let cancelled = false;
    void fetchUsdtExchangeRate()
      .then((rate) => {
        if (cancelled) return;
        setVndPerUsdt(rate.vndPerUsdt > 0 ? rate.vndPerUsdt : null);
        setRateError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setVndPerUsdt(null);
        setRateError(err instanceof Error ? err.message : "Không lấy được tỷ giá Binance.");
      });
    return () => {
      cancelled = true;
    };
  }, [showSection]);

  const priceVnd = useMemo(() => {
    const raw = Number(priceValue);
    return Number.isFinite(raw) ? Math.max(0, raw) : 0;
  }, [priceValue]);

  const usdEquivalent = useMemo(() => {
    if (!vndPerUsdt || priceVnd <= 0) return 0;
    return convertVndToUsd(priceVnd, vndPerUsdt);
  }, [priceVnd, vndPerUsdt]);

  if (!showSection) return null;

  return (
    <section className={`${panelClass} lg:col-span-2`}>
      <div className="mb-4">
        <h4 className={panelTitleClass}>Phương thức thanh toán</h4>
        <p className="mt-1 text-xs text-slate-300/75">
          CK ngân hàng dùng VietQR/Sepay như hiện tại. USDT: admin xác nhận thủ công và cộng vào ví.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((method) => {
          const active = paymentMethod === method;
          return (
            <button
              key={method}
              type="button"
              onClick={() => onPaymentMethodChange(method)}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                active
                  ? "border-cyan-400/50 bg-cyan-500/10 shadow-[0_0_0_1px_rgba(34,211,238,0.15)]"
                  : "border-slate-600/70 bg-slate-800/50 hover:border-slate-500"
              }`}
            >
              <p className={`text-sm font-bold ${active ? "text-cyan-100" : "text-slate-200"}`}>
                {PAYMENT_METHOD_LABELS[method]}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {method === "bank"
                  ? "Tự động khớp CK qua Sepay / payment slot."
                  : "Không mở payment slot — xác nhận thủ công sau khi khách chuyển USDT."}
              </p>
            </button>
          );
        })}
      </div>

      {paymentMethod === "usdt" && (
        <div className="mt-4 rounded-2xl border border-cyan-500/20 bg-cyan-950/20 px-4 py-3">
          {rateError ? (
            <p className="text-sm text-rose-300">{rateError}</p>
          ) : vndPerUsdt ? (
            <>
              <p className="text-xs text-white/55">
                Tỷ giá Binance:{" "}
                <span className="font-semibold text-cyan-200 tabular-nums">
                  {Math.round(vndPerUsdt).toLocaleString("vi-VN")} VND/USDT
                </span>
              </p>
              {priceVnd > 0 && (
                <p className="mt-2 text-sm text-white/80">
                  Khách cần chuyển khoảng{" "}
                  <span className="font-bold text-cyan-200 tabular-nums">
                    {formatUsdtMoney(usdEquivalent)} USD
                  </span>{" "}
                  (≈ USDT) cho đơn {priceVnd.toLocaleString("vi-VN")} VND.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-white/50">Đang lấy tỷ giá Binance…</p>
          )}
        </div>
      )}

      <input type="hidden" name={ORDER_FIELDS.PAYMENT_METHOD} value={paymentMethod} />
    </section>
  );
}
