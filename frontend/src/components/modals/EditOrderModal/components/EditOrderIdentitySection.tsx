import type React from "react";
import {
  MinusCircleIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";
import { ORDER_FIELDS } from "../../../../constants";
import { inputClass, labelClass, readOnlyClass } from "../styles";
import type { Order, Supply } from "../types";
import { getSupplyName } from "../utils";

type EditOrderIdentitySectionProps = {
  supplies: Supply[];
  isCustomSupply: boolean;
  supplySelectValue: string;
  stringField: (key: keyof Order) => string;
  onInputChange: (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => void;
  onSupplySelect: (supplyId: number) => void;
  onCustomSupplyChange: (value: string) => void;
  onToggleCustomSupply: () => void;
};

export const EditOrderIdentitySection = ({
  supplies,
  isCustomSupply,
  supplySelectValue,
  stringField,
  onInputChange,
  onSupplySelect,
  onCustomSupplyChange,
  onToggleCustomSupply,
}: EditOrderIdentitySectionProps) => {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Mã đơn hàng</label>
          <input
            type="text"
            name={ORDER_FIELDS.ID_ORDER}
            value={stringField(ORDER_FIELDS.ID_ORDER as keyof Order)}
            readOnly
            disabled
            className={`${inputClass} ${readOnlyClass}`}
          />
        </div>
        <div>
          <label className={labelClass}>Khách hàng</label>
          <input
            type="text"
            name={ORDER_FIELDS.CUSTOMER}
            value={stringField(ORDER_FIELDS.CUSTOMER as keyof Order)}
            readOnly
            disabled
            className={`${inputClass} ${readOnlyClass}`}
          />
        </div>
        <div>
          <label className={labelClass}>Liên hệ</label>
          <input
            type="text"
            name={ORDER_FIELDS.CONTACT}
            value={stringField(ORDER_FIELDS.CONTACT as keyof Order)}
            readOnly
            disabled
            className={`${inputClass} ${readOnlyClass}`}
          />
        </div>
        <div>
          <label className={labelClass}>Slot</label>
          <input
            type="text"
            name={ORDER_FIELDS.SLOT}
            value={stringField(ORDER_FIELDS.SLOT as keyof Order)}
            onChange={onInputChange}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Sản phẩm</label>
          <input
            type="text"
            name={ORDER_FIELDS.ID_PRODUCT}
            value={stringField(ORDER_FIELDS.ID_PRODUCT as keyof Order)}
            readOnly
            disabled
            className={`${inputClass} ${readOnlyClass}`}
          />
        </div>
        <div>
          <label className={labelClass}>Nguồn</label>
          <div className="flex items-center gap-2">
            {isCustomSupply ? (
              <input
                type="text"
                name={ORDER_FIELDS.SUPPLY}
                value={stringField(ORDER_FIELDS.SUPPLY as keyof Order)}
                onChange={(event) => onCustomSupplyChange(event.target.value)}
                className={inputClass}
                placeholder="Nhập nguồn mới"
              />
            ) : (
              <select
                name={ORDER_FIELDS.SUPPLY}
                value={supplySelectValue}
                onChange={(event) => onSupplySelect(Number(event.target.value))}
                className={inputClass}
              >
                <option value="">-- Giữ nguyên hoặc chọn --</option>
                {supplies.map((supply) => (
                  <option key={supply.id} value={supply.id}>
                    {getSupplyName(supply)}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={onToggleCustomSupply}
              className={`inline-flex items-center justify-center w-10 h-10 rounded-md text-white ${
                isCustomSupply
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-green-500 hover:bg-green-600"
              }`}
              aria-label={
                isCustomSupply ? "Tắt nhập nguồn mới" : "Nhập nguồn mới"
              }
            >
              {isCustomSupply ? (
                <MinusCircleIcon className="h-6 w-6" aria-hidden="true" />
              ) : (
                <PlusCircleIcon className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
          {!supplies.length && !isCustomSupply && (
            <p className="mt-1 text-xs text-slate-300">
              Không có danh sách nguồn cho sản phẩm hiện tại.
            </p>
          )}
        </div>
      </div>

      <div>
        <label className={labelClass}>Thông tin đơn hàng</label>
        <input
          type="text"
          name={ORDER_FIELDS.INFORMATION_ORDER}
          value={stringField(ORDER_FIELDS.INFORMATION_ORDER as keyof Order)}
          onChange={onInputChange}
          className={inputClass}
        />
      </div>
    </>
  );
};
