import type React from "react";
import {
  ListBulletIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { ORDER_FIELDS } from "../../../../constants";
import SearchableSelect from "../SearchableSelect";
import {
  inputClass,
  labelClass,
  panelClass,
  panelSubtitleClass,
  panelTitleClass,
} from "../helpers";
import type { CustomerType, Order, SSOption } from "../types";

type CreateOrderProductSectionProps = {
  customMode: boolean;
  formData: Partial<Order>;
  selectedSupplyId: number | null;
  productOptions: SSOption[];
  supplyOptions: SSOption[];
  customerType: CustomerType;
  canSelectCustomerType: boolean;
  filteredCustomerTypeOptions: Array<{ value: CustomerType; label: string }>;
  onToggleCustomMode: () => void;
  onFieldChange: (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => void;
  onProductSelect: (productName: string) => void;
  onSourceSelect: (sourceId: number) => void;
  onCustomerTypeChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onClearSelectedSupplySelection: () => void;
  onCustomProductBlur: () => void;
};

export const CreateOrderProductSection = ({
  customMode,
  formData,
  selectedSupplyId,
  productOptions,
  supplyOptions,
  customerType,
  canSelectCustomerType,
  filteredCustomerTypeOptions,
  onToggleCustomMode,
  onFieldChange,
  onProductSelect,
  onSourceSelect,
  onCustomerTypeChange,
  onClearSelectedSupplySelection,
  onCustomProductBlur,
}: CreateOrderProductSectionProps) => {
  return (
    <section className={panelClass}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h4 className={panelTitleClass}>
            Thông tin sản phẩm & nguồn cung cấp
          </h4>
          <p className={panelSubtitleClass}>
            Chọn dữ liệu nền hoặc chuyển qua chế độ nhập tay.
          </p>
        </div>
        <button
          type="button"
          aria-label={
            customMode ? "Switch to select mode" : "Switch to manual mode"
          }
          onClick={onToggleCustomMode}
          className={`inline-flex items-center justify-center h-10 w-10 rounded-xl border transition-colors ${
            customMode
              ? "border-amber-400/45 bg-amber-500/20 text-amber-100 hover:bg-amber-500/30"
              : "border-cyan-400/45 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25"
          }`}
          title={customMode ? "Chọn từ danh sách" : "Nhập tay"}
        >
          {customMode ? (
            <ListBulletIcon className="h-5 w-5" aria-hidden="true" />
          ) : (
            <PencilSquareIcon className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>Sản phẩm</label>
          {customMode ? (
            <input
              type="text"
              name={ORDER_FIELDS.ID_PRODUCT}
              value={(formData[ORDER_FIELDS.ID_PRODUCT] as string) || ""}
              onChange={(event) => {
                onClearSelectedSupplySelection();
                onFieldChange(event);
              }}
              onBlur={onCustomProductBlur}
              className={inputClass}
              placeholder="Nhập tên sản phẩm"
            />
          ) : (
            <SearchableSelect
              name={ORDER_FIELDS.ID_PRODUCT}
              value={(formData[ORDER_FIELDS.ID_PRODUCT] as string) || ""}
              options={productOptions}
              placeholder="-- Chọn --"
              onChange={(value) => onProductSelect(String(value))}
              onClear={() => onProductSelect("")}
            />
          )}
        </div>

        <div>
          <label className={labelClass}>Nguồn</label>
          {customMode ? (
            <input
              type="text"
              name={ORDER_FIELDS.SUPPLY}
              value={(formData[ORDER_FIELDS.SUPPLY] as string) || ""}
              onChange={(event) => {
                onClearSelectedSupplySelection();
                onFieldChange(event);
              }}
              className={inputClass}
              placeholder="Nhập nguồn"
            />
          ) : (
            <SearchableSelect
              name={ORDER_FIELDS.SUPPLY}
              value={selectedSupplyId ?? ""}
              options={supplyOptions}
              placeholder="-- Chọn --"
              disabled={!formData[ORDER_FIELDS.ID_PRODUCT]}
              onChange={(value) => onSourceSelect(Number(value))}
              onClear={() => onSourceSelect(0)}
            />
          )}
        </div>

        <div className="md:max-w-sm">
          <label className={labelClass}>Loại khách hàng</label>
          <select
            name="customer_type"
            value={customerType}
            onChange={onCustomerTypeChange}
            className={inputClass}
            disabled={!canSelectCustomerType}
          >
            {filteredCustomerTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {!canSelectCustomerType && (
            <p className="mt-2 text-xs text-slate-400">
              Chọn sản phẩm và nguồn trước khi chọn loại khách.
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/10">
        <label className={labelClass}>Ghi chú</label>
        <textarea
          name={ORDER_FIELDS.NOTE}
          value={(formData[ORDER_FIELDS.NOTE] as string) || ""}
          onChange={onFieldChange}
          rows={4}
          className={`${inputClass} min-h-[110px]`}
        />
      </div>
    </section>
  );
};
