/**
 * Modal: chọn đơn match từ `order_list` (renew_adobe) và lưu vào `order_user_tracking`.
 * - Backend: GET /api/renew-adobe/order-list/match (optional q, exclude_tracked)
 * - Backend: POST /api/renew-adobe/user-orders/track { order_ids: string[] }
 */

import { useEffect, useMemo, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ModalPortal } from "@/components/ui/ModalPortal";
import {
  addOrdersToTracking,
  fetchMatchableOrders,
  type MatchableOrder,
} from "@/features/renew-adobe/user-orders/api";
import {
  ADOBE_SYSTEM_OPTIONS,
  DEFAULT_ADOBE_SYSTEM_CODE,
  type AdobeSystemCode,
} from "@/features/renew-adobe/user-orders/system-options";

export type AddTrackingOrdersModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved?: (result: { upserted: number; accepted: number }) => void;
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  "Đã Thanh Toán": "bg-emerald-500/15 text-emerald-300 border-emerald-400/40",
  "Đang Xử Lý": "bg-sky-500/15 text-sky-300 border-sky-400/40",
  "Cần Gia Hạn": "bg-amber-500/15 text-amber-300 border-amber-400/40",
};

function StatusPill({ status }: { status: string | null }) {
  const cls =
    (status && STATUS_BADGE_CLASS[status]) ||
    "bg-slate-500/20 text-slate-300 border-slate-400/35";
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${cls}`}
    >
      {status || "—"}
    </span>
  );
}

export function AddTrackingOrdersModal({
  open,
  onClose,
  onSaved,
}: AddTrackingOrdersModalProps) {
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [excludeTracked, setExcludeTracked] = useState(true);
  const [items, setItems] = useState<MatchableOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [systemNote, setSystemNote] = useState<AdobeSystemCode>(
    DEFAULT_ADOBE_SYSTEM_CODE
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitInfo, setSubmitInfo] = useState<string | null>(null);

  // Load mỗi khi mở modal hoặc đổi search/filter
  useEffect(() => {
    if (!open) return;
    let aborted = false;
    setLoading(true);
    setLoadError(null);
    fetchMatchableOrders({
      q: appliedSearch,
      excludeTracked,
    })
      .then((rows) => {
        if (aborted) return;
        setItems(rows);
      })
      .catch((err) => {
        if (aborted) return;
        setLoadError(
          (err as Error)?.message ?? "Không tải được danh sách đơn match."
        );
        setItems([]);
      })
      .finally(() => {
        if (!aborted) setLoading(false);
      });
    return () => {
      aborted = true;
    };
  }, [open, appliedSearch, excludeTracked]);

  // Reset state khi đóng
  useEffect(() => {
    if (open) return;
    setSearch("");
    setAppliedSearch("");
    setExcludeTracked(true);
    setItems([]);
    setSelected(new Set());
    setSystemNote(DEFAULT_ADOBE_SYSTEM_CODE);
    setLoadError(null);
    setSubmitError(null);
    setSubmitInfo(null);
  }, [open]);

  const selectableItems = useMemo(
    () => items.filter((it) => !it.in_tracking),
    [items]
  );

  const toggleSelect = (orderCode: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(orderCode)) next.delete(orderCode);
      else next.add(orderCode);
      return next;
    });
  };

  const allSelectableSelected =
    selectableItems.length > 0 &&
    selectableItems.every((it) => selected.has(it.order_code));

  const toggleSelectAll = () => {
    if (allSelectableSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectableItems.map((it) => it.order_code)));
    }
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    setSubmitInfo(null);
    const ids = [...selected];
    if (ids.length === 0) {
      setSubmitError("Chọn ít nhất 1 đơn để thêm vào tracking.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await addOrdersToTracking(ids, systemNote);
      onSaved?.({ upserted: result.upserted, accepted: result.accepted });
      const skippedNote =
        result.skipped && result.skipped.length > 0
          ? ` Bỏ qua ${result.skipped.length} đơn không hợp lệ.`
          : "";
      setSubmitInfo(`Đã lưu ${result.upserted}/${result.requested} đơn.${skippedNote}`);
      // Reload list để cập nhật cờ in_tracking + clear selection
      setSelected(new Set());
      const refreshed = await fetchMatchableOrders({
        q: appliedSearch,
        excludeTracked,
      });
      setItems(refreshed);
    } catch (err) {
      setSubmitError((err as Error)?.message ?? "Không thể lưu.");
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
                    setAppliedSearch(search.trim());
                  }
                }}
                disabled={submitting}
              />
              <button
                type="button"
                onClick={() => setAppliedSearch(search.trim())}
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
              <div className="overflow-hidden rounded-xl border border-white/10">
                <table className="min-w-full divide-y divide-white/5 text-white text-sm">
                  <thead className="bg-white/[0.04] text-[10px] uppercase tracking-[0.1em] text-indigo-300/70">
                    <tr>
                      <th className="px-3 py-2 w-10 text-left">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-emerald-500"
                          checked={allSelectableSelected}
                          onChange={toggleSelectAll}
                          disabled={submitting || selectableItems.length === 0}
                          aria-label="Chọn tất cả"
                        />
                      </th>
                      <th className="px-3 py-2 text-left">Mã đơn</th>
                      <th className="px-3 py-2 text-left">Khách hàng</th>
                      <th className="px-3 py-2 text-left">Email/Profile</th>
                      <th className="px-3 py-2 text-left">Hạn</th>
                      <th className="px-3 py-2 text-left">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {items.map((it) => {
                      const checked = selected.has(it.order_code);
                      const disabled = it.in_tracking;
                      return (
                        <tr
                          key={it.order_code}
                          className={
                            disabled
                              ? "bg-white/[0.015] text-white/45"
                              : "hover:bg-white/[0.04]"
                          }
                        >
                          <td className="px-3 py-2 align-top">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-emerald-500"
                              checked={checked}
                              onChange={() => toggleSelect(it.order_code)}
                              disabled={disabled || submitting}
                            />
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">
                            {it.order_code}
                            {disabled && (
                              <span className="ml-2 inline-flex rounded-md border border-emerald-400/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] text-emerald-300">
                                Đã track
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <div className="text-white/90">
                              {it.customer || "—"}
                            </div>
                            <div className="text-[11px] text-white/55">
                              {it.contact || ""}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-xs break-all">
                            {it.information_order || "—"}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs">
                            {it.expiry_date || "—"}
                          </td>
                          <td className="px-3 py-2">
                            <StatusPill status={it.status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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

export default AddTrackingOrdersModal;
