import React from "react";
import {
  CheckIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { WarehouseItem, inputClass } from "../types";

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
  const renderInput = (field: keyof WarehouseItem, value: string | null | undefined) => (
    <input
      className={`${inputClass} bg-white/5 border-white/5 focus:bg-white/10 text-white placeholder:text-white/20`}
      value={value || ""}
      onChange={(e) => onDraftChange(field, e.target.value)}
    />
  );

  return (
    <div className="bg-transparent overflow-visible">
      <table className="min-w-full border-separate border-spacing-y-4 text-white">
        <thead>
          <tr className="[&>th]:px-5 [&>th]:pb-2 [&>th]:text-[11px] [&>th]:font-black [&>th]:uppercase [&>th]:tracking-[0.2em] [&>th]:text-indigo-300/70 [&>th]:text-left">
            <th className="w-[120px]">LOẠI</th>
            <th className="w-[180px]">TÀI KHOẢN</th>
            <th className="w-[140px]">MẬT KHẨU</th>
            <th className="w-[180px]">MAIL DỰ PHÒNG</th>
            <th className="w-[120px]">2FA</th>
            <th className="w-[120px]">TRẠNG THÁI</th>
            <th>GHI CHÚ</th>
            <th className="w-[140px] text-right pr-6">THAO TÁC</th>
          </tr>
        </thead>
        <tbody className="">
          {editingId === "new" && draft && (
            <tr className="group/row animate-in fade-in slide-in-from-top-2 duration-300 relative z-20">
              <td className="px-5 py-5 first:rounded-l-[24px] glass-panel border-y border-indigo-500/30 bg-indigo-500/10 transition-all duration-500">
                {renderInput("category", draft.category)}
              </td>
              <td className="px-5 py-5 glass-panel border-y border-indigo-500/30 bg-indigo-500/10 transition-all duration-500">
                {renderInput("account", draft.account)}
              </td>
              <td className="px-5 py-5 glass-panel border-y border-indigo-500/30 bg-indigo-500/10 transition-all duration-500">
                {renderInput("password", draft.password)}
              </td>
              <td className="px-5 py-5 glass-panel border-y border-indigo-500/30 bg-indigo-500/10 transition-all duration-500">
                {renderInput("backup_email", draft.backup_email)}
              </td>
              <td className="px-5 py-5 glass-panel border-y border-indigo-500/30 bg-indigo-500/10 transition-all duration-500">
                {renderInput("two_fa", draft.two_fa)}
              </td>
              <td className="px-5 py-5 glass-panel border-y border-indigo-500/30 bg-indigo-500/10 transition-all duration-500">
                {renderInput("status", draft.status)}
              </td>
              <td className="px-5 py-5 glass-panel border-y border-indigo-500/30 bg-indigo-500/10 transition-all duration-500">
                {renderInput("note", draft.note)}
              </td>
              <td className="px-5 py-5 last:rounded-r-[24px] glass-panel border-y border-indigo-500/30 bg-indigo-500/10 transition-all duration-500 text-right pr-6">
                <div className="inline-flex items-center gap-2">
                  <button
                    type="button"
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/40 transition-all"
                    onClick={() => onSave(undefined)}
                    disabled={loading}
                    title="Lưu"
                  >
                    <CheckIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
                    onClick={onCancel}
                    disabled={loading}
                    title="Hủy"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          )}
          {items.length === 0 && editingId !== "new" ? (
            <tr>
              <td colSpan={8} className="px-5 py-12 text-center">
                <div className="text-white/40 text-sm font-medium tracking-wide">
                  HỆ THỐNG TRỐNG: KHÔNG CÓ HÀNG TỒN KHO
                </div>
              </td>
            </tr>
          ) : (
            items.map((item) => {
              const isEditing = editingId === item.id;
              const current = isEditing ? draft || item : item;
              return (
                <tr
                  key={item.id ?? `${item.category ?? ""}-${item.account ?? ""}`}
                  className={`group/row cursor-pointer transition-all duration-500 relative ${isEditing ? 'z-20' : 'z-10'}`}
                >
                  <td className={`px-5 py-5 first:rounded-l-[24px] glass-panel border-y transition-all duration-500 ${isEditing ? 'border-indigo-500/30 bg-indigo-500/10' : 'border-white/5 group-hover/row:border-indigo-500/30 group-hover/row:bg-indigo-500/5'}`}>
                    {isEditing ? (
                      renderInput("category", current.category)
                    ) : (
                      <span className="text-sm font-bold text-white tracking-wider uppercase whitespace-nowrap">
                        {item.category || "—"}
                      </span>
                    )}
                  </td>
                  <td className={`px-5 py-5 glass-panel border-y transition-all duration-500 ${isEditing ? 'border-indigo-500/30 bg-indigo-500/10' : 'border-white/5 group-hover/row:border-indigo-500/30 group-hover/row:bg-indigo-500/5'}`}>
                    <div className="text-sm font-bold text-white tracking-tight">
                      {isEditing ? renderInput("account", current.account) : item.account || "—"}
                    </div>
                  </td>
                  <td className={`px-5 py-5 glass-panel border-y transition-all duration-500 ${isEditing ? 'border-indigo-500/30 bg-indigo-500/10' : 'border-white/5 group-hover/row:border-indigo-500/30 group-hover/row:bg-indigo-500/5'}`}>
                    <div className="text-[13px] font-medium text-white/80">
                      {isEditing ? renderInput("password", current.password) : item.password || "—"}
                    </div>
                  </td>
                  <td className={`px-5 py-5 glass-panel border-y transition-all duration-500 ${isEditing ? 'border-indigo-500/30 bg-indigo-500/10' : 'border-white/5 group-hover/row:border-indigo-500/30 group-hover/row:bg-indigo-500/5'}`}>
                    <div className="text-[13px] font-medium text-white/60 italic">
                      {isEditing ? renderInput("backup_email", current.backup_email) : item.backup_email || "—"}
                    </div>
                  </td>
                  <td className={`px-5 py-5 glass-panel border-y transition-all duration-500 ${isEditing ? 'border-indigo-500/30 bg-indigo-500/10' : 'border-white/5 group-hover/row:border-indigo-500/30 group-hover/row:bg-indigo-500/5'}`}>
                    {isEditing ? renderInput("two_fa", current.two_fa) : <span className="text-xs font-black text-indigo-400/80">{item.two_fa || "—"}</span>}
                  </td>
                  <td className={`px-5 py-5 glass-panel border-y transition-all duration-500 ${isEditing ? 'border-indigo-500/30 bg-indigo-500/10' : 'border-white/5 group-hover/row:border-indigo-500/30 group-hover/row:bg-indigo-500/5'}`}>
                    {isEditing ? (
                      renderInput("status", current.status)
                    ) : (
                      <span className="inline-flex px-2.5 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-wider text-indigo-200 whitespace-nowrap">
                        {item.status || "—"}
                      </span>
                    )}
                  </td>
                  <td className={`px-5 py-5 glass-panel border-y transition-all duration-500 ${isEditing ? 'border-indigo-500/30 bg-indigo-500/10' : 'border-white/5 group-hover/row:border-indigo-500/30 group-hover/row:bg-indigo-500/5'}`}>
                    <div className="text-[12px] font-medium text-white/60 max-w-xs truncate">
                      {isEditing ? renderInput("note", current.note) : item.note || "—"}
                    </div>
                  </td>
                  <td className={`px-5 py-5 last:rounded-r-[24px] glass-panel border-y transition-all duration-500 text-right pr-6 ${isEditing ? 'border-indigo-500/30 bg-indigo-500/10' : 'border-white/5 group-hover/row:border-indigo-500/30 group-hover/row:bg-indigo-500/5'}`}>
                    <div className="inline-flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/40 transition-all"
                            onClick={() => onSave(item.id)}
                            disabled={loading}
                            title="Lưu"
                          >
                            <CheckIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 hover:bg-rose-500/40 transition-all"
                            onClick={() => onDelete(item.id)}
                            disabled={loading}
                            title="Xoá"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
                            onClick={onCancel}
                            disabled={loading}
                            title="Hủy"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-indigo-300/60 hover:text-white hover:bg-indigo-500/20 transition-all"
                            onClick={() => onStartEdit(item)}
                            disabled={loading}
                            title="Sửa"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-all"
                            onClick={() => onDelete(item.id)}
                            disabled={loading}
                            title="Xoá"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
