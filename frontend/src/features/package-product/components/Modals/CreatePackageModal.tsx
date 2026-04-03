import React, { useEffect, useState } from "react";
import { ModalShell } from "./ModalShell";
import { PACKAGE_FIELD_OPTIONS, PackageField } from "../../utils/packageHelpers";
import { apiFetch } from "@/lib/api";

export type ProductPackageOption = { id: number; package_name: string };

export type CreatePackageModalProps = {
  open: boolean;
  initialProductId: number | null;
  initialName: string;
  initialFields: PackageField[];
  mode: "create" | "edit";
  usedProductIds?: Set<number>;
  onClose: () => void;
  onSubmit: (packageId: number, productName: string, fields: PackageField[]) => void;
};

export const CreatePackageModal: React.FC<CreatePackageModalProps> = ({
  open,
  initialProductId,
  initialName,
  initialFields,
  onClose,
  onSubmit,
  mode,
  usedProductIds,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<number | null>(initialProductId);
  const [selectedProductName, setSelectedProductName] = useState(initialName);
  const [fields, setFields] = useState<Set<PackageField>>(
    new Set(initialFields)
  );
  const [error, setError] = useState<string | null>(null);
  const [packages, setPackages] = useState<ProductPackageOption[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedProductId(initialProductId);
      setSelectedProductName(initialName);
      setFields(new Set(initialFields));
      setError(null);
    }
  }, [open, initialFields, initialName, initialProductId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPackagesLoading(true);
    apiFetch("/api/products/packages")
      .then((res) => res.json())
      .then((data: ProductPackageOption[]) => {
        if (cancelled || !Array.isArray(data)) return;
        setPackages(data);
      })
      .catch(() => {
        if (!cancelled) setPackages([]);
      })
      .finally(() => {
        if (!cancelled) setPackagesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const toggleField = (field: PackageField) => {
    setFields((prev) => {
      const next = new Set(prev);
      if (next.has(field)) {
        next.delete(field);
      } else {
        next.add(field);
      }
      return next;
    });
  };

  const selectAll = () =>
    setFields(new Set(PACKAGE_FIELD_OPTIONS.map((opt) => opt.value)));
  const clearAll = () => setFields(new Set());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const productId = selectedProductId != null ? Number(selectedProductId) : null;
    const name = selectedProductName?.trim() ?? "";
    if (productId == null || !Number.isFinite(productId) || productId < 1) {
      setError("Vui lòng chọn loại gói (sản phẩm).");
      return;
    }
    if (fields.size === 0) {
      setError("Vui lòng chọn ít nhất một trường dữ liệu.");
      return;
    }
    onSubmit(productId, name || String(productId), Array.from(fields));
  };

  return (
    <ModalShell
      open={open}
      title={
        mode === "edit" && (initialName || initialProductId != null)
          ? `Chỉnh sửa loại gói: ${initialName || initialProductId}`
          : "Tạo loại gói sản phẩm mới"
      }
      onClose={onClose}
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white/60 border border-white/[0.08] rounded-lg hover:bg-white/[0.06] transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 text-sm font-medium text-white bg-indigo-500 rounded-lg hover:bg-indigo-400 transition-colors"
          >
            {mode === "create" ? "Tạo Loại" : "Lưu Thay Đổi"}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
            Tên Loại Gói (chọn từ Sản phẩm)
          </label>
          {packagesLoading ? (
            <p className="text-sm text-white/50 py-2">Đang tải danh sách...</p>
          ) : (
            <select
              value={selectedProductId ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                const id = v === "" ? null : Number(v);
                const opt = packages.find((p) => p.id === id);
                setSelectedProductId(id != null && Number.isFinite(id) ? id : null);
                setSelectedProductName(opt?.package_name ?? "");
              }}
              className={`w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/40 focus:bg-white/[0.06] transition-all appearance-none ${
                mode === "edit" ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              }`}
              style={{
                backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke-width=\'2\' stroke=\'%23818cf8\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' d=\'m19.5 8.25-7.5 7.5-7.5-7.5\' /%3E%3C/svg%3E")',
                backgroundPosition: "right 0.75rem center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "1rem",
                paddingRight: "2.5rem",
              }}
              disabled={mode === "edit"}
            >
              <option value="" className="bg-[#0d1225] text-white/40">
                {mode === "create"
                  ? "-- Chọn loại gói (sản phẩm) --"
                  : (initialName || initialProductId) ?? "--"}
              </option>
              {mode === "edit" &&
                initialProductId != null &&
                !packages.some((p) => p.id === initialProductId) && (
                  <option value={initialProductId} className="bg-[#0d1225] text-white">{initialName || initialProductId}</option>
                )}
              {packages
                .filter((p) => mode === "edit" || !usedProductIds?.has(p.id))
                .map((p) => (
                <option key={p.id} value={p.id} className="bg-[#0d1225] text-white">
                  {p.package_name}
                </option>
              ))}
            </select>
          )}
          {mode === "edit" && (
            <p className="text-[11px] text-white/30 mt-1.5">
              Bạn chỉ có thể chỉnh sửa các trường dữ liệu, tên loại gói giữ
              nguyên.
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              Các trường dữ liệu của loại gói này
            </label>
            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={selectAll}
                className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
              >
                Chọn tất cả
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="text-rose-400 hover:text-rose-300 font-medium transition-colors"
              >
                Bỏ chọn tất cả
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {PACKAGE_FIELD_OPTIONS.map((option) => {
              const isChecked = fields.has(option.value);
              return (
                <label
                  key={option.value}
                  className={`group flex items-center gap-3 rounded-xl border p-3 transition-all cursor-pointer ${
                    isChecked
                      ? "border-indigo-500/30 bg-indigo-500/[0.08] shadow-sm shadow-indigo-500/5"
                      : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]"
                  }`}
                >
                  <div className={`flex items-center justify-center h-4.5 w-4.5 rounded border transition-all ${
                    isChecked
                      ? "bg-indigo-500 border-indigo-500"
                      : "border-white/20 bg-white/[0.04] group-hover:border-white/30"
                  }`}>
                    {isChecked && (
                      <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isChecked}
                    onChange={() => toggleField(option.value)}
                  />
                  <span className={`text-sm font-medium transition-colors ${
                    isChecked ? "text-white" : "text-white/50 group-hover:text-white/70"
                  }`}>
                    {option.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {error && (
          <p className="text-xs text-rose-400 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
            {error}
          </p>
        )}
      </form>
    </ModalShell>
  );
};
