import React from "react";
import { WarehouseItem } from "../../types";
import { ProductCategorySelect } from "../ProductCategorySelect";
import type { ProductOption } from "../../hooks/useWarehouseProducts";

const inputCls =
  "w-full min-w-0 px-3 py-2 rounded-xl bg-white/[0.06] border border-indigo-500/25 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-indigo-400/50 focus:bg-white/[0.08] transition-all";

const labelCls = "text-[10px] font-bold uppercase tracking-widest text-indigo-100/70";

type Props = {
  draft: WarehouseItem;
  productOptions: ProductOption[];
  onChange: (key: keyof WarehouseItem, value: string) => void;
};

export const WarehouseEditFields: React.FC<Props> = ({
  draft,
  productOptions,
  onChange,
}) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <div>
      <p className={`${labelCls} mb-1`}>Sản phẩm</p>
      <ProductCategorySelect
        value={draft.category || ""}
        options={productOptions}
        onChange={(v) => onChange("category", v)}
      />
    </div>
    <div>
      <p className={`${labelCls} mb-1`}>Tài khoản</p>
      <input
        className={inputCls}
        value={draft.account || ""}
        placeholder="Email / Username"
        onChange={(e) => onChange("account", e.target.value)}
      />
    </div>
    <div>
      <p className={`${labelCls} mb-1`}>Mật khẩu</p>
      <input
        className={inputCls}
        value={draft.password || ""}
        autoComplete="off"
        onChange={(e) => onChange("password", e.target.value)}
      />
    </div>
    <div>
      <p className={`${labelCls} mb-1`}>Mail dự phòng</p>
      <input
        className={inputCls}
        value={draft.backup_email || ""}
        placeholder="Backup mail"
        onChange={(e) => onChange("backup_email", e.target.value)}
      />
    </div>
    <div>
      <p className={`${labelCls} mb-1`}>2FA</p>
      <input
        className={inputCls}
        value={draft.two_fa || ""}
        onChange={(e) => onChange("two_fa", e.target.value)}
      />
    </div>
    <div>
      <p className={`${labelCls} mb-1`}>Trạng thái</p>
      <input
        className={inputCls}
        value={draft.status || ""}
        onChange={(e) => onChange("status", e.target.value)}
      />
    </div>
    <div>
      <p className={`${labelCls} mb-1`}>Hạn sử dụng</p>
      <input
        type="date"
        className={inputCls}
        value={draft.expires_at?.slice(0, 10) || ""}
        onChange={(e) => onChange("expires_at", e.target.value)}
      />
    </div>
    <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 sm:col-span-2 lg:col-span-1">
      <input
        type="checkbox"
        className="h-4 w-4 rounded accent-indigo-500"
        checked={!!draft.is_verified}
        onChange={(e) => onChange("is_verified", e.target.checked ? "true" : "")}
      />
      <span className="text-sm text-white/85">Đã xác minh (V)</span>
    </label>
    <div className="sm:col-span-2 lg:col-span-3">
      <p className={`${labelCls} mb-1`}>Ghi chú</p>
      <input
        className={inputCls}
        value={draft.note || ""}
        placeholder="Ghi chú…"
        onChange={(e) => onChange("note", e.target.value)}
      />
    </div>
  </div>
);
