type ProductEditActionsProps = {
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: () => void;
};

export function ProductEditActions({
  isSaving,
  onCancel,
  onSubmit,
}: ProductEditActionsProps) {
  return (
      <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 pt-2">
        <button
          type="button"
          className="inline-flex h-10 items-center rounded-xl border border-white/20 bg-white/10 px-4 md:px-5 text-sm font-semibold text-white shadow-sm transition hover:border-white/40 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onCancel}
          disabled={isSaving}
        >
          Hủy bỏ
        </button>
        <button
          type="button"
          className="inline-flex h-10 items-center rounded-xl bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 px-4 md:px-5 text-sm font-semibold text-white shadow-[0_10px_25px_-10px_rgba(56,189,248,0.85)] transition hover:brightness-110 disabled:opacity-60"
          onClick={onSubmit}
          disabled={isSaving}
        >
          {isSaving ? "Đang Lưu..." : "Lưu thay đổi"}
        </button>
      </div>
  );
}
