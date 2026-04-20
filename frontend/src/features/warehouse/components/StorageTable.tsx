import React from "react";
import {
  CheckIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import { WarehouseItem } from "../types";

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
  "w-full px-2.5 py-1.5 rounded-lg bg-white/[0.06] border border-indigo-500/30 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-400/50 focus:bg-white/[0.08] transition-all";
const NOTE_PREVIEW_MAX_CHARS = 90;

const toNotePreview = (value?: string | null) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "—";
  if (text.length <= NOTE_PREVIEW_MAX_CHARS) return text;
  return `${text.slice(0, NOTE_PREVIEW_MAX_CHARS)}...`;
};

const statusColor = (s?: string | null) => {
  const v = (s || "").toLowerCase();
  if (v.includes("tồn")) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";
  if (v.includes("dùng") || v.includes("dung")) return "bg-sky-500/15 text-sky-400 border-sky-500/20";
  if (v.includes("hết") || v.includes("het")) return "bg-rose-500/15 text-rose-400 border-rose-500/20";
  return "bg-white/5 text-white/60 border-white/10";
};

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

  const thCls = "px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-white/30 text-left whitespace-nowrap";

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-white" style={{ minWidth: 1080 }}>
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className={thCls} style={{ width: 100 }}>Loại</th>
              <th className={thCls} style={{ width: 190 }}>Tài khoản</th>
              <th className={thCls} style={{ width: 110 }}>Mật khẩu</th>
              <th className={thCls} style={{ width: 190 }}>Mail dự phòng</th>
              <th className={thCls} style={{ width: 90 }}>2FA</th>
              <th className={thCls} style={{ width: 100 }}>Trạng thái</th>
              <th className={thCls} style={{ width: 90 }}>Hạn SD</th>
              <th className={`${thCls} !text-center`} style={{ width: 50 }}>V</th>
              <th className={thCls} style={{ width: 320 }}>Ghi chú</th>
              <th className={`${thCls} !text-right !pr-4`} style={{ width: 90 }}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {/* --- New row --- */}
            {editingId === "new" && draft && (
              <tr className="bg-indigo-500/[0.06]">
                <td className="px-3 py-2.5">{renderInput("category", draft.category, "VD: ADOBE EDU")}</td>
                <td className="px-3 py-2.5">{renderInput("account", draft.account, "Email / Username")}</td>
                <td className="px-3 py-2.5">{renderInput("password", draft.password, "••••••")}</td>
                <td className="px-3 py-2.5">{renderInput("backup_email", draft.backup_email, "Backup mail")}</td>
                <td className="px-3 py-2.5">{renderInput("two_fa", draft.two_fa, "2FA code")}</td>
                <td className="px-3 py-2.5">{renderInput("status", draft.status, "Trạng thái")}</td>
                <td className="px-3 py-2.5">
                  <input
                    type="date"
                    className={inputCls}
                    value={draft.expires_at?.slice(0, 10) || ""}
                    onChange={(e) => onDraftChange("expires_at", e.target.value)}
                  />
                </td>
                <td className="px-3 py-2.5 text-center">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 rounded accent-indigo-500 cursor-pointer"
                    checked={!!draft.is_verified}
                    onChange={(e) => onDraftChange("is_verified", e.target.checked ? "true" : "")}
                  />
                </td>
                <td className="px-3 py-2.5">{renderInput("note", draft.note, "Ghi chú...")}</td>
                <td className="px-3 py-2.5 text-right">
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
                  <td className="px-3 py-2.5">
                    {isEditing ? (
                      renderInput("category", cur.category)
                    ) : (
                      <span className="text-[11px] font-bold text-white/90 uppercase tracking-wide">
                        {item.category || "—"}
                      </span>
                    )}
                  </td>

                  {/* Tài khoản */}
                  <td className="px-3 py-2.5">
                    {isEditing ? (
                      renderInput("account", cur.account)
                    ) : (
                      <span className="text-xs text-white/80 break-all leading-relaxed">
                        {item.account || "—"}
                      </span>
                    )}
                  </td>

                  {/* Mật khẩu */}
                  <td className="px-3 py-2.5">
                    {isEditing ? (
                      renderInput("password", cur.password)
                    ) : (
                      <span className="text-xs text-white/50 font-mono">
                        {item.password || "—"}
                      </span>
                    )}
                  </td>

                  {/* Mail dự phòng */}
                  <td className="px-3 py-2.5">
                    {isEditing ? (
                      renderInput("backup_email", cur.backup_email)
                    ) : (
                      <span className="text-xs text-white/40 break-all leading-relaxed">
                        {item.backup_email || "—"}
                      </span>
                    )}
                  </td>

                  {/* 2FA */}
                  <td className="px-3 py-2.5">
                    {isEditing ? (
                      renderInput("two_fa", cur.two_fa)
                    ) : (
                      <span className="text-xs text-white/50">
                        {item.two_fa || "—"}
                      </span>
                    )}
                  </td>

                  {/* Trạng thái */}
                  <td className="px-3 py-2.5">
                    {isEditing ? (
                      renderInput("status", cur.status)
                    ) : (
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap ${statusColor(item.status)}`}
                      >
                        {item.status || "—"}
                      </span>
                    )}
                  </td>

                  {/* Hạn SD */}
                  <td className="px-3 py-2.5">
                    {isEditing ? (
                      <input
                        type="date"
                        className={inputCls}
                        value={cur.expires_at?.slice(0, 10) || ""}
                        onChange={(e) => onDraftChange("expires_at", e.target.value)}
                      />
                    ) : (
                      <span className="text-xs text-white/50 tabular-nums whitespace-nowrap">
                        {item.expires_at
                          ? new Date(item.expires_at).toLocaleDateString("vi-VN")
                          : "—"}
                      </span>
                    )}
                  </td>

                  {/* Verified */}
                  <td className="px-3 py-2.5 text-center">
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
                  <td className="px-3 py-2.5 max-w-[320px]">
                    {isEditing ? (
                      renderInput("note", cur.note)
                    ) : (
                      <span
                        className="block text-[11px] text-white/35 whitespace-nowrap overflow-hidden text-ellipsis"
                        title={item.note || ""}
                      >
                        {toNotePreview(item.note)}
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2.5 text-right">
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
    </div>
  );
};

const ArchiveIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
  </svg>
);
