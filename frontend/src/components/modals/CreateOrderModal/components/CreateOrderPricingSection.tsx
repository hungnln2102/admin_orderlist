import { formatCurrency, formatCurrencyPlain } from "@/shared/money";
import type React from "react";
import { useMemo } from "react";
import { ORDER_CODE_PREFIXES, ORDER_FIELDS } from "../../../../constants";
import { getCreateOrderPricingCopy } from "../createOrderPricingCopy";
import {
  inputClass,
  labelClass,
  panelClass,
  panelTitleClass,
  readOnlyClass,
} from "../helpers";
import type { CreateOrderCreationKind, CustomerType, Order } from "../types";

type CreateOrderPricingSectionProps = {
  customMode: boolean;
  customerType: CustomerType;
  orderCreationKind?: CreateOrderCreationKind;
  formData: Partial<Order>;
  registerDateDMY: string;
  isMavrykSupply?: boolean;
  costValue: string | number | undefined;
  priceValue: string | number | undefined;
  onRegisterDateChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRegisterDateBlur: () => void;
  onExpiryDateChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onExpiryDateBlur: () => void;
  onCostChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onPriceChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export const CreateOrderPricingSection = ({
  customMode,
  customerType,
  orderCreationKind,
  formData,
  registerDateDMY,
  isMavrykSupply = false,
  costValue,
  priceValue,
  onRegisterDateChange,
  onRegisterDateBlur,
  onExpiryDateChange,
  onExpiryDateBlur,
  onCostChange,
  onPriceChange,
}: CreateOrderPricingSectionProps) => {
  const isGift = customerType === ORDER_CODE_PREFIXES.GIFT;
  const isImport = orderCreationKind === "import";
  const costDisplay = isMavrykSupply ? 0 : costValue;

  const copy = useMemo(
    () => getCreateOrderPricingCopy(customerType, isMavrykSupply),
    [customerType, isMavrykSupply]
  );

  return (
    <section className={`${panelClass} lg:col-span-2 relative overflow-hidden group`}>
      {/* Decorative premium gradients for taste skill */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

      <div className="mb-4 relative z-10 flex items-center gap-2">
        <div className="w-1.5 h-4 bg-gradient-to-b from-indigo-400 to-indigo-600 rounded-full shadow-[0_0_8px_rgba(129,140,248,0.5)]" />
        <h4 className={`${panelTitleClass} !mb-0 text-white/90 font-bold tracking-wide`}>
          Chi phí & thông tin thời gian
        </h4>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 relative z-10">
        <div className="space-y-1.5">
          <label className={`${labelClass} text-indigo-200/70`}>Ngày đăng ký</label>
          <div className="relative group/input">
            <input
              type="text"
              name={ORDER_FIELDS.ORDER_DATE}
              value={registerDateDMY}
              placeholder="dd/mm/yyyy"
              autoComplete="off"
              spellCheck={false}
              onChange={onRegisterDateChange}
              onBlur={onRegisterDateBlur}
              className={`${inputClass} bg-white/[0.03] border-indigo-500/20 focus:border-indigo-400 focus:bg-indigo-500/[0.05] transition-all duration-300 placeholder:text-white/20`}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={`${labelClass} text-indigo-200/70`}>Số ngày đăng ký</label>
          <input
            type="text"
            name={ORDER_FIELDS.DAYS}
            value={(formData[ORDER_FIELDS.DAYS] as string) || ""}
            readOnly
            className={`${inputClass} ${readOnlyClass} bg-white/[0.01] border-white/5 text-white/40`}
          />
        </div>

        <div className="space-y-1.5">
          <label className={`${labelClass} text-indigo-200/70`}>Ngày hết hạn</label>
          <input
            type="text"
            name={ORDER_FIELDS.EXPIRY_DATE}
            value={(formData[ORDER_FIELDS.EXPIRY_DATE] as string) || ""}
            placeholder="dd/mm/yyyy"
            autoComplete="off"
            spellCheck={false}
            onChange={onExpiryDateChange}
            onBlur={onExpiryDateBlur}
            className={`${inputClass} font-black text-rose-300 bg-white/[0.03] border-rose-500/20 focus:border-rose-400 focus:bg-rose-500/[0.05] transition-all duration-300 placeholder:text-rose-300/20`}
          />
        </div>

        <div className="space-y-1.5">
          <label className={`${labelClass} text-indigo-200/70`}>
            {isImport ? "Giá nhập (Cost)" : copy.costLabel}
          </label>
          {customMode && !isMavrykSupply ? (
            <input
              type="text"
              inputMode="numeric"
              name={ORDER_FIELDS.COST}
              value={formatCurrencyPlain(Number(costValue ?? 0))}
              onChange={onCostChange}
              className={`${inputClass} font-bold text-amber-300 bg-white/[0.03] border-amber-500/20 focus:border-amber-400 focus:bg-amber-500/[0.05] transition-all duration-300 shadow-[inset_0_1px_4px_rgba(0,0,0,0.1)]`}
            />
          ) : (
            <input
              type="text"
              name={ORDER_FIELDS.COST}
              value={formatCurrency(costDisplay ?? 0)}
              readOnly
              title={copy.costFieldTitle}
              className={`${inputClass} font-bold text-amber-300/70 ${readOnlyClass} bg-white/[0.01] border-white/5`}
            />
          )}
        </div>

        {!isImport && (
          <div className="space-y-1.5">
            <label className={`${labelClass} text-indigo-200/70`}>{copy.priceLabel}</label>
            {customMode ? (
              <input
                type="text"
                inputMode="numeric"
                name={ORDER_FIELDS.PRICE}
                value={
                  isGift
                    ? "0"
                    : formatCurrencyPlain(Number(priceValue ?? 0))
                }
                onChange={isGift ? undefined : onPriceChange}
                readOnly={isGift}
                title={copy.priceFieldTitle}
                className={`${inputClass} font-black text-emerald-300 bg-white/[0.03] border-emerald-500/30 focus:border-emerald-400 focus:bg-emerald-500/[0.05] transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.1)]`}
              />
            ) : (
              <input
                type="text"
                name={ORDER_FIELDS.PRICE}
                inputMode={isGift ? "numeric" : undefined}
                value={
                  isGift ? "0" : formatCurrency(priceValue ?? 0)
                }
                readOnly
                title={copy.priceFieldTitle}
                className={`${inputClass} font-black text-emerald-300/70 ${readOnlyClass} bg-white/[0.01] border-white/5`}
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
};
