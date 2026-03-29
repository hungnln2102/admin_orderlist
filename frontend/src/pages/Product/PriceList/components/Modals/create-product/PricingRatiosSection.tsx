import type { CreateProductFormState } from "../../../types";
import { inputBase, labelBase } from "./shared";

type PricingRatiosSectionProps = {
  createForm: CreateProductFormState;
  onFormChange: (field: keyof CreateProductFormState, value: string) => void;
};

export function PricingRatiosSection({
  createForm,
  onFormChange,
}: PricingRatiosSectionProps) {
  return (
    <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 p-5 shadow-sm backdrop-blur-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-300 mb-4">
        Tỷ Giá
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className={labelBase}>Tỷ Giá CTV</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className={`${inputBase} appearance-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
            placeholder="0.00"
            value={createForm.pctCtv}
            onChange={(event) => onFormChange("pctCtv", event.target.value)}
          />
        </div>
        <div>
          <label className={labelBase}>Tỷ Giá Khách</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className={`${inputBase} appearance-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
            placeholder="0.00"
            value={createForm.pctKhach}
            onChange={(event) => onFormChange("pctKhach", event.target.value)}
          />
        </div>
        <div>
          <label className={labelBase}>Tỷ Giá Khuyến Mãi</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className={`${inputBase} appearance-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
            placeholder="0.00"
            value={createForm.pctPromo}
            onChange={(event) => onFormChange("pctPromo", event.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
