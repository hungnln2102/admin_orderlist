type CreateOrderModalFooterProps = {
  canSubmit: boolean;
  submitLabel: string;
  onClose: () => void;
};

export function CreateOrderModalFooter({
  canSubmit,
  submitLabel,
  onClose,
}: CreateOrderModalFooterProps) {
  return (
          <div className="shrink-0 px-4 sm:px-6 lg:px-8 py-3 border-t border-slate-700/70 bg-slate-900 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-bold text-slate-100 bg-slate-800 border border-slate-600 rounded-xl hover:bg-slate-700 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              form="create-order-form"
              className={`px-7 py-2.5 text-sm font-black text-white rounded-xl transition-all ${
                canSubmit
                  ? "bg-emerald-500 hover:bg-emerald-400 shadow-[0_14px_30px_-14px_rgba(16,185,129,0.75)] hover:-translate-y-0.5"
                  : "bg-slate-700/80 opacity-60 cursor-not-allowed"
              }`}
              disabled={!canSubmit}
            >
              {submitLabel}
            </button>
          </div>
  );
}
