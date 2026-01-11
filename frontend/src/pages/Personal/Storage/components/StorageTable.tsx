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
      className={`${inputClass} bg-white/10 border-white/20`}
      value={value || ""}
      onChange={(e) => onDraftChange(field, e.target.value)}
    />
  );

  return (
    <div className="overflow-auto rounded-xl border border-white/10 bg-white/5">
      <table className="min-w-full text-sm text-white">
        <thead className="bg-white/10 text-left">
          <tr>
            <th className="px-4 py-2 font-semibold">Loại</th>
            <th className="px-4 py-2 font-semibold">Tài khoản</th>
            <th className="px-4 py-2 font-semibold">Mật khẩu</th>
            <th className="px-4 py-2 font-semibold">Mail dự phòng</th>
            <th className="px-4 py-2 font-semibold">2FA</th>
            <th className="px-4 py-2 font-semibold">Trạng thái</th>
            <th className="px-4 py-2 font-semibold">Ghi chú</th>
            <th className="px-4 py-2 font-semibold text-center">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {editingId === "new" && draft && (
            <tr className="border-t border-white/5 bg-white/5">
              <td className="px-4 py-2 whitespace-nowrap font-semibold">
                {renderInput("category", draft.category)}
              </td>
              <td className="px-4 py-2">{renderInput("account", draft.account)}</td>
              <td className="px-4 py-2">{renderInput("password", draft.password)}</td>
              <td className="px-4 py-2">{renderInput("backup_email", draft.backup_email)}</td>
              <td className="px-4 py-2">{renderInput("two_fa", draft.two_fa)}</td>
              <td className="px-4 py-2">{renderInput("status", draft.status)}</td>
              <td className="px-4 py-2">{renderInput("note", draft.note)}</td>
              <td className="px-4 py-2 text-center">
                <div className="inline-flex items-center gap-2">
                  <button
                    type="button"
                    className="p-2 rounded-lg bg-emerald-600/70 hover:bg-emerald-600 text-white transition disabled:opacity-60"
                    onClick={() => onSave(undefined)}
                    disabled={loading}
                    title="Lưu"
                  >
                    <CheckIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition disabled:opacity-60"
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
          {items.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-6 text-center text-white/70">
                Không có hàng tồn kho
              </td>
            </tr>
          ) : (
            items.map((item) => {
              const isEditing = editingId === item.id;
              const current = isEditing ? draft || item : item;
              return (
                <tr
                  key={item.id ?? `${item.category ?? ""}-${item.account ?? ""}`}
                  className="border-t border-white/5 hover:bg-white/5"
                >
                  <td className="px-4 py-2 whitespace-nowrap font-semibold">
                    {isEditing ? renderInput("category", current.category) : item.category || "N/A"}
                  </td>
                  <td className="px-4 py-2">
                    {isEditing ? (
                      renderInput("account", current.account)
                    ) : (
                      <div className="font-medium">{item.account || "Chưa có tài khoản"}</div>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {isEditing ? renderInput("password", current.password) : item.password || <span className="text-white/60">--</span>}
                  </td>
                  <td className="px-4 py-2">
                    {isEditing ? (
                      renderInput("backup_email", current.backup_email)
                    ) : (
                      item.backup_email || <span className="text-white/60">--</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {isEditing ? renderInput("two_fa", current.two_fa) : item.two_fa || <span className="text-white/60">--</span>}
                  </td>
                  <td className="px-4 py-2">
                    {isEditing ? (
                      renderInput("status", current.status)
                    ) : (
                      <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                        {item.status || "--"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {isEditing ? (
                      renderInput("note", current.note)
                    ) : (
                      <div className="text-white/80 whitespace-pre-wrap break-words">
                        {item.note || "--"}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="inline-flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            className="p-2 rounded-lg bg-emerald-600/70 hover:bg-emerald-600 text-white transition disabled:opacity-60"
                            onClick={() => onSave(item.id)}
                            disabled={loading}
                            title="Lưu"
                          >
                            <CheckIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="p-2 rounded-lg bg-rose-600/70 hover:bg-rose-600 text-white transition disabled:opacity-60"
                            onClick={() => onDelete(item.id)}
                            disabled={loading}
                            title="Xoá"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition disabled:opacity-60"
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
                            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-indigo-100 hover:text-white transition disabled:opacity-60"
                            onClick={() => onStartEdit(item)}
                            disabled={loading}
                            title="Sửa"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-rose-200 hover:text-rose-100 transition disabled:opacity-60"
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
