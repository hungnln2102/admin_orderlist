import { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { apiFetch } from "@/lib/api";
import type {
  ActiveKeyItem,
  CreateKeyFormValues,
  CreateKeySuccessPayload,
} from "../types";

const inputClass =
  "mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-indigo-200/60 focus:outline-none focus:ring-2 focus:ring-indigo-400/60";

type SystemRow = { system_code: string; system_name: string };

type CreateKeyModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (payload: CreateKeySuccessPayload) => void;
};

export function CreateKeyModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateKeyModalProps) {
  const [systems, setSystems] = useState<SystemRow[]>([]);
  const [systemsLoading, setSystemsLoading] = useState(false);
  const [form, setForm] = useState<CreateKeyFormValues>({
    order_code: "",
    plain_key: "",
    system_code: "DEFAULT",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm({ order_code: "", plain_key: "", system_code: "DEFAULT" });
    setError(null);
    setSubmitting(false);
    setSystemsLoading(true);
    apiFetch("/api/key-active/systems")
      .then(async (r) => {
        if (!r.ok) throw new Error("systems");
        const data = await r.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        setSystems(items);
      })
      .catch(() => setSystems([]))
      .finally(() => setSystemsLoading(false));
  }, [isOpen]);

  const handleClose = () => {
    onClose();
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const order_code = form.order_code.trim();
    const plain_key = form.plain_key.trim();
    const system_code = form.system_code.trim() || "DEFAULT";

    if (!order_code) {
      setError("Vui lòng nhập mã đơn hàng.");
      return;
    }
    if (!plain_key || plain_key.length < 6) {
      setError("Key phải có ít nhất 6 ký tự.");
      return;
    }

    setSubmitting(true);
    try {
      const resp = await apiFetch("/api/key-active/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_code,
          plain_key,
          system_code,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setError(
          typeof data?.error === "string"
            ? data.error
            : "Không tạo được key."
        );
        setSubmitting(false);
        return;
      }
      const item = data?.item as ActiveKeyItem | undefined;
      const plainKey = String(data?.plainKey ?? "").trim();
      if (!item || !plainKey) {
        setError("Phản hồi máy chủ không hợp lệ.");
        setSubmitting(false);
        return;
      }
      onSuccess({ item, plainKey });
      handleClose();
    } catch {
      setError("Lỗi mạng. Thử lại sau.");
    } finally {
      setSubmitting(false);
    }
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
            <h3
              id="create-key-title"
              className="text-lg font-semibold text-white"
            >
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

          <p className="text-xs text-indigo-200/80 mb-4 leading-relaxed">
            Key gắn với một đơn trong <span className="font-medium">order_list</span>.
            Thời hạn hiển thị lấy theo <span className="font-medium">expired_at</span>{" "}
            của đơn (đồng bộ tự động).
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm text-indigo-100">
              <span>
                Mã đơn hàng <span className="text-rose-300">*</span>
              </span>
              <input
                type="text"
                value={form.order_code}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, order_code: e.target.value }))
                }
                placeholder="Trùng id_order trên đơn"
                className={inputClass}
                autoComplete="off"
              />
            </label>

            <label className="block text-sm text-indigo-100">
              <span>
                Key (plain) <span className="text-rose-300">*</span>
              </span>
              <input
                type="text"
                value={form.plain_key}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, plain_key: e.target.value }))
                }
                placeholder="Tối thiểu 6 ký tự — sẽ lưu dạng hash"
                className={inputClass}
                autoComplete="off"
              />
            </label>

            <label className="block text-sm text-indigo-100">
              <span>Hệ thống</span>
              <select
                value={form.system_code}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, system_code: e.target.value }))
                }
                className={inputClass}
                disabled={systemsLoading}
              >
                {systems.length === 0 && !systemsLoading ? (
                  <option value="DEFAULT">DEFAULT</option>
                ) : (
                  systems.map((s) => (
                    <option key={s.system_code} value={s.system_code}>
                      {s.system_name} ({s.system_code})
                    </option>
                  ))
                )}
              </select>
            </label>

            {error && <p className="text-sm text-rose-300">{error}</p>}

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
