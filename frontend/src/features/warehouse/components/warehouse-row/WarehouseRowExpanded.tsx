import React, { useCallback, useRef, useState } from "react";
import { CheckIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { ProductOption } from "../../hooks/useWarehouseProducts";
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
        className="warehouse-row__expandable-cell w-full max-w-0 px-4 pb-6 pt-1 sm:px-6 sm:pb-8"
      >
        <div
          className={`warehouse-row__expandable-content min-w-0 max-w-full overflow-hidden rounded-[24px] border p-5 glass-panel-light shadow-2xl sm:rounded-[32px] sm:p-6 ${theme.expandablePanelClass}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex min-w-0 flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1 text-center">
              <p className="text-sm font-semibold text-indigo-50">
                {isEditing ? "Chỉnh sửa tài khoản" : "Chi tiết tài khoản"}
              </p>
              <p
                className="mx-auto max-w-full truncate text-xs font-semibold uppercase tracking-wide text-indigo-200"
                title={`${categoryLabel} · ${accountLabel}`}
              >
                {categoryLabel} · {accountLabel}
              </p>
            </div>
            {!isEditing && (
              <button
                type="button"
                onClick={() => void copyAll()}
                className="ml-auto rounded-full bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-emerald-900/40 hover:from-emerald-600 hover:to-green-700"
              >
                {copied ? "Đã sao chép" : "Sao chép tất cả"}
              </button>
            )}
            {isEditing && draft && (
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => onSave(item.id)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-50"
                >
                  <CheckIcon className="h-4 w-4" />
                  Lưu
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => onDelete(item.id)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-200 ring-1 ring-rose-500/25 hover:bg-rose-500/25 disabled:opacity-50"
                >
                  <TrashIcon className="h-4 w-4" />
                  Xoá
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={onCancel}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/60 ring-1 ring-white/10 hover:bg-white/10 disabled:opacity-50"
                >
                  <XMarkIcon className="h-4 w-4" />
                  Huỷ
                </button>
              </div>
            )}
          </div>

          {isEditing && draft ? (
            <WarehouseEditFields
              draft={draft}
              productOptions={productOptions}
              onChange={onDraftChange}
            />
          ) : (
            <>
              {(item.services && item.services.length > 0) ? (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left text-sm text-indigo-100">
                    <thead className="text-[10px] uppercase text-indigo-300 border-b border-indigo-500/20">
                      <tr>
                        <th className="px-3 py-2">Dịch vụ</th>
                        <th className="px-3 py-2">Mật khẩu</th>
                        <th className="px-3 py-2">Mail Backup</th>
                        <th className="px-3 py-2">2FA</th>
                        <th className="px-3 py-2">Hạn sử dụng</th>
                        <th className="px-3 py-2">Trạng thái</th>
                        <th className="px-3 py-2">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-indigo-500/10">
                      {item.services.map((srv, idx) => (
                        <tr key={srv.id || idx}>
                          <td className="px-3 py-2 font-semibold text-white">{getWarehouseServiceDisplayName(srv) || "—"}</td>
                          <td className="px-3 py-2">
                            <div className="w-fit max-w-full">
                              <CopyableValue value={srv.password} mono showButtonOnHover={false} />
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="w-fit max-w-full">
                              <CopyableValue value={srv.backup_email} showButtonOnHover={false} />
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="w-fit max-w-full">
                              <CopyableValue value={srv.two_fa} mono showButtonOnHover={false} />
                            </div>
                          </td>
                          <td className="px-3 py-2">{srv.expires_at ? new Date(srv.expires_at).toLocaleDateString('vi-VN') : "—"}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] ${srv.status === 'UNAVAILABLE' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                              {srv.status === 'UNAVAILABLE' ? "Đang Sử Dụng" : (srv.status === 'AVAILABLE' ? "Tồn Kho" : srv.status || "--")}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs opacity-75 max-w-[150px] truncate" title={srv.note || ""}>
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
