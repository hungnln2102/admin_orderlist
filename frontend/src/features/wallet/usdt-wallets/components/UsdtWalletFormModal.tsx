import { useEffect, useState } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import GradientButton from "@/components/ui/GradientButton";
import type { UsdtWalletItem, UsdtWalletPayload } from "../types";

const NETWORKS = ["TRC20", "ERC20", "BEP20", "SOL", "TON"];

type UsdtWalletFormModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  item?: UsdtWalletItem | null;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: UsdtWalletPayload) => Promise<void> | void;
};

const emptyForm = {
  label: "",
  walletAddress: "",
  network: "TRC20",
  isDefault: false,
  isActive: true,
};

export function UsdtWalletFormModal({
  isOpen,
  mode,
  item,
  submitting = false,
  onClose,
  onSubmit,
}: UsdtWalletFormModalProps) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      item
        ? {
            label: item.label ?? "",
            walletAddress: item.walletAddress,
            network: item.network,
            isDefault: item.isDefault,
            isActive: item.isActive,
          }
        : emptyForm
    );
    setError(null);
  }, [isOpen, item]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.walletAddress.trim()) {
      setError("Địa chỉ ví không được để trống.");
      return;
    }
    setError(null);
    try {
      await onSubmit({
        label: form.label.trim() || null,
        walletAddress: form.walletAddress.trim(),
        network: form.network,
        isDefault: form.isDefault,
        isActive: form.isActive,
      });
    } catch {
      // parent handles notification
    }
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 p-4"
        onClick={onClose}
        role="presentation"
      >
        <form
          className="w-full max-w-lg rounded-[28px] border border-white/10 bg-slate-900 p-6 space-y-4"
          onClick={(e) => e.stopPropagation()}
          onSubmit={handleSubmit}
        >
          <h2 className="text-xl font-bold text-white">
            {mode === "create" ? "Thêm ví USDT" : "Sửa ví USDT"}
          </h2>

          {error && (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/50">
              Nhãn (tuỳ chọn)
            </label>
            <input
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white"
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              disabled={submitting}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/50">
              Địa chỉ ví *
            </label>
            <input
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white font-mono"
              value={form.walletAddress}
              onChange={(e) => setForm((f) => ({ ...f, walletAddress: e.target.value }))}
              disabled={submitting}
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/50">
              Mạng lưới
            </label>
            <select
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white"
              value={form.network}
              onChange={(e) => setForm((f) => ({ ...f, network: e.target.value }))}
              disabled={submitting}
            >
              {NETWORKS.map((network) => (
                <option key={network} value={network}>
                  {network}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-white/80">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                disabled={submitting}
              />
              Đặt làm mặc định
            </label>
            <label className="flex items-center gap-2 text-sm text-white/80">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                disabled={submitting}
              />
              Đang bật
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="text-sm text-white/50" disabled={submitting}>
              Hủy
            </button>
            <GradientButton type="submit" disabled={submitting} className="!rounded-2xl">
              {submitting ? "Đang lưu…" : mode === "create" ? "Thêm ví" : "Lưu"}
            </GradientButton>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
}
