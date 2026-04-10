import { useEffect, useState } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import GradientButton from "@/components/ui/GradientButton";
import type { IpWhitelistItem, IpWhitelistPayload } from "../types";

type IpWhitelistFormModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  item?: IpWhitelistItem | null;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: IpWhitelistPayload) => Promise<void> | void;
};

export function IpWhitelistFormModal({
  isOpen,
  mode,
  item,
  submitting = false,
  onClose,
  onSubmit,
}: IpWhitelistFormModalProps) {
  const [ipAddress, setIpAddress] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setIpAddress(item?.ipAddress ?? "");
    setDescription(item?.description ?? "");
    setError(null);
  }, [isOpen, item]);

  if (!isOpen) {
    return null;
  }

  const title =
    mode === "create" ? "Thêm IP whitelist" : "Cập nhật IP whitelist";
  const submitLabel = mode === "create" ? "Tạo mới" : "Lưu thay đổi";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedIpAddress = ipAddress.trim();
    if (!normalizedIpAddress) {
      setError("IP whitelist không được để trống.");
      return;
    }

    setError(null);
    await onSubmit({
      ipAddress: normalizedIpAddress,
      description: description.trim() || null,
    });
  };

  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.2),_transparent_45%),linear-gradient(180deg,rgba(15,23,42,0.97),rgba(2,6,23,0.98))] p-7 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ip-whitelist-form-title"
      >
        <div className="space-y-2">
          <h2
            id="ip-whitelist-form-title"
            className="text-2xl font-bold tracking-tight text-white"
          >
            {title}
          </h2>
          <p className="text-sm text-white/55">
            Hỗ trợ IPv4, IPv6 và định dạng CIDR như `192.168.1.0/24`.
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-sky-400/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100/80">
          Chỉ những địa chỉ hợp lệ mới được lưu. Hệ thống sẽ tự chuẩn hóa định
          dạng khi gửi về backend.
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-[0.18em] text-indigo-200/55">
              Địa chỉ IP
            </label>
            <input
              type="text"
              value={ipAddress}
              onChange={(event) => setIpAddress(event.target.value)}
              placeholder="Ví dụ: 203.113.0.5 hoặc 2001:db8::/64"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/35 placeholder:text-white/25"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-[0.18em] text-indigo-200/55">
              Mô tả
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ghi chú ngắn về mục đích sử dụng IP này..."
              rows={4}
              className="w-full resize-none rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/35 placeholder:text-white/25"
            />
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-white/45 transition hover:text-white"
              disabled={submitting}
            >
              Hủy
            </button>
            <GradientButton
              type="submit"
              disabled={submitting}
              className="!rounded-2xl !px-6 !py-2.5"
            >
              {submitting ? "Đang lưu..." : submitLabel}
            </GradientButton>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}
