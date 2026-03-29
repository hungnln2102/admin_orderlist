import type React from "react";
import { ORDER_FIELDS } from "../../../../constants";
import * as Helpers from "../../../../lib/helpers";
import {
  inputClass,
  labelClass,
  panelClass,
  panelSubtitleClass,
  panelTitleClass,
  readOnlyClass,
} from "../helpers";
import type { Order } from "../types";

type CreateOrderPricingSectionProps = {
  customMode: boolean;
  formData: Partial<Order>;
  registerDateDMY: string;
  costValue: string | number | undefined;
  priceValue: string | number | undefined;
  onRegisterDateChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onCostChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onPriceChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export const CreateOrderPricingSection = ({
  customMode,
  formData,
  registerDateDMY,
  costValue,
  priceValue,
  onRegisterDateChange,
  onCostChange,
  onPriceChange,
}: CreateOrderPricingSectionProps) => {
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
          <label className={labelClass}>Ngày đăng ký (dd/mm/yyyy)</label>
          <input
            type="text"
            name={ORDER_FIELDS.ORDER_DATE}
            value={registerDateDMY}
            placeholder="dd/mm/yyyy"
            onChange={onRegisterDateChange}
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
            readOnly
            className={`${inputClass} font-black text-rose-300 ${readOnlyClass}`}
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
              value={Helpers.formatCurrencyPlain(Number(priceValue ?? 0))}
              onChange={onPriceChange}
              className={`${inputClass} font-black text-emerald-300`}
            />
          ) : (
            <input
              type="text"
              name={ORDER_FIELDS.PRICE}
              value={Helpers.formatCurrency(priceValue ?? 0)}
              readOnly
              className={`${inputClass} font-black text-emerald-300 ${readOnlyClass}`}
            />
          )}
        </div>
      </div>
    </section>
  );
};
