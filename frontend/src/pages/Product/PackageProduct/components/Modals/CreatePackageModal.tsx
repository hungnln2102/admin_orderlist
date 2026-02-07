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
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-indigo-500/15 transition"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
          >
            {mode === "create" ? "Tạo Loại" : "Lưu Thay Đổi"}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tên Loại Gói (chọn từ Sản phẩm)
          </label>
          {packagesLoading ? (
            <p className="text-sm text-white/70 py-2">Đang tải danh sách...</p>
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
              className={`w-full border border-white/40 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 ${
                mode === "edit" ? "bg-gray-100 cursor-not-allowed" : ""
              }`}
              disabled={mode === "edit"}
            >
              <option value="">
                {mode === "create"
                  ? "-- Chọn loại gói (sản phẩm) --"
                  : (initialName || initialProductId) ?? "--"}
              </option>
              {mode === "edit" &&
                initialProductId != null &&
                !packages.some((p) => p.id === initialProductId) && (
                  <option value={initialProductId}>{initialName || initialProductId}</option>
                )}
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.package_name}
                </option>
              ))}
            </select>
          )}
          {mode === "edit" && (
            <p className="text-xs text-white/70 mt-1">
              Bạn chỉ có thể chỉnh sửa các trường dữ liệu, tên loại gói giữ
              nguyên.
            </p>
          )}
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Các trường dữ liệu của loại gói này
            </label>
            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={selectAll}
                className="text-blue-600 hover:text-blue-700"
              >
                Chọn tất cả
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="text-rose-600 hover:text-rose-700"
              >
                Bỏ chọn tất cả
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PACKAGE_FIELD_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex items-center gap-3 rounded-lg border p-3 transition cursor-pointer ${
                  fields.has(option.value)
                    ? "bg-blue-50 border-blue-200 ring-1 ring-blue-300"
                    : "bg-white border-gray-200 hover:bg-indigo-500/10"
                }`}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/40 text-blue-600 focus:ring-blue-500"
                  checked={fields.has(option.value)}
                  onChange={() => toggleField(option.value)}
                />
                <span className="text-sm font-medium text-gray-800">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </ModalShell>
  );
};
