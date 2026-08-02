import type { ManualWarehouseEntry } from "../../../utils/packageHelpers";
import { MANUAL_FIELDS, manualFieldCls } from "./shared";

type StockManualEntryFieldsProps = {
  manualEntry: ManualWarehouseEntry;
  onManualEntryChange: (entry: ManualWarehouseEntry) => void;
};

export function StockManualEntryFields({
  manualEntry,
  onManualEntryChange,
}: StockManualEntryFieldsProps) {
  return (
    <div className="space-y-2.5 rounded-lg border border-amber-500/10 bg-amber-500/[0.02] p-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-amber-400/60">
        Thông tin sẽ được lưu vào Kho Hàng
      </p>
      {MANUAL_FIELDS.map((field) => (
        <div key={field.key}>
          <label className="mb-1 block text-[11px] font-medium text-white/40">
            {field.label}
          </label>
          <input
            type="text"
            value={manualEntry[field.key]}
            onChange={(event) =>
              onManualEntryChange({
                ...manualEntry,
                [field.key]: event.target.value,
              })
            }
            placeholder={field.placeholder}
            className={manualFieldCls}
          />
        </div>
      ))}
    </div>
  );
}
