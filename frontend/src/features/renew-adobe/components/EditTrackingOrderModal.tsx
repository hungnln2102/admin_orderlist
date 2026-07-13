/**
 * Modal sửa nhanh hệ thống fix và nguồn OTP của 1 đơn trong `order_user_tracking`.
 */

import { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { updateTrackingOrder } from "@/features/renew-adobe/user-orders/api";
import {
  ADOBE_SYSTEM_OPTIONS,
  DEFAULT_ADOBE_SYSTEM_CODE,
  isAdobeSystemCode,
  type AdobeSystemCode,
} from "@/features/renew-adobe/user-orders/system-options";
import {
  DEFAULT_TRACKING_OTP_SOURCE,
  TRACKING_OTP_SOURCE_OPTIONS,
  isTrackingOtpSource,
} from "@/features/renew-adobe/user-orders/otp-options";
import type { TrackingOtpSource } from "@/features/renew-adobe/user-orders/types";

export type EditTrackingOrderModalProps = {
  open: boolean;
  orderCode: string;
  initialSystemNote?: string | null;
  initialOtpSource?: string | null;
  onClose: () => void;
  onSaved?: () => void;
};

export function EditTrackingOrderModal({
  open,
  orderCode,
  initialSystemNote,
  initialOtpSource,
  onClose,
  onSaved,
}: EditTrackingOrderModalProps) {
  const initialCode: AdobeSystemCode = isAdobeSystemCode(initialSystemNote)
    ? initialSystemNote
    : DEFAULT_ADOBE_SYSTEM_CODE;
  const initialOtp: TrackingOtpSource = isTrackingOtpSource(initialOtpSource)
    ? initialOtpSource
    : DEFAULT_TRACKING_OTP_SOURCE;
  const [systemNote, setSystemNote] = useState<AdobeSystemCode>(initialCode);
  const [otpSource, setOtpSource] = useState<TrackingOtpSource>(initialOtp);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSystemNote(initialCode);
    setOtpSource(initialOtp);
    setError(null);
    setSubmitting(false);
  }, [open, initialCode, initialOtp]);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await updateTrackingOrder(orderCode, { systemNote, otpSource });
      onSaved?.();
      onClose();
    } catch (err) {
      setError((err as Error)?.message ?? "Không thể cập nhật đơn.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <div
          role="dialog"
          aria-modal="true"
          className="relative w-full max-w-md rounded-2xl border border-white/15 bg-slate-900 shadow-2xl"
        >
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-50"
            aria-label="Đóng"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>

          <div className="p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white tracking-tight">
                Sửa đơn tracking
              </h2>
              <p className="mt-1 text-xs text-white/55">
                Mã đơn:{" "}
                <span className="font-mono text-white/85">{orderCode}</span>
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-white/60">
                Hệ thống fix
              </label>
              <select
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500/40 outline-none"
                value={systemNote}
                onChange={(e) => setSystemNote(e.target.value as AdobeSystemCode)}
                disabled={submitting}
              >
                {ADOBE_SYSTEM_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-white/60">
                Nguồn OTP
              </label>
              <select
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500/40 outline-none"
                value={otpSource}
                onChange={(e) => setOtpSource(e.target.value as TrackingOtpSource)}
                disabled={submitting}
              >
                {TRACKING_OTP_SOURCE_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p className="text-sm text-amber-400/90" role="alert">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white/85 hover:bg-white/5 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Đang lưu…" : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

