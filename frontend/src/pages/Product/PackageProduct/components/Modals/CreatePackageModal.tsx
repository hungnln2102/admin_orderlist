import React, { useEffect, useState } from "react";
import { ModalShell } from "./ModalShell";
import { PACKAGE_FIELD_OPTIONS, PackageField } from "../../utils/packageHelpers";

export type CreatePackageModalProps = {
  open: boolean;
  initialName: string;
  initialFields: PackageField[];
  mode: "create" | "edit";
  onClose: () => void;
  onSubmit: (name: string, fields: PackageField[]) => void;
};

export const CreatePackageModal: React.FC<CreatePackageModalProps> = ({
  open,
  initialName,
  initialFields,
  onClose,
  onSubmit,
  mode,
}) => {
  const [name, setName] = useState(initialName);
  const [fields, setFields] = useState<Set<PackageField>>(
    new Set(initialFields)
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setFields(new Set(initialFields));
      setError(null);
    }
  }, [open, initialFields, initialName]);

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
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Vui lòng nhập tên loại gói.");
      return;
    }
    if (fields.size === 0) {
      setError("Vui lòng chọn ít nhất một trường dữ liệu.");
      return;
    }
    onSubmit(trimmed, Array.from(fields));
  };

  return (
    <ModalShell
      open={open}
      title={
        mode === "edit" && initialName
          ? `Chỉnh sửa loại gói: ${initialName}`
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
            Tên Loại Gói
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ví dụ: Google One, Netflix, Spotify..."
            className={`w-full border border-white/40 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 ${
              mode === "edit" ? "bg-gray-100 cursor-not-allowed" : ""
            }`}
            disabled={mode === "edit"}
          />
          {mode === "edit" && (
            <p className="text-xs text-white/70 mt-1">
              Bạn chỉ có thể chỉnh sửa các trường dữ liệu, tên loại gói
              giữ nguyên.
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
