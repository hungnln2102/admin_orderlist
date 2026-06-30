import React from "react";
import { CheckIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";

export const FormActions: React.FC<{
  isNew?: boolean;
  itemId?: number;
  loading: boolean;
  onSave: (id?: number) => void;
  onDelete: (id?: number) => void;
  onCancel: () => void;
}> = ({ isNew, itemId, loading, onSave, onDelete, onCancel }) => (
  <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-white/5 pt-4">
    <button
      type="button"
      onClick={() => onSave(isNew ? undefined : itemId)}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/20 px-3 py-2 text-sm font-medium text-emerald-300 ring-1 ring-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-50"
    >
      <CheckIcon className="h-4 w-4" />
      Lưu
    </button>
    {!isNew && itemId != null && (
      <button
        type="button"
        onClick={() => onDelete(itemId)}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500/15 px-3 py-2 text-sm font-medium text-rose-300 ring-1 ring-rose-500/25 hover:bg-rose-500/25 disabled:opacity-50"
      >
        <TrashIcon className="h-4 w-4" />
        Xoá
      </button>
    )}
    <button
      type="button"
      onClick={onCancel}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-2 text-sm text-white/60 ring-1 ring-white/10 hover:bg-white/10 disabled:opacity-50"
    >
      <XMarkIcon className="h-4 w-4" />
      Huỷ
    </button>
  </div>
);