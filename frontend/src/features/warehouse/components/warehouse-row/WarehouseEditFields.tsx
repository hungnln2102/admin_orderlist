import React from "react";
import { WarehouseItem, WarehouseService } from "../../types";
import { ProductCategorySelect } from "../ProductCategorySelect";
import type { ProductOption } from "../../hooks/useWarehouseProducts";
import { TrashIcon, PlusIcon } from "@heroicons/react/24/outline";

const inputCls =
  "w-full min-w-0 px-3 py-2 rounded-xl bg-white/[0.06] border border-indigo-500/25 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-indigo-400/50 focus:bg-white/[0.08] transition-all";

const labelCls = "text-[10px] font-bold uppercase tracking-widest text-indigo-100/70";

type Props = {
  draft: WarehouseItem;
  productOptions: ProductOption[];
  onChange: (key: keyof WarehouseItem, value: any) => void;
};

export const WarehouseEditFields: React.FC<Props> = ({
  draft,
  productOptions,
  onChange,
}) => {
  const services = draft.services || [];

  const handleServiceChange = (idx: number, field: keyof WarehouseService, value: any) => {
    const newServices = [...services];
    newServices[idx] = { ...newServices[idx], [field]: value };
    onChange("services", newServices);
  };

  const handleAddService = () => {
    const newServices = [...services, { category: "", password: "", backup_email: "", two_fa: "", expires_at: "", status: "Tồn" }];
    onChange("services", newServices);
  };

  const handleRemoveService = (idx: number) => {
    const newServices = services.filter((_, i) => i !== idx);
    onChange("services", newServices);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className={`${labelCls} mb-1`}>Tài khoản (Email/User)</p>
          <input
            className={inputCls}
            value={draft.account || ""}
            placeholder="Email / Username"
            onChange={(e) => onChange("account", e.target.value)}
          />
        </div>
        <div>
          <p className={`${labelCls} mb-1`}>Ghi chú chung</p>
          <input
            className={inputCls}
            value={draft.note || ""}
            placeholder="Ghi chú..."
            onChange={(e) => onChange("note", e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-indigo-500/20 bg-indigo-900/20 p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-indigo-200">Danh sách dịch vụ</p>
          <button
            type="button"
            onClick={handleAddService}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-500/20 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/30 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            Thêm dịch vụ
          </button>
        </div>

        {services.length === 0 && (
          <p className="text-sm text-indigo-300/50 italic text-center py-4">Chưa có dịch vụ nào.</p>
        )}

        {services.map((srv, idx) => (
          <div key={idx} className="relative flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <button
              type="button"
              onClick={() => handleRemoveService(idx)}
              className="absolute right-3 top-3 rounded-md p-1.5 text-rose-400 hover:bg-rose-500/20 transition-colors"
              title="Xóa dịch vụ này"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pr-8">
              <div>
                <p className={`${labelCls} mb-1`}>Sản phẩm</p>
                <ProductCategorySelect
                  value={srv.category || ""}
                  options={productOptions}
                  onChange={(v) => handleServiceChange(idx, "category", v)}
                />
              </div>
              <div>
                <p className={`${labelCls} mb-1`}>Mật khẩu</p>
                <input
                  className={inputCls}
                  value={srv.password || ""}
                  onChange={(e) => handleServiceChange(idx, "password", e.target.value)}
                />
              </div>
              <div>
                <p className={`${labelCls} mb-1`}>Mail Backup</p>
                <input
                  className={inputCls}
                  value={srv.backup_email || ""}
                  onChange={(e) => handleServiceChange(idx, "backup_email", e.target.value)}
                />
              </div>
              <div>
                <p className={`${labelCls} mb-1`}>2FA</p>
                <input
                  className={inputCls}
                  value={srv.two_fa || ""}
                  onChange={(e) => handleServiceChange(idx, "two_fa", e.target.value)}
                />
              </div>
              <div>
                <p className={`${labelCls} mb-1`}>Hạn sử dụng</p>
                <input
                  type="date"
                  className={inputCls}
                  value={srv.expires_at?.slice(0, 10) || ""}
                  onChange={(e) => handleServiceChange(idx, "expires_at", e.target.value)}
                />
              </div>
              <div>
                <p className={`${labelCls} mb-1`}>Trạng thái</p>
                <input
                  className={inputCls}
                  value={srv.status || ""}
                  onChange={(e) => handleServiceChange(idx, "status", e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
