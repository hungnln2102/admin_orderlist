import { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { fetchAccounts, type AccountDto } from "@/lib/accountsApi";
import type { ActiveKeyItem, CreateKeyFormValues } from "../types";

const inputClass =
  "mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-indigo-200/60 focus:outline-none focus:ring-2 focus:ring-indigo-400/60";

type CreateKeyModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (item: ActiveKeyItem) => void;
};

function accountLabel(a: AccountDto): string {
  if (a.email) return a.email;
  if (a.username) return a.username;
  return `ID: ${a.id}`;
}

export function CreateKeyModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateKeyModalProps) {
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [form, setForm] = useState<CreateKeyFormValues>({
    account: "",
    product: "",
    key: "",
    expiry: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm({ account: "", product: "", key: "", expiry: "" });
      setError(null);
      setSubmitting(false);
      setAccountsLoading(true);
      fetchAccounts()
        .then(setAccounts)
        .catch(() => setAccounts([]))
        .finally(() => setAccountsLoading(false));
    }
  }, [isOpen]);

  const handleClose = () => {
    onClose();
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const account = form.account.trim();
    const product = form.product.trim();
    const keyVal = form.key.trim();
    const expiry = form.expiry.trim();
    if (!account) {
      setError("Vui lòng chọn tài khoản.");
      return;
    }
    if (!product) {
      setError("Vui lòng nhập sản phẩm.");
      return;
    }
    if (!keyVal) {
      setError("Vui lòng nhập key.");
      return;
    }
    if (!expiry) {
      setError("Vui lòng nhập thời hạn.");
      return;
    }

    setSubmitting(true);
    // Mock: tạo key mới và gọi onSuccess (khi có API thì gọi API rồi onSuccess(response))
    const newItem: ActiveKeyItem = {
      id: `mock-${Date.now()}`,
      account,
      product,
      key: keyVal,
      expiry,
    };
    onSuccess(newItem);
    handleClose();
    setSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/15 bg-gradient-to-br from-slate-900/90 via-indigo-900/85 to-slate-950/90 p-6 shadow-[0_20px_60px_-25px_rgba(0,0,0,0.9)] backdrop-blur"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-key-title"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 id="create-key-title" className="text-lg font-semibold text-white">
            Tạo key kích hoạt
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="text-white/70 hover:text-white transition rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
            aria-label="Đóng"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm text-indigo-100">
            <span>Tài khoản <span className="text-rose-300">*</span></span>
            <select
              value={form.account}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, account: e.target.value }))
              }
              className={inputClass}
              disabled={accountsLoading}
            >
              <option value="">
                {accountsLoading ? "Đang tải..." : "Chọn tài khoản"}
              </option>
              {accounts.map((a) => (
                <option key={a.id} value={accountLabel(a)}>
                  {accountLabel(a)}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-indigo-100">
            <span>Sản phẩm <span className="text-rose-300">*</span></span>
            <input
              type="text"
              value={form.product}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, product: e.target.value }))
              }
              placeholder="VD: Gói Premium 1 tháng"
              className={inputClass}
            />
          </label>

          <label className="block text-sm text-indigo-100">
            <span>Key <span className="text-rose-300">*</span></span>
            <input
              type="text"
              value={form.key}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, key: e.target.value }))
              }
              placeholder="VD: XXXX-XXXX-XXXX-AAAA"
              className={inputClass}
            />
          </label>

          <label className="block text-sm text-indigo-100">
            <span>Thời hạn <span className="text-rose-300">*</span></span>
            <input
              type="text"
              value={form.expiry}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, expiry: e.target.value }))
              }
              placeholder="VD: 31/12/2025 hoặc Còn 30 ngày"
              className={inputClass}
            />
          </label>

          {error && (
            <p className="text-sm text-rose-300">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="px-4 py-2 rounded-md border border-white/20 bg-white/10 text-white hover:bg-white/15 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-md bg-indigo-500 text-white hover:bg-indigo-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Đang tạo..." : "Tạo key"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}
