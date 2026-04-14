import React, { useMemo, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { apiFetch } from "@/lib/api";
import * as Helpers from "@/lib/helpers";

type ExternalImportLogModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

const readError = async (res: Response) => {
  try {
    const data = (await res.json()) as { error?: string };
    return data?.error || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
};

const ExternalImportLogModal: React.FC<ExternalImportLogModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [amountInput, setAmountInput] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountValue = useMemo(
    () => Number(String(amountInput || "").replace(/\./g, "")) || 0,
    [amountInput]
  );

  const closeAndReset = () => {
    if (loading) return;
    setAmountInput("");
    setReason("");
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!amountValue || amountValue <= 0) {
      setError("Số tiền nhập hàng phải lớn hơn 0.");
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch("/api/store-profit-expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountValue,
          reason: reason.trim() || null,
          expense_type: "external_import",
        }),
      });
      if (!response.ok) {
        setError(await readError(response));
        return;
      }
      onSuccess();
      closeAndReset();
    } catch {
      setError("Không thể tạo log nhập hàng ngoài luồng.");
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
            onClick={closeAndReset}
            className="absolute right-4 top-4 rounded-full p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            disabled={loading}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>

          <h2 className="mb-5 text-xl font-bold text-white">Tạo log nhập hàng</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                Số tiền nhập
              </label>
              <input
                type="text"
                value={amountInput}
                onChange={(e) =>
                  setAmountInput(Helpers.formatNumberOnTyping(e.target.value))
                }
                placeholder="0"
                className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                disabled={loading}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                Lý do
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Nhập lý do nhập hàng ngoài luồng..."
                rows={3}
                className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                disabled={loading}
              />
            </div>

            {error ? (
              <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            ) : null}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={closeAndReset}
                className="flex-1 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
                disabled={loading}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white hover:from-indigo-500 hover:to-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Đang lưu..." : "Tạo log"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default ExternalImportLogModal;
