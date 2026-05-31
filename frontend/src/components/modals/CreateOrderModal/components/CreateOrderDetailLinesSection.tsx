import type React from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { ORDER_FIELDS } from "../../../../constants";
import * as Helpers from "../../../../shared/utils";
import {
  inputClass,
  labelClass,
  panelClass,
  panelSubtitleClass,
  panelTitleClass,
} from "../helpers";
import type { OrderDetailLine } from "../hooks/useOrderDetailLines";

type CreateOrderDetailLinesSectionProps = {
  lines: OrderDetailLine[];
  multiOrderEnabled: boolean;
  completeLineCount: number;
  estimatedTotalPrice: number;
  unitPrice: number;
  onAddLine: () => void;
  onRemoveLine: (id: string) => void;
  onUpdateLine: (
    id: string,
    patch: Partial<Pick<OrderDetailLine, "slot" | "informationOrder">>
  ) => void;
  /** Chế độ đơn lẻ — bind trực tiếp formData */
  singleMode?: {
    slot: string;
    informationOrder: string;
    onFieldChange: (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) => void;
  };
};

export const CreateOrderDetailLinesSection = ({
  lines,
  multiOrderEnabled,
  completeLineCount,
  estimatedTotalPrice,
  unitPrice,
  onAddLine,
  onRemoveLine,
  onUpdateLine,
  singleMode,
}: CreateOrderDetailLinesSectionProps) => {
  if (!multiOrderEnabled && singleMode) {
    return (
      <section className={panelClass}>
        <div className="mb-4">
          <h4 className={panelTitleClass}>Chi tiết đơn</h4>
          <p className={panelSubtitleClass}>
            Slot và mô tả sản phẩm cho đơn hàng.
          </p>
        </div>
        <SingleLineFields
          slot={singleMode.slot}
          informationOrder={singleMode.informationOrder}
          onSlotChange={(value) =>
            singleMode.onFieldChange({
              target: { name: ORDER_FIELDS.SLOT, value },
            } as React.ChangeEvent<HTMLInputElement>)
          }
          onInfoChange={(value) =>
            singleMode.onFieldChange({
              target: { name: ORDER_FIELDS.INFORMATION_ORDER, value },
            } as React.ChangeEvent<HTMLInputElement>)
          }
        />
      </section>
    );
  }

  return (
    <section className={panelClass}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h4 className={panelTitleClass}>Chi tiết đơn</h4>
          <p className={panelSubtitleClass}>
            Cùng sản phẩm — mỗi dòng là một đơn riêng (slot & thông tin khác
            nhau).
          </p>
          {completeLineCount > 0 && unitPrice > 0 ? (
            <p className="mt-2 text-xs font-semibold text-emerald-200/85">
              {completeLineCount} đơn × {Helpers.formatCurrency(unitPrice)} ≈{" "}
              {Helpers.formatCurrency(estimatedTotalPrice)}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onAddLine}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/50 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25 transition-colors"
          title="Thêm chi tiết đơn"
          aria-label="Thêm chi tiết đơn"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-3">
        {lines.map((line, index) => (
          <div
            key={line.id}
            className="rounded-xl border border-slate-600/60 bg-slate-800/40 p-3 sm:p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Đơn #{index + 1}
              </span>
              {lines.length > 1 ? (
                <button
                  type="button"
                  onClick={() => onRemoveLine(line.id)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-950/30 text-rose-300 hover:bg-rose-900/40 transition-colors"
                  aria-label={`Xóa đơn #${index + 1}`}
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <SingleLineFields
              slot={line.slot}
              informationOrder={line.informationOrder}
              onSlotChange={(value) =>
                onUpdateLine(line.id, { slot: value })
              }
              onInfoChange={(value) =>
                onUpdateLine(line.id, { informationOrder: value })
              }
            />
          </div>
        ))}
      </div>
    </section>
  );
};

type SingleLineFieldsProps = {
  slot: string;
  informationOrder: string;
  onSlotChange: (value: string) => void;
  onInfoChange: (value: string) => void;
};

const SingleLineFields = ({
  slot,
  informationOrder,
  onSlotChange,
  onInfoChange,
}: SingleLineFieldsProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="md:max-w-sm">
      <label className={labelClass}>Slot</label>
      <input
        type="text"
        value={slot}
        onChange={(e) => onSlotChange(e.target.value)}
        className={inputClass}
      />
    </div>
    <div className="md:col-span-2">
      <label className={labelClass}>
        Thông tin sản phẩm <span className="text-rose-400">*</span>
      </label>
      <input
        type="text"
        value={informationOrder}
        onChange={(e) => onInfoChange(e.target.value)}
        className={inputClass}
        required
      />
    </div>
  </div>
);
