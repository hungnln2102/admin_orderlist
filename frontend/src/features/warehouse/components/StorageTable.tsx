import React from "react";
import {
  CheckIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import { WarehouseItem } from "../types";
import { ResponsiveTable } from "@/components/ui/ResponsiveTable";
import { StorageMobileList } from "./StorageItemCard";
import { warehouseStatusClass } from "./storageItemCardUtils";

type StorageTableProps = {
  items: WarehouseItem[];
  draft: WarehouseItem | null;
  editingId: number | "new" | null;
  loading: boolean;
  onDraftChange: (key: keyof WarehouseItem, value: string) => void;
  onSave: (id?: number) => void;
  onDelete: (id?: number) => void;
  onCancel: () => void;
  onStartEdit: (item: WarehouseItem) => void;
  onStartCreate: () => void;
};

const inputCls =
  "w-full min-w-0 max-w-full px-2.5 py-1.5 rounded-lg bg-white/[0.06] border border-indigo-500/30 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-400/50 focus:bg-white/[0.08] transition-all";

const cellText =
  "block w-full min-w-0 text-xs text-white/80 truncate [overflow-wrap:normal]";
const cellMono =
  "block w-full min-w-0 text-xs text-white/50 font-mono truncate [overflow-wrap:normal]";
const cellMuted = "block w-full min-w-0 text-xs text-white/40 truncate [overflow-wrap:normal]";

const tdCls = "min-w-0 px-1.5 sm:px-2.5 py-2 align-middle overflow-hidden";

export const StorageTable: React.FC<StorageTableProps> = ({
  items,
  draft,
  editingId,
  loading,
  onDraftChange,
  onSave,
  onDelete,
  onCancel,
  onStartEdit,
  onStartCreate: _onStartCreate,
}) => {
  const renderInput = (
    field: keyof WarehouseItem,
    value: string | null | undefined,
    placeholder?: string
  ) => (
    <input
      className={inputCls}
      value={value || ""}
      placeholder={placeholder}
      onChange={(e) => onDraftChange(field, e.target.value)}
    />
  );

  const EditActions: React.FC<{ isNew?: boolean; itemId?: number }> = ({
    isNew,
    itemId,
  }) => (
    <div className="flex items-center gap-1">
      <button
        className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/20 transition-colors"
        onClick={() => onSave(isNew ? undefined : itemId)}
        disabled={loading}
        title="Lưu"
      >
        <CheckIcon className="w-4 h-4" />
      </button>
      {!isNew && (
        <button
          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-colors"
          onClick={() => onDelete(itemId)}
          disabled={loading}
          title="Xoá"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      )}
      <button
        className="p-1.5 rounded-lg text-white/40 hover:bg-white/10 transition-colors"
        onClick={onCancel}
        disabled={loading}
        title="Hủy"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );

  const thCls =
    "px-1.5 sm:px-2.5 py-2 sm:py-2.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-tight sm:tracking-wider text-white/30 text-left whitespace-nowrap min-w-0";

  const mobileList = (
    <StorageMobileList
      items={items}
      draft={draft}
      editingId={editingId}
      loading={loading}
      onDraftChange={onDraftChange}
      onSave={onSave}
      onDelete={onDelete}
      onCancel={onCancel}
      onStartEdit={onStartEdit}
    />
  );

  return (
    <div className="w-full min-w-0 max-w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <ResponsiveTable
        className="w-full"
        showCardOnMobile
        cardView={mobileList}
      >
        <div className="w-full min-w-0 max-w-full overflow-x-hidden">
          <table className="w-full max-w-full table-fixed text-white">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className={`${thCls} w-[7%]`}>Loại</th>
              <th className={`${thCls} w-[15%]`}>Tài khoản</th>
              <th className={`${thCls} w-[8%]`}>Mật khẩu</th>
              <th className={`${thCls} w-[15%]`}>Mail dự phòng</th>
              <th className={`${thCls} w-[6%]`}>2FA</th>
              <th className={`${thCls} w-[9%]`}>Trạng thái</th>
              <th className={`${thCls} w-[8%]`}>Hạn SD</th>
              <th className={`${thCls} w-[4%] !text-center`}>V</th>
              <th className={`${thCls} w-[19%] min-w-0`}>Ghi chú</th>
              <th className={`${thCls} w-[9%] !text-right !pr-2 sm:!pr-3`} />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {/* --- New row --- */}
            {editingId === "new" && draft && (
              <tr className="bg-indigo-500/[0.06]">
                <td className={tdCls}>{renderInput("category", draft.category, "VD: ADOBE EDU")}</td>
                <td className={tdCls}>{renderInput("account", draft.account, "Email / Username")}</td>
                <td className={tdCls}>{renderInput("password", draft.password, "••••••")}</td>
                <td className={tdCls}>{renderInput("backup_email", draft.backup_email, "Backup mail")}</td>
                <td className={tdCls}>{renderInput("two_fa", draft.two_fa, "2FA code")}</td>
                <td className={tdCls}>{renderInput("status", draft.status, "Trạng thái")}</td>
                <td className={tdCls}>
                  <input
                    type="date"
                    className={inputCls}
                    value={draft.expires_at?.slice(0, 10) || ""}
                    onChange={(e) => onDraftChange("expires_at", e.target.value)}
                  />
                </td>
                <td className={`${tdCls} text-center`}>
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 rounded accent-indigo-500 cursor-pointer"
                    checked={!!draft.is_verified}
                    onChange={(e) => onDraftChange("is_verified", e.target.checked ? "true" : "")}
                  />
                </td>
                <td className={tdCls}>{renderInput("note", draft.note, "Ghi chú...")}</td>
                <td className={`${tdCls} text-right`}>
                  <EditActions isNew />
                </td>
              </tr>
            )}

            {/* --- Empty --- */}
            {items.length === 0 && editingId !== "new" && (
              <tr>
                <td colSpan={10} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                      <ArchiveIcon className="w-6 h-6 text-white/20" />
                    </div>
                    <p className="text-sm text-white/30">Chưa có dữ liệu tồn kho</p>
                  </div>
                </td>
              </tr>
            )}

            {/* --- Data rows --- */}
            {items.map((item) => {
              const isEditing = editingId === item.id;
              const cur = isEditing ? draft || item : item;

              return (
                <tr
                  key={item.id ?? `${item.category}-${item.account}`}
                  className={`group transition-colors duration-200 ${
                    isEditing
                      ? "bg-indigo-500/[0.06]"
                      : "hover:bg-white/[0.02]"
                  }`}
                >
                  {/* Loại */}
                  <td className={tdCls}>
                    {isEditing ? (
                      renderInput("category", cur.category)
                    ) : (
                      <span
                        className="block w-full min-w-0 text-[10px] sm:text-[11px] font-bold text-white/90 uppercase tracking-wide truncate"
                        title={item.category || ""}
                      >
                        {item.category || "—"}
                      </span>
                    )}
                  </td>

                  {/* Tài khoản */}
                  <td className={tdCls}>
                    {isEditing ? (
                      renderInput("account", cur.account)
                    ) : (
                      <span className={cellText} title={item.account || ""}>
                        {item.account || "—"}
                      </span>
                    )}
                  </td>

                  {/* Mật khẩu */}
                  <td className={tdCls}>
                    {isEditing ? (
                      renderInput("password", cur.password)
                    ) : (
                      <span className={cellMono} title={item.password || ""}>
                        {item.password || "—"}
                      </span>
                    )}
                  </td>

                  {/* Mail dự phòng */}
                  <td className={tdCls}>
                    {isEditing ? (
                      renderInput("backup_email", cur.backup_email)
                    ) : (
                      <span className={cellMuted} title={item.backup_email || ""}>
                        {item.backup_email || "—"}
                      </span>
                    )}
                  </td>

                  {/* 2FA */}
                  <td className={tdCls}>
                    {isEditing ? (
                      renderInput("two_fa", cur.two_fa)
                    ) : (
                      <span className={cellMono} title={item.two_fa || ""}>
                        {item.two_fa || "—"}
                      </span>
                    )}
                  </td>

                  {/* Trạng thái */}
                  <td className={tdCls}>
                    {isEditing ? (
                      renderInput("status", cur.status)
                    ) : (
                      <span
                        className={`flex w-full min-w-0 max-w-full justify-center px-1.5 sm:px-2 py-0.5 rounded-md border text-[8px] sm:text-[9px] font-semibold uppercase tracking-tight sm:tracking-wide truncate ${warehouseStatusClass(item.status)}`}
                        title={item.status || ""}
                      >
                        {item.status || "—"}
                      </span>
                    )}
                  </td>

                  {/* Hạn SD */}
                  <td className={tdCls}>
                    {isEditing ? (
                      <input
                        type="date"
                        className={inputCls}
                        value={cur.expires_at?.slice(0, 10) || ""}
                        onChange={(e) => onDraftChange("expires_at", e.target.value)}
                      />
                    ) : (
                      <span className="block w-full min-w-0 text-[10px] sm:text-xs text-white/50 tabular-nums truncate" title={item.expires_at || ""}>
                        {item.expires_at
                          ? new Date(item.expires_at).toLocaleDateString("vi-VN")
                          : "—"}
                      </span>
                    )}
                  </td>

                  {/* Verified */}
                  <td className={`${tdCls} text-center`}>
                    {isEditing ? (
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded accent-indigo-500 cursor-pointer"
                        checked={!!cur.is_verified}
                        onChange={(e) =>
                          onDraftChange("is_verified", e.target.checked ? "true" : "")
                        }
                      />
                    ) : item.is_verified ? (
                      <CheckCircleSolid className="w-4 h-4 text-emerald-400 mx-auto" />
                    ) : (
                      <XCircleIcon className="w-4 h-4 text-white/15 mx-auto" />
                    )}
                  </td>

                  {/* Ghi chú */}
                  <td className={tdCls}>
                    {isEditing ? (
                      renderInput("note", cur.note)
                    ) : (
                      <span
                        className="block w-full min-w-0 text-[10px] sm:text-[11px] text-white/35 truncate [overflow-wrap:normal]"
                        title={item.note || ""}
                      >
                        {String(item.note || "").trim() ? item.note : "—"}
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className={`${tdCls} text-right`}>
                    {isEditing ? (
                      <EditActions itemId={item.id} />
                    ) : (
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          className="p-1.5 rounded-lg text-white/30 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                          onClick={() => onStartEdit(item)}
                          disabled={loading}
                          title="Sửa"
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1.5 rounded-lg text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          onClick={() => onDelete(item.id)}
                          disabled={loading}
                          title="Xoá"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </ResponsiveTable>
    </div>
  );
};

const ArchiveIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
  </svg>
);
