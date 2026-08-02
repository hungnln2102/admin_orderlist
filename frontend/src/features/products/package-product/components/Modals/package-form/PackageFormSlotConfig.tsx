import type { ChangeEvent } from "react";
import { DEFAULT_SLOT_LIMIT, SLOT_LINK_OPTIONS, type PackageFormValues } from "../../../utils/packageHelpers";
import { inputCls, labelCls } from "./shared";

type PackageFormSlotConfigProps = {
  values: PackageFormValues;
  matchRequiresAccountError: string | null;
  matchRequiresActivationError: string | null;
  onChange: (field: keyof PackageFormValues, event: ChangeEvent<HTMLInputElement>) => void;
  onSlotLinkModeChange: (value: PackageFormValues["slotLinkMode"]) => void;
};

export function PackageFormSlotConfig({
  values,
  matchRequiresAccountError,
  matchRequiresActivationError,
  onChange,
  onSlotLinkModeChange,
}: PackageFormSlotConfigProps) {
  return (
        <div className="space-y-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="mb-1 flex items-center gap-2">
            <div className="h-5 w-1 rounded-full bg-emerald-500" />
            <div>
              <h3 className="text-sm font-semibold text-white">Cấu hình gói</h3>
              <p className="text-[11px] text-white/30">
                Thiết lập slot và chế độ ghép lệnh
              </p>
            </div>
          </div>

          <div>
            <label className={labelCls}>Số vị trí (slot)</label>
            <input
              type="number"
              min={0}
              value={values.slot}
              onChange={(event) => onChange("slot", event)}
              placeholder={`Mặc định: ${DEFAULT_SLOT_LIMIT}`}
              className={inputCls}
            />
          </div>

          <div>
            <div className="mb-3">
              <p className="text-sm font-semibold text-white">
                Chế độ ghép lệnh
              </p>
              <p className="text-[11px] text-white/30">
                Chọn phương thức kết nối giữa gói và đơn hàng.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {SLOT_LINK_OPTIONS.map((option) => {
                const isSelected = values.slotLinkMode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onSlotLinkModeChange(option.value)}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? "border-indigo-500/40 bg-indigo-500/10 shadow-lg shadow-indigo-500/5"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className="block text-sm font-semibold text-white">
                      {option.label}
                    </span>
                    <span className="mt-1 block text-[11px] text-white/40">
                      {option.helper}
                    </span>
                  </button>
                );
              })}
            </div>
            {matchRequiresAccountError && (
              <p
                className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-400"
                role="alert"
              >
                {matchRequiresAccountError}
              </p>
            )}
            {matchRequiresActivationError && (
              <p
                className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-400"
                role="alert"
              >
                {matchRequiresActivationError}
              </p>
            )}
          </div>
        </div>
  );
}
