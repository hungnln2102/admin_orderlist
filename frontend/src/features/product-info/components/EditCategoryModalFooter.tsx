import React from "react";

type EditCategoryModalFooterProps = {
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
};

export const EditCategoryModalFooter: React.FC<EditCategoryModalFooterProps> = ({
  saving,
  onClose,
  onSave,
}) => (
  <div className="flex items-center justify-end gap-3 border-t border-white/10 px-8 py-5 bg-slate-900/50">
    <button
      type="button"
      className="rounded-xl border border-white/20 bg-transparent px-6 py-3 font-semibold text-white transition-all hover:bg-white/10 disabled:opacity-50"
      onClick={onClose}
      disabled={saving}
    >
      Hủy bỏ
    </button>
    <button
      type="button"
      className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-3 font-semibold text-white shadow-lg transition-all hover:from-indigo-600 hover:to-purple-700 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
      onClick={onSave}
      disabled={saving}
    >
      {saving ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Đang lưu...
        </span>
      ) : (
        "Lưu thay đổi"
      )}
    </button>
  </div>
);
