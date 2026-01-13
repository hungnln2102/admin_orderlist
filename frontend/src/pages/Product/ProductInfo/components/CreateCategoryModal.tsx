import React from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

type CreateCategoryModalProps = {
  open: boolean;
  name: string;
  color: string;
  saving: boolean;
  error?: string | null;
  onNameChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
};

export const CreateCategoryModal: React.FC<CreateCategoryModalProps> = ({
  open,
  name,
  color,
  saving,
  error,
  onNameChange,
  onColorChange,
  onClose,
  onSave,
}) => {
  if (!open) return null;
  const trimmedName = (name || "").trim();
  const disableSave = saving || !trimmedName;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 py-8">
      <div className="w-full max-w-xl rounded-2xl bg-[#0b1220] border border-white/10 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-lg font-semibold text-white">Tạo danh mục mới</h2>
          <button
            type="button"
            className="rounded-full p-2 text-white/60 hover:text-white hover:bg-white/10 transition"
            onClick={onClose}
            aria-label="Đóng"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-5 space-y-5">
          <div>
            <label className="block text-xs uppercase tracking-wide text-white/60 mb-2">
              Tên danh mục
            </label>
            <input
              type="text"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              placeholder="Nhập tên danh mục"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-white/60 mb-2">
              Màu sắc
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(event) => onColorChange(event.target.value)}
                className="h-10 w-14 rounded border border-white/10 bg-white/10"
              />
              <input
                type="text"
                value={color}
                onChange={(event) => onColorChange(event.target.value)}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                placeholder="#facc15"
              />
              <div
                className="h-10 w-10 rounded-lg border border-white/10"
                style={{ backgroundColor: color || "#facc15" }}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-white/10 px-5 py-4">
          <button
            type="button"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white/70 hover:text-white hover:bg-white/10 transition"
            onClick={onClose}
            disabled={saving}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition disabled:opacity-60"
            onClick={onSave}
            disabled={disableSave}
          >
            {saving ? "Đang tạo..." : "Tạo danh mục"}
          </button>
        </div>
      </div>
    </div>
  );
};
