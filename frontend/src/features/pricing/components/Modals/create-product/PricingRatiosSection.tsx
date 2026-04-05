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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <div>
          <label className={labelBase}>Giá Gốc</label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              className={inputBase}
              placeholder="0"
              value={createForm.basePrice}
              onChange={(event) => onFormChange("basePrice", event.target.value)}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
              VNĐ
            </span>
          </div>
        </div>
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
        <div>
          <label className={labelBase}>Giá Sinh Viên → pct_stu</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            className={`${inputBase} appearance-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
            placeholder="Để trống = mặc định server"
            value={createForm.pctStu}
            onChange={(event) => onFormChange("pctStu", event.target.value)}
          />
          <p className="mt-1 text-[11px] text-slate-400">
            Cùng định dạng Giá Khách; để trống = NULL trong DB.
          </p>
        </div>
      </div>
    </div>
  );
}
