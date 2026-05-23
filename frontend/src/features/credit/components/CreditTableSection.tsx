import { useState } from "react";
import type { CreditLogItem, CreditLogsPagination } from "../types";
import { CreditTableBlock, type CreditActionType } from "./CreditTableBlock";
import { submitCreditLogAction } from "../api/creditLogsApi";
import CreditCashoutStkModal from "./CreditCashoutStkModal";

type CreditTableSectionProps = {
  loading: boolean;
  items: CreditLogItem[];
  pagination: CreditLogsPagination;
  onPageChange: (next: number) => void;
  onReload?: () => void;
};

export function CreditTableSection({
  loading,
  items,
  pagination,
  onPageChange,
  onReload,
}: CreditTableSectionProps) {
  const canPrev = pagination.page > 1;
  const canNext = pagination.page < pagination.total_pages;
  const [actionBusyIds, setActionBusyIds] = useState<Record<number, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [cashoutTarget, setCashoutTarget] = useState<CreditLogItem | null>(null);
  const [cashoutSubmitting, setCashoutSubmitting] = useState(false);

  const availableDisplayItems = items.filter((item) => item.is_available);
  const appliedOrUnavailableDisplayItems = items.filter((item) => !item.is_available);

  const runAction = async (
    item: CreditLogItem,
    action: CreditActionType,
    options: { shopBankAccountId?: number } = {}
  ) => {
    if (actionBusyIds[item.id]) return;
    setActionError(null);
    setActionBusyIds((prev) => ({ ...prev, [item.id]: true }));
    try {
      await submitCreditLogAction(item.id, action, options);
      onReload?.();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Không thể cập nhật credit log.");
      throw error;
    } finally {
      setActionBusyIds((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    }
  };

  const handleAction = async (item: CreditLogItem, action: CreditActionType) => {
    if (action === "complete") {
      setActionError(null);
      setCashoutTarget(item);
      return;
    }
    try {
      await runAction(item, action);
    } catch {
      // error đã được set trong runAction; nuốt để không phá UI.
    }
  };

  const handleCashoutConfirm = async (shopBankAccountId: number) => {
    if (!cashoutTarget) return;
    setCashoutSubmitting(true);
    try {
      await runAction(cashoutTarget, "complete", { shopBankAccountId });
      setCashoutTarget(null);
    } catch {
      // error giữ trong actionError + modal vẫn mở để retry chọn STK khác.
    } finally {
      setCashoutSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {actionError ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          {actionError}
        </div>
      ) : null}

      <CreditTableBlock
        title="Bảng credit khả dụng"
        description="Danh sách credit còn số dư để áp dụng cho đơn mới."
        loading={loading}
        items={availableDisplayItems}
        emptyMessage="Không có credit khả dụng trong bộ lọc hiện tại."
        onAction={handleAction}
        showActions
        showAvailableColumn
        isActionBusy={(id) => Boolean(actionBusyIds[id])}
      />

      <CreditTableBlock
        title="Bảng credit đã áp dụng / không khả dụng"
        description="Theo dõi các credit đã dùng hoặc đã hết khả năng áp dụng."
        loading={loading}
        items={appliedOrUnavailableDisplayItems}
        emptyMessage="Không có credit đã áp dụng hoặc không khả dụng trong bộ lọc hiện tại."
        onAction={handleAction}
        showActions={false}
        showAvailableColumn={false}
        mergeUsageColumn
        isActionBusy={(id) => Boolean(actionBusyIds[id])}
      />

      <div className="rounded-[20px] border border-white/15 bg-slate-900/50 p-4">
        <div className="flex items-center justify-between text-sm text-slate-300">
          <span>
            Trang {pagination.page}/{Math.max(1, pagination.total_pages)} - Tổng {pagination.total}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!canPrev}
              onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
              className="rounded-lg border border-white/10 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Trước
            </button>
            <button
              type="button"
              disabled={!canNext}
              onClick={() => onPageChange(pagination.page + 1)}
              className="rounded-lg border border-white/10 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      <CreditCashoutStkModal
        isOpen={Boolean(cashoutTarget)}
        item={cashoutTarget}
        onClose={() => {
          if (cashoutSubmitting) return;
          setCashoutTarget(null);
        }}
        onConfirm={handleCashoutConfirm}
        submitting={cashoutSubmitting}
      />
    </div>
  );
}
