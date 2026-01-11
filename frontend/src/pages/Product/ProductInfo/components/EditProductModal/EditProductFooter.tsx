import React from "react";

type EditProductFooterLabels = {
  cancel: string;
  save: string;
  saving: string;
};

type EditProductFooterProps = {
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  labels: EditProductFooterLabels;
};

export const EditProductFooter: React.FC<EditProductFooterProps> = ({
  saving,
  onClose,
  onSave,
  labels,
}) => (
  <div className="flex items-center justify-end gap-3 border-t border-white/10 px-5 py-3">
    <button
      className="px-4 py-2 text-sm font-semibold text-white/80 hover:text-white"
      onClick={onClose}
      disabled={saving}
      type="button"
    >
      {labels.cancel}
    </button>
    <button
      className="px-4 py-2 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      onClick={onSave}
      disabled={saving}
      type="button"
    >
      {saving ? labels.saving : labels.save}
    </button>
  </div>
);
