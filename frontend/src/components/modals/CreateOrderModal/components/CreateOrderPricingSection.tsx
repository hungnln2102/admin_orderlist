import type React from "react";
import { ORDER_CODE_PREFIXES, ORDER_FIELDS } from "../../../../constants";
import * as Helpers from "../../../../lib/helpers";
import {
  inputClass,
  labelClass,
  panelClass,
  panelSubtitleClass,
  panelTitleClass,
  readOnlyClass,
} from "../helpers";
import type { CustomerType, Order } from "../types";

type CreateOrderPricingSectionProps = {
  customMode: boolean;
  customerType: CustomerType;
  formData: Partial<Order>;
  registerDateDMY: string;
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
  formData,
  registerDateDMY,
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

  return (
    <section className={`${panelClass} lg:col-span-2`}>
      <div className="mb-4">
        <h4 className={panelTitleClass}>Chi phí & thời hạn đơn hàng</h4>
        <p className={panelSubtitleClass}>
          Theo dõi ngày hiệu lực và giá trị tài chính của đơn hàng.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <div>
          <label className={labelClass}>Ngày đăng ký</label>
          <input
            type="text"
            name={ORDER_FIELDS.ORDER_DATE}
            value={registerDateDMY}
            placeholder="dd/mm/yyyy"
            autoComplete="off"
            spellCheck={false}
            onChange={onRegisterDateChange}
            onBlur={onRegisterDateBlur}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Số ngày đăng ký</label>
          <input
            type="text"
            name={ORDER_FIELDS.DAYS}
            value={(formData[ORDER_FIELDS.DAYS] as string) || ""}
            readOnly
            className={`${inputClass} ${readOnlyClass}`}
          />
        </div>
        <div>
          <label className={labelClass}>Ngày hết hạn</label>
          <input
            type="text"
            name={ORDER_FIELDS.EXPIRY_DATE}
            value={(formData[ORDER_FIELDS.EXPIRY_DATE] as string) || ""}
            placeholder="dd/mm/yyyy"
            autoComplete="off"
            spellCheck={false}
            onChange={onExpiryDateChange}
            onBlur={onExpiryDateBlur}
            className={`${inputClass} font-black text-rose-300`}
          />
        </div>
        <div>
          <label className={labelClass}>Giá nhập</label>
          {customMode ? (
            <input
              type="text"
              inputMode="numeric"
              name={ORDER_FIELDS.COST}
              value={Helpers.formatCurrencyPlain(Number(costValue ?? 0))}
              onChange={onCostChange}
              className={`${inputClass} font-semibold`}
            />
          ) : (
            <input
              type="text"
              name={ORDER_FIELDS.COST}
              value={Helpers.formatCurrency(costValue ?? 0)}
              readOnly
              className={`${inputClass} font-semibold ${readOnlyClass}`}
            />
          )}
        </div>
        <div>
          <label className={labelClass}>Giá bán</label>
          {customMode ? (
            <input
              type="text"
              inputMode="numeric"
              name={ORDER_FIELDS.PRICE}
              value={
                isGift
                  ? "0"
                  : Helpers.formatCurrencyPlain(Number(priceValue ?? 0))
              }
              onChange={isGift ? undefined : onPriceChange}
              readOnly={isGift}
              className={`${inputClass} font-black text-emerald-300 ${
                isGift ? readOnlyClass : ""
              }`}
            />
          ) : (
            <input
              type="text"
              name={ORDER_FIELDS.PRICE}
              inputMode={isGift ? "numeric" : undefined}
              value={
                isGift ? "0" : Helpers.formatCurrency(priceValue ?? 0)
              }
              readOnly
              title={isGift ? "Đơn quà tặng, giá bán lưu trong hệ thống là 0" : undefined}
              className={`${inputClass} font-black text-emerald-300 ${readOnlyClass}`}
            />
          )}
        </div>
      </div>
    </section>
  );
};
