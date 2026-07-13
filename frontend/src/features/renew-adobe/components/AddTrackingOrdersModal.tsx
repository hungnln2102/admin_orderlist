/**
 * Modal: chọn đơn match từ `order_list` (renew_adobe) và lưu vào `order_user_tracking`.
 * - Backend: GET /api/renew-adobe/order-list/match (optional q, exclude_tracked)
 * - Backend: POST /api/renew-adobe/user-orders/track { order_ids: string[] }
 */

import { XMarkIcon } from "@heroicons/react/24/outline";
import { ModalPortal } from "@/components/ui/ModalPortal";
import {
  ADOBE_SYSTEM_OPTIONS,
  type AdobeSystemCode,
} from "@/features/renew-adobe/user-orders/system-options";
import { TRACKING_OTP_SOURCE_OPTIONS } from "@/features/renew-adobe/user-orders/otp-options";
import { useAddTrackingOrdersModal } from "./useAddTrackingOrdersModal";
import { AddTrackingOrdersTable } from "./AddTrackingOrdersTable";

export type AddTrackingOrdersModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved?: (result: { upserted: number; accepted: number }) => void;
};


export function AddTrackingOrdersModal({
  open,
  onClose,
  onSaved,
}: AddTrackingOrdersModalProps) {
  const {
    search,
    setSearch,
    excludeTracked,
    setExcludeTracked,
    items,
    loading,
    loadError,
    selected,
    systemNote,
    setSystemNote,
    otpSource,
    setOtpSource,
    submitting,
    submitError,
    submitInfo,
    selectableItems,
    allSelectableSelected,
    applySearch,
    toggleSelect,
    toggleSelectAll,
    handleSubmit,
  } = useAddTrackingOrdersModal({ open, onSaved });

  if (!open) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-tracking-orders-title"
          className="relative w-full max-w-3xl rounded-2xl border border-white/15 bg-slate-900 shadow-2xl max-h-[90vh] flex flex-col"
        >
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-50 z-10"
            aria-label="Đóng"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>

          <div className="px-6 pt-6 pb-4 border-b border-white/10">
            <h2
              id="add-tracking-orders-title"
              className="text-lg font-semibold text-white tracking-tight"
            >
              Thêm đơn vào tracking
            </h2>
            <p className="mt-1 text-xs text-white/50">
              Chọn đơn từ <span className="text-white/75">order_list</span> (renew_adobe) —
              bấm Lưu để upsert vào{" "}
              <span className="text-white/75">order_user_tracking</span>.
            </p>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                placeholder="Tìm theo mã đơn, khách, email, sđt..."
                className="flex-1 px-4 py-2 border border-white/10 rounded-xl bg-slate-950/40 text-sm text-white placeholder:text-slate-400/70 focus:ring-2 focus:ring-indigo-500/50 outline-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    applySearch();
                  }
                }}
                disabled={submitting}
              />
              <button
                type="button"
                onClick={() => applySearch()}
                disabled={submitting}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/85 hover:bg-white/5"
              >
                Tìm
              </button>
              <label className="inline-flex items-center gap-2 text-xs text-white/65 select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-emerald-500"
                  checked={excludeTracked}
                  onChange={(e) => setExcludeTracked(e.target.checked)}
                  disabled={submitting}
                />
                Ẩn đơn đã có trong tracking
              </label>
            </div>

            <div className="mt-3 flex flex-col gap-1">
              <label className="text-xs font-medium text-white/60">
                Hệ thống fix
              </label>
              <select
                value={systemNote}
                onChange={(e) => setSystemNote(e.target.value as AdobeSystemCode)}
                disabled={submitting}
                className="w-full sm:w-72 px-3 py-2 rounded-xl border border-white/10 bg-slate-950/50 text-sm text-white focus:ring-2 focus:ring-emerald-500/40 outline-none"
              >
                {ADOBE_SYSTEM_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-white/45">
                Đơn được upsert sẽ gắn vào hệ thống này (cột{" "}
                <span className="text-white/70">system_note</span>).
              </p>
            </div>

            <div className="mt-3 flex flex-col gap-1">
              <label className="text-xs font-medium text-white/60">
                Nguồn OTP
              </label>
              <select
                value={otpSource}
                onChange={(e) => setOtpSource(e.target.value as TrackingOtpSource)}
                disabled={submitting}
                className="w-full sm:w-72 px-3 py-2 rounded-xl border border-white/10 bg-slate-950/50 text-sm text-white focus:ring-2 focus:ring-emerald-500/40 outline-none"
              >
                {TRACKING_OTP_SOURCE_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-white/45">
                Ghi nhận nguồn lấy OTP cho email user (cột{" "}
                <span className="text-white/70">otp_source</span>).
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {loadError ? (
              <p className="text-sm text-amber-400/90">{loadError}</p>
            ) : loading ? (
              <p className="text-sm text-white/55">Đang tải danh sách…</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-white/55">
                Không có đơn nào khớp điều kiện.
              </p>
            ) : (
              <AddTrackingOrdersTable
                items={items}
                selected={selected}
                submitting={submitting}
                selectableCount={selectableItems.length}
                allSelectableSelected={allSelectableSelected}
                onToggleSelect={toggleSelect}
                onToggleSelectAll={toggleSelectAll}
              />
            )}
          </div>

          <div className="border-t border-white/10 px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-white/65 space-y-1">
              <div>
                Đã chọn:{" "}
                <span className="text-white font-semibold">{selected.size}</span> /{" "}
                {selectableItems.length} có thể chọn ({items.length} dòng)
              </div>
              {submitError && (
                <p className="text-amber-400/90">{submitError}</p>
              )}
              {submitInfo && (
                <p className="text-emerald-400/90">{submitInfo}</p>
              )}
            </div>
            <div className="flex items-center gap-2 self-end">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/5 disabled:opacity-50"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || selected.size === 0}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Đang lưu…" : `Lưu (${selected.size})`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

