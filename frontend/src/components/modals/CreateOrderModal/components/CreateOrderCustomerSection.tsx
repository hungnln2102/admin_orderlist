import type React from "react";
import { ORDER_FIELDS } from "../../../../constants";
import {
  inputClass,
  labelClass,
  panelClass,
  panelSubtitleClass,
  panelTitleClass,
} from "../helpers";
import type { Order } from "../types";

type CreateOrderCustomerSectionProps = {
  formData: Partial<Order>;
  onFieldChange: (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => void;
};

export const CreateOrderCustomerSection = ({
  formData,
  onFieldChange,
}: CreateOrderCustomerSectionProps) => {
  return (
    <section className={panelClass}>
      <div className="mb-4">
        <h4 className={panelTitleClass}>Thông tin khách hàng & đơn hàng</h4>
        <p className={panelSubtitleClass}>
          Nhập thông tin liên hệ và mô tả đơn hàng cần xử lý.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>
            Tên khách hàng <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            name={ORDER_FIELDS.CUSTOMER}
            value={(formData[ORDER_FIELDS.CUSTOMER] as string) || ""}
            onChange={onFieldChange}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Link liên hệ</label>
          <input
            type="url"
            name={ORDER_FIELDS.CONTACT}
            value={(formData[ORDER_FIELDS.CONTACT] as string) || ""}
            onChange={onFieldChange}
            className={inputClass}
          />
        </div>
        <div className="md:max-w-sm">
          <label className={labelClass}>Slot</label>
          <input
            type="text"
            name={ORDER_FIELDS.SLOT}
            value={(formData[ORDER_FIELDS.SLOT] as string) || ""}
            onChange={onFieldChange}
            className={inputClass}
          />
        </div>
        <div className="md:col-span-2">
          <label className={labelClass}>
            Thông tin sản phẩm <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            name={ORDER_FIELDS.INFORMATION_ORDER}
            value={(formData[ORDER_FIELDS.INFORMATION_ORDER] as string) || ""}
            onChange={onFieldChange}
            className={inputClass}
            required
          />
        </div>
      </div>
    </section>
  );
};
