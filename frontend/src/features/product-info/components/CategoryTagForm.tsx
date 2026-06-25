import React from "react";
import { CheckIcon } from "@heroicons/react/24/outline";
import ColorPicker from "@/components/ui/ColorPicker";

type CategoryTagFormProps = {
  name: string;
  color: string;
  colorLabel: string;
  saving: boolean;
  submitLabel: string;
  savingLabel: string;
  namePlaceholder?: string;
  autoFocus?: boolean;
  onNameChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
};

export const CategoryTagForm: React.FC<CategoryTagFormProps> = ({
  name,
  color,
  colorLabel,
  saving,
  submitLabel,
  savingLabel,
  namePlaceholder,
  autoFocus = false,
  onNameChange,
  onColorChange,
  onCancel,
  onSubmit,
}) => (
  <div className="rounded-2xl border border-indigo-400/50 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 p-6 space-y-4 shadow-lg sm:col-span-2">
    <div>
      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-2 block">
        Tên Danh Mục
      </label>
      <input
        type="text"
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
        placeholder={namePlaceholder}
        className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white placeholder:text-slate-400 shadow-inner focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
        autoFocus={autoFocus}
      />
    </div>

    <ColorPicker label={colorLabel} value={color} onChange={onColorChange} />

    <div className="flex items-center justify-end gap-3 pt-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="px-5 py-2.5 text-sm font-semibold text-slate-300 hover:text-white transition-colors disabled:opacity-50"
      >
        Hủy
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={!name.trim() || saving}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50"
      >
        <CheckIcon className="h-4 w-4" />
        {saving ? savingLabel : submitLabel}
      </button>
    </div>
  </div>
);
