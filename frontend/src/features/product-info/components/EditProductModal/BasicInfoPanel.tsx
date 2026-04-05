import React from "react";
import { EditFormState } from "./types";

type BasicInfoPanelProps = {
  form: EditFormState;
  setForm: React.Dispatch<React.SetStateAction<EditFormState>>;
  inputBase: string;
  labelBase: string;
};

export const BasicInfoPanel: React.FC<BasicInfoPanelProps> = ({
  form,
  setForm,
  inputBase,
  labelBase,
}) => (
  <section className="product-edit-modal__panel product-edit-modal__panel--basic p-3 sm:p-4">
    <h3 className="product-edit-modal__panel-title mb-3 text-base">Thông Tin Cơ Bản</h3>

    <div className="space-y-2.5">
      <div>
        <label className={labelBase}>Mã sản phẩm</label>
        <input
          type="text"
          value={form.productId}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, productId: e.target.value }))
          }
          placeholder="Nhập mã sản phẩm..."
          className={inputBase}
        />
      </div>

      <div>
        <label className={labelBase}>Tên sản phẩm</label>
        <input
          type="text"
          value={form.packageName}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              packageName: e.target.value,
            }))
          }
          placeholder="Nhập tên sản phẩm..."
          className={inputBase}
        />
      </div>

      <div>
        <label className={labelBase}>Gói sản phẩm</label>
        <input
          type="text"
          value={form.productName}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              productName: e.target.value,
            }))
          }
          placeholder="Nhập gói sản phẩm..."
          className={inputBase}
        />
      </div>
    </div>
  </section>
);
