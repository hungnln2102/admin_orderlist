import React, { useCallback, useRef, useState } from "react";
import { CheckIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { ProductOption } from "../../hooks/useWarehouseProducts";
import type { ServiceNameOption } from "../../hooks/useWarehouseServiceNames";
import { WarehouseItem, getWarehouseServiceDisplayName } from "../../types";
import type { WarehouseTheme } from "../../utils/warehouseTheme";
import {
  formatWarehouseRowForCopy,
} from "../storageItemCardUtils";
import { CopyableValue } from "../CopyableValue";
import { WarehouseEditFields } from "./WarehouseEditFields";

type Props = {
  isExpanded: boolean;
  isEditing: boolean;
  totalColumns: number;
  item: WarehouseItem;
  draft: WarehouseItem | null;
  productOptions: ProductOption[];
  serviceNameOptions: ServiceNameOption[];
  theme: WarehouseTheme;
  loading: boolean;
  onDraftChange: (key: keyof WarehouseItem, value: string) => void;
  onSave: (id?: number) => void;
  onDelete: (id?: number) => void;
  onCancel: () => void;
};

export const WarehouseRowExpanded: React.FC<Props> = ({
  isExpanded,
  isEditing,
  totalColumns,
  item,
  draft,
  productOptions,
  serviceNameOptions,
  theme,
  loading,
  onDraftChange,
  onSave,
  onDelete,
  onCancel,
}) => {
  const [copied, setCopied] = useState(false);
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copyAll = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(formatWarehouseRowForCopy(item));
      setCopied(true);
      if (resetRef.current) clearTimeout(resetRef.current);
      resetRef.current = setTimeout(() => {
        setCopied(false);
        resetRef.current = null;
      }, 1600);
    } catch {
      /* ignore */
    }
  }, [item]);

  if (!isExpanded) return null;

  const accountLabel = String(item.account || "").trim() || "—";
  const categoryLabel =
    item.services?.map((srv) => getWarehouseServiceDisplayName(srv)).filter(Boolean).join(", ") ||
    String(item.category || "").trim() ||
    "—";

  return (
    <tr className="warehouse-row__expandable animate-in fade-in slide-in-from-top-2 duration-300">
      <td
        colSpan={totalColumns}
        className="warehouse-row__expandable-cell w-full max-w-0 px-4 pb-6 pt-1"
      >
        <div
          className={`warehouse-row__expandable-content min-w-0 max-w-full rounded-[28px] border p-6 glass-panel-light shadow-2xl backdrop-blur-md ${theme.expandablePanelClass}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-5 flex min-w-0 flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white">
                {isEditing ? "Chỉnh sửa tài khoản" : "Chi tiết tài khoản"}
              </p>
              <p
                className="max-w-full truncate text-[11px] font-semibold uppercase tracking-wider text-indigo-300/80 mt-0.5"
                title={`${categoryLabel} · ${accountLabel}`}
              >
                {categoryLabel} · {accountLabel}
              </p>
            </div>
            {!isEditing && (
              <button
                type="button"
                onClick={() => void copyAll()}
                className="ml-auto rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-500/15 hover:from-emerald-600 hover:to-teal-700 active:scale-95 transition-all"
              >
                {copied ? "✓ Đã sao chép" : "Sao chép tất cả"}
              </button>
            )}
            {isEditing && draft && (
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => onSave(item.id)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/20 px-3.5 py-2 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/30 hover:bg-emerald-500/30 transition-all disabled:opacity-50"
                >
                  <CheckIcon className="h-3.5 w-3.5" />
                  Lưu
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => onDelete(item.id)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500/15 px-3.5 py-2 text-xs font-semibold text-rose-300 ring-1 ring-rose-500/25 hover:bg-rose-500/25 transition-all disabled:opacity-50"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                  Xoá
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={onCancel}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 px-3.5 py-2 text-xs font-semibold text-white/70 ring-1 ring-white/10 hover:bg-white/10 transition-all disabled:opacity-50"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                  Huỷ
                </button>
              </div>
            )}
          </div>

          {isEditing && draft ? (
            <WarehouseEditFields
              draft={draft}
              productOptions={productOptions}
              serviceNameOptions={serviceNameOptions}
              onChange={onDraftChange}
            />
          ) : (
            <>
              {(item.services && item.services.length > 0) ? (
                <div className="overflow-x-auto w-full rounded-2xl border border-white/5 bg-slate-950/40 shadow-inner">
                  <table className="w-full text-left text-xs text-slate-300 border-collapse">
                    <thead>
                      <tr className="bg-slate-950/60 text-[10px] font-bold uppercase tracking-wider text-indigo-300/80 border-b border-white/5">
                        <th className="px-4 py-3 font-semibold">Dịch vụ</th>
                        <th className="px-4 py-3 font-semibold">Mật khẩu</th>
                        <th className="px-4 py-3 font-semibold">Mail Backup</th>
                        <th className="px-4 py-3 font-semibold">2FA</th>
                        <th className="px-4 py-3 font-semibold">Hạn sử dụng</th>
                        <th className="px-4 py-3 font-semibold">Trạng thái</th>
                        <th className="px-4 py-3 font-semibold">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-medium">
                      {item.services.map((srv, idx) => (
                        <tr key={srv.id || idx} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3 font-bold text-white text-xs">{getWarehouseServiceDisplayName(srv) || "—"}</td>
                          <td className="px-4 py-3">
                            <div className="w-fit max-w-full">
                              <CopyableValue value={srv.password} mono showButtonOnHover={false} />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="w-fit max-w-full">
                              <CopyableValue value={srv.backup_email} showButtonOnHover={false} />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="w-fit max-w-full">
                              <CopyableValue value={srv.two_fa} mono showButtonOnHover={false} />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-400">{srv.expires_at ? new Date(srv.expires_at).toLocaleDateString('vi-VN') : "—"}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                              srv.status === 'UNAVAILABLE' 
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}>
                              {srv.status === 'UNAVAILABLE' ? "Đang Sử Dụng" : "Tồn Kho"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400 max-w-[150px] truncate" title={srv.note || ""}>
                            {srv.note || "--"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  <DetailCard theme={theme} label="Tài khoản">
                    <CopyableValue value={item.account} showButtonOnHover={false} />
                  </DetailCard>
                  <DetailCard theme={theme} label="Mật khẩu">
                    <CopyableValue value={item.password} mono showButtonOnHover={false} />
                  </DetailCard>
                  <DetailCard theme={theme} label="Mail dự phòng">
                    <CopyableValue value={item.backup_email} showButtonOnHover={false} />
                  </DetailCard>
                  <DetailCard theme={theme} label="2FA">
                    <CopyableValue value={item.two_fa} mono showButtonOnHover={false} />
                  </DetailCard>
                </div>
              )}
            </>
          )}
        </div>
      </td>
    </tr>
  );
};

const DetailCard: React.FC<{
  theme: WarehouseTheme;
  label: string;
  children: React.ReactNode;
}> = ({ theme, label, children }) => (
  <div
    className={`min-w-0 max-w-full overflow-hidden rounded-xl border p-3 ${theme.detailItemClass}`}
  >
    <p
      className={`mb-2 text-center text-xs font-medium uppercase tracking-wide ${theme.detailLabelClass}`}
    >
      {label}
    </p>
    <div className="min-w-0 w-full overflow-hidden">{children}</div>
  </div>
);
