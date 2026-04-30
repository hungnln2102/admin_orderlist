import type React from "react";
import { ORDER_FIELDS } from "../../../../constants";
import {
  inputClass,
  labelClass,
  panelClass,
  panelSubtitleClass,
  panelTitleClass,
} from "../helpers";
import type { Order, SSOption } from "../types";
import SearchableSelect from "../SearchableSelect";
import type { AvailableRefundCredit } from "@/lib/refundCreditsApi";
import { formatCurrency } from "@/features/orders/utils/ordersHelpers";

type CreateOrderCustomerSectionProps = {
  formData: Partial<Order>;
  onFieldChange: (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => void;
  creditMode: boolean;
  creditListLoading: boolean;
  availableCreditOptions: SSOption[];
  onSelectCreditRow: (row: AvailableRefundCredit) => void;
  onClearCreditSelection: () => void;
  /** Map value id -> row (để bắn đủ metadata khi chọn) */
  creditNoteById: Map<number, AvailableRefundCredit>;
  selectedCreditNoteId: number | null;
};

export const CreateOrderCustomerSection = ({
  formData,
  onFieldChange,
  creditMode,
  creditListLoading,
  availableCreditOptions,
  onSelectCreditRow,
  onClearCreditSelection,
  creditNoteById,
  selectedCreditNoteId,
}: CreateOrderCustomerSectionProps) => {
  const selectedId = selectedCreditNoteId;
  const selectedCreditRow =
    selectedId != null ? creditNoteById.get(selectedId) : undefined;

  return (
    <section className={panelClass}>
      <div className="mb-4">
        <h4 className={panelTitleClass}>Thông tin khách hàng & đơn hàng</h4>
        <p className={panelSubtitleClass}>
          {creditMode
            ? "Chọn phiếu trong danh sách (mỗi dòng có «Tên — số dư credit»); ô bên dưới nhập tên khách, có thể sửa."
            : "Nhập thông tin liên hệ và mô tả đơn hàng cần xử lý."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {creditMode ? (
          <div className="md:col-span-2">
            <label className={labelClass}>Chọn khách hàng (credit)</label>
            <SearchableSelect
              name="credit_customer_pick"
              value={selectedId ?? ""}
              options={availableCreditOptions}
              placeholder={
                creditListLoading
                  ? "Đang tải danh sách…"
                  : "Chọn «Tên — số dư»…"
              }
              disabled={creditListLoading}
              onChange={(val) => {
                const row = creditNoteById.get(Number(val));
                if (row) onSelectCreditRow(row);
              }}
              onClear={onClearCreditSelection}
            />
            {creditMode && selectedCreditRow ? (
              <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-emerald-500/25 bg-emerald-950/30 px-3 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-200/85">
                  Số dư credit (phiếu này)
                </span>
                <span className="text-base font-black tabular-nums text-emerald-100">
                  {formatCurrency(
                    Math.max(0, Number(selectedCreditRow.available_amount) || 0)
                  )}
                </span>
              </div>
            ) : null}
            {!creditListLoading && availableCreditOptions.length === 0 ? (
              <p className="mt-1.5 text-xs text-amber-200/80">
                Không có phiếu credit còn số dư. Tắt chế độ «Credit» để nhập tay.
              </p>
            ) : null}
          </div>
        ) : null}
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
