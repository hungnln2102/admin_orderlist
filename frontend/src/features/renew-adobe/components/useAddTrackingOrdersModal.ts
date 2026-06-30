import { useEffect, useMemo, useState } from "react";
import {
  addOrdersToTracking,
  fetchMatchableOrders,
  type MatchableOrder,
} from "@/features/renew-adobe/user-orders/api";
import {
  DEFAULT_ADOBE_SYSTEM_CODE,
  type AdobeSystemCode,
} from "@/features/renew-adobe/user-orders/system-options";
import { DEFAULT_TRACKING_OTP_SOURCE } from "@/features/renew-adobe/user-orders/otp-options";
import type { TrackingOtpSource } from "@/features/renew-adobe/user-orders/types";

type UseAddTrackingOrdersModalParams = {
  open: boolean;
  onSaved?: (result: { upserted: number; accepted: number }) => void;
};

export function useAddTrackingOrdersModal({ open, onSaved }: UseAddTrackingOrdersModalParams) {
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [excludeTracked, setExcludeTracked] = useState(true);
  const [items, setItems] = useState<MatchableOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [systemNote, setSystemNote] = useState<AdobeSystemCode>(DEFAULT_ADOBE_SYSTEM_CODE);
  const [otpSource, setOtpSource] = useState<TrackingOtpSource>(DEFAULT_TRACKING_OTP_SOURCE);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitInfo, setSubmitInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let aborted = false;
    setLoading(true);
    setLoadError(null);
    fetchMatchableOrders({ q: appliedSearch, excludeTracked })
      .then((rows) => {
        if (aborted) return;
        setItems(rows);
      })
      .catch((err) => {
        if (aborted) return;
        setLoadError(
          (err as Error)?.message ?? "Kh?ng t?i ???c danh s?ch ??n match."
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

  useEffect(() => {
    if (open) return;
    setSearch("");
    setAppliedSearch("");
    setExcludeTracked(true);
    setItems([]);
    setSelected(new Set());
    setSystemNote(DEFAULT_ADOBE_SYSTEM_CODE);
    setOtpSource(DEFAULT_TRACKING_OTP_SOURCE);
    setLoadError(null);
    setSubmitError(null);
    setSubmitInfo(null);
  }, [open]);

  const selectableItems = useMemo(
    () => items.filter((item) => !item.in_tracking),
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
    selectableItems.every((item) => selected.has(item.order_code));

  const toggleSelectAll = () => {
    if (allSelectableSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectableItems.map((item) => item.order_code)));
    }
  };

  const applySearch = () => setAppliedSearch(search.trim());

  const handleSubmit = async () => {
    setSubmitError(null);
    setSubmitInfo(null);
    const ids = [...selected];
    if (ids.length === 0) {
      setSubmitError("Ch?n ?t nh?t 1 ??n ?? th?m v?o tracking.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await addOrdersToTracking(ids, systemNote, otpSource);
      onSaved?.({ upserted: result.upserted, accepted: result.accepted });
      const skippedNote =
        result.skipped && result.skipped.length > 0
          ? ` B? qua ${result.skipped.length} ??n kh?ng h?p l?.`
          : "";
      setSubmitInfo(`?? l?u ${result.upserted}/${result.requested} ??n.${skippedNote}`);
      setSelected(new Set());
      const refreshed = await fetchMatchableOrders({ q: appliedSearch, excludeTracked });
      setItems(refreshed);
    } catch (err) {
      setSubmitError((err as Error)?.message ?? "Kh?ng th? l?u.");
    } finally {
      setSubmitting(false);
    }
  };

  return {
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
  };
}
