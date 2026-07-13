/**
 * Modal sửa Mã trace cho 1 dòng `store_profit_expenses` (Nhập hàng ngoài luồng).
 * Lưu vào `expense_meta.trace_code` để giữ schema gọn (không phải migration DB).
 */

import React, { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { apiPatch } from "@/shared/api/client";

export type EditTraceCodeModalProps = {
  isOpen: boolean;
  expenseId: number;
  initialTraceCode?: string | null;
  initialReason?: string | null;
  onClose: () => void;
  onSaved: () => void;
};




const EditTraceCodeModal: React.FC<EditTraceCodeModalProps> = ({
  isOpen,
  expenseId,
  initialTraceCode,
  initialReason,
  onClose,
  onSaved,
}) => {
  const [traceCode, setTraceCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTraceCode(initialTraceCode ?? "");
    setError(null);
    setLoading(false);
  }, [isOpen, initialTraceCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // gửi `null` khi clear trace để backend xóa key trong expense_meta.
      await apiPatch(
        `/api/store-profit-expenses/${expenseId}`,
        { trace_code: traceCode.trim() || null }
      );
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu mã trace. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="absolute right-4 top-4 rounded-full p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
            aria-label="Đóng"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>

          <h2 className="mb-1 text-xl font-bold text-white">Sửa mã trace</h2>
          <p className="mb-4 text-xs text-white/55">
            Mã trace (tracking) dùng để đối chiếu bill ngân hàng. Lưu vào{" "}
            <span className="text-white/75">expense_meta.trace_code</span>.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {initialReason ? (
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
                <span className="text-white/45">Lý do:</span>{" "}
                <span className="text-white/85">{initialReason}</span>
              </div>
            ) : null}

            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                Mã trace
              </label>
              <input
                type="text"
                value={traceCode}
                onChange={(e) => setTraceCode(e.target.value)}
                placeholder="Ví dụ: NCC Ky 20261005 / FT2026..."
                className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                disabled={loading}
                maxLength={100}
                autoFocus
              />
              <p className="mt-1 text-[11px] text-white/40">
                Để trống và lưu để xoá mã trace hiện có.
              </p>
            </div>

            {error ? (
              <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            ) : null}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white hover:from-indigo-500 hover:to-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default EditTraceCodeModal;
