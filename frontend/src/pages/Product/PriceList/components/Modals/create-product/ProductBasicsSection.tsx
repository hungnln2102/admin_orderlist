import type { CreateProductFormState } from "../../../types";
import { inputBase, labelBase } from "./shared";

type ProductBasicsSectionProps = {
  createForm: CreateProductFormState;
  onFormChange: (field: keyof CreateProductFormState, value: string) => void;
};

export function ProductBasicsSection({
  createForm,
  onFormChange,
}: ProductBasicsSectionProps) {
  return (
    <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 p-5 shadow-sm backdrop-blur-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-300 mb-4">
        Thông Tin Cơ Bản
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={labelBase}>Tên Sản Phẩm</label>
          <input
            type="text"
            className={inputBase}
            placeholder="Nhập tên sản phẩm"
            value={createForm.packageName}
            onChange={(event) => onFormChange("packageName", event.target.value)}
          />
        </div>
        <div>
          <label className={labelBase}>Gói Sản Phẩm</label>
          <input
            type="text"
            className={inputBase}
            placeholder="Nhập gói sản phẩm"
            value={createForm.packageProduct}
            onChange={(event) =>
              onFormChange("packageProduct", event.target.value)
            }
          />
        </div>
        <div className="md:col-span-2">
          <label className={labelBase}>Mã Sản Phẩm</label>
          <input
            type="text"
            className={inputBase}
            placeholder="Nhập mã sản phẩm"
            value={createForm.sanPham}
            onChange={(event) => onFormChange("sanPham", event.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
