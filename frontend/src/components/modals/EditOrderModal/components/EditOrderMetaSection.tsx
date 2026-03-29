import type React from "react";
import { ORDER_FIELDS } from "../../../../constants";
import { inputClass, labelClass, readOnlyClass } from "../styles";
import type { Order } from "../types";
import { formatCurrency } from "../utils";

type EditOrderMetaSectionProps = {
  orderDateDisplay: string;
  orderExpiredDisplay: string;
  stringField: (key: keyof Order) => string;
  numericField: (key: keyof Order) => number;
  onInputChange: (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => void;
};

export const EditOrderMetaSection = ({
  orderDateDisplay,
  orderExpiredDisplay,
  stringField,
  numericField,
  onInputChange,
}: EditOrderMetaSectionProps) => {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Ngày đăng ký</label>
          <input
            type="text"
            name={ORDER_FIELDS.ORDER_DATE}
            value={orderDateDisplay}
            readOnly
            disabled
            className={`${inputClass} ${readOnlyClass}`}
          />
        </div>
        <div>
          <label className={labelClass}>Số ngày</label>
          <input
            type="text"
            name={ORDER_FIELDS.DAYS}
            value={stringField(ORDER_FIELDS.DAYS as keyof Order)}
            readOnly
            disabled
            className={`${inputClass} ${readOnlyClass}`}
          />
        </div>
        <div>
          <label className={labelClass}>Ngày hết hạn</label>
          <input
            type="text"
            name={ORDER_FIELDS.EXPIRY_DATE}
            value={orderExpiredDisplay}
            readOnly
            disabled
            className={`${inputClass} ${readOnlyClass}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Giá nhập</label>
          <input
            type="text"
            name={ORDER_FIELDS.COST}
            value={formatCurrency(numericField(ORDER_FIELDS.COST as keyof Order))}
            readOnly
            disabled
            className={`${inputClass} ${readOnlyClass} font-semibold`}
          />
        </div>
        <div>
          <label className={labelClass}>Giá bán</label>
          <input
            type="text"
            name={ORDER_FIELDS.PRICE}
            value={formatCurrency(
              numericField(ORDER_FIELDS.PRICE as keyof Order)
            )}
            readOnly
            disabled
            className={`${inputClass} ${readOnlyClass} font-semibold text-emerald-300`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        <div>
          <label className={labelClass}>Trạng thái</label>
          <input
            type="text"
            name={ORDER_FIELDS.STATUS}
            value={stringField(ORDER_FIELDS.STATUS as keyof Order)}
            readOnly
            disabled
            className={`${inputClass} ${readOnlyClass}`}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Ghi chú</label>
        <textarea
          name={ORDER_FIELDS.NOTE}
          value={stringField(ORDER_FIELDS.NOTE as keyof Order)}
          rows={4}
          onChange={onInputChange}
          className={inputClass}
        />
      </div>
    </>
  );
};
