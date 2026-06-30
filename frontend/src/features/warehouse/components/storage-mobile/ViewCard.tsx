import { useCallback, useRef, useState } from "react";
import {
  ClockIcon,
  CubeIcon,
  PencilSquareIcon,
  TrashIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import type { WarehouseItem } from "../../types";
import { getWarehouseTheme } from "../../utils/warehouseTheme";
import {
  formatWarehouseRowForCopy,
  warehouseStatusClass,
} from "../storageItemCardUtils";
import { CopyableValue } from "../CopyableValue";
import { ExpireModal } from "../ExpireModal";
import { MobileDetail } from "./MobileDetail";

type ViewCardProps = {
  item: WarehouseItem;
  isExpanded: boolean;
  loading: boolean;
  onToggle: () => void;
  onStartEdit: (item: WarehouseItem) => void;
  onDelete: (id?: number) => void;
  onCreatePackage?: (item: WarehouseItem) => void;
  onExpireStock?: (stockId: number, deleteStock: boolean) => Promise<void>;
};

export function ViewCard({
  item,
  isExpanded,
  loading,
  onToggle,
  onStartEdit,
  onDelete,
  onCreatePackage,
  onExpireStock,
}: ViewCardProps) {
  const [expireModalOpen, setExpireModalOpen] = useState(false);
  const theme = getWarehouseTheme(item.status);
  const [rowCopied, setRowCopied] = useState(false);
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copyRow = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(formatWarehouseRowForCopy(item));
      setRowCopied(true);
      if (resetRef.current) clearTimeout(resetRef.current);
      resetRef.current = setTimeout(() => {
        setRowCopied(false);
        resetRef.current = null;
      }, 1600);
    } catch {
      /* ignore */
    }
  }, [item]);

  const exp = item.expires_at
    ? new Date(item.expires_at).toLocaleDateString("vi-VN")
    : "â€”";

  return (
    <div
      className={`glass-panel relative overflow-hidden rounded-[24px] border p-4 transition-all duration-500 ${theme.rowSurfaceClass}`}
    >
      <button type="button" className="w-full text-left" onClick={onToggle}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className={`text-[10px] font-bold uppercase tracking-widest ${theme.accentTextClass}`}>
              {item.category || "â€”"}
            </p>
            <p className="mt-0.5 truncate text-sm font-bold text-white">
              {item.account || "â€”"}
            </p>
          </div>
          {item.status ? (
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${warehouseStatusClass(
                item.status
              )}`}
            >
              {item.status}
            </span>
          ) : null}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-white/50">
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-bold text-indigo-200">
            {exp}
          </span>
          <span className="flex items-center gap-1">
            V:{" "}
            {item.is_verified ? (
              <CheckCircleSolid className="h-4 w-4 text-emerald-400" />
            ) : (
              <XCircleIcon className="h-4 w-4 text-white/25" />
            )}
          </span>
        </div>
      </button>

      {isExpanded && (
        <div
          className={`mt-4 min-w-0 max-w-full overflow-hidden animate-in fade-in slide-in-from-top-2 rounded-[20px] border p-4 duration-300 ${theme.expandablePanelClass}`}
        >
          <p className="mb-3 text-center text-xs font-semibold text-indigo-50">
            Chi tiáº¿t tÃ i khoáº£n
          </p>
          <div className="space-y-3">
            <MobileDetail label="Máº­t kháº©u" theme={theme}>
              <CopyableValue value={item.password} mono showButtonOnHover={false} />
            </MobileDetail>
            <MobileDetail label="Mail dá»± phÃ²ng" theme={theme}>
              <CopyableValue value={item.backup_email} showButtonOnHover={false} />
            </MobileDetail>
            <MobileDetail label="2FA" theme={theme}>
              <CopyableValue value={item.two_fa} mono showButtonOnHover={false} />
            </MobileDetail>
            <div
              className={`min-w-0 overflow-hidden rounded-xl border p-3 text-center ${theme.detailItemClass}`}
            >
              <p className={`text-[10px] font-bold uppercase ${theme.detailLabelClass}`}>Ghi chÃº</p>
              <p
                className="mt-1 line-clamp-4 break-words text-sm text-indigo-50"
                title={String(item.note || "").trim() || undefined}
              >
                {String(item.note || "").trim() || "KhÃ´ng cÃ³ ghi chÃº."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void copyRow()}
            className="mt-3 w-full rounded-full bg-gradient-to-r from-emerald-500 to-green-600 py-2 text-xs font-semibold text-white"
          >
            {rowCopied ? "ÄÃ£ sao chÃ©p" : "Sao chÃ©p táº¥t cáº£"}
          </button>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onStartEdit(item)}
          disabled={loading}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 py-2 text-sm font-medium text-amber-200/90"
        >
          <PencilSquareIcon className="h-4 w-4" />
          Sua
        </button>
        {onCreatePackage && (
          <button
            type="button"
            onClick={() => onCreatePackage(item)}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/15 py-2 text-sm font-medium text-indigo-300"
          >
            <CubeIcon className="h-4 w-4" />
            Tao Goi
          </button>
        )}
        {onExpireStock && item.id != null && (
          <button
            type="button"
            onClick={() => setExpireModalOpen(true)}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-orange-500/25 bg-orange-500/10 py-2 text-sm font-medium text-orange-300/90"
          >
            <ClockIcon className="h-4 w-4" />
            Het Han
          </button>
        )}
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          disabled={loading || item.id == null}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 py-2 text-sm font-medium text-rose-300/90"
        >
          <TrashIcon className="h-4 w-4" />
          Xoa
        </button>
      </div>

      {onExpireStock && item.id != null && (
        <ExpireModal
          isOpen={expireModalOpen}
          stockId={item.id}
          onClose={() => setExpireModalOpen(false)}
          onConfirm={async (deleteStock) => {
            await onExpireStock(item.id!, deleteStock);
            setExpireModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
