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
import { warehouseStatusClass } from "./storageItemCardUtils";

const inputCls =
  "w-full min-w-0 px-2.5 py-2 rounded-xl bg-white/[0.06] border border-indigo-500/25 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-indigo-400/50 focus:bg-white/[0.08] transition-all";

const labelCls = "text-[10px] font-bold text-white/35 uppercase tracking-widest";

type MobileProps = {
  items: WarehouseItem[];
  draft: WarehouseItem | null;
  editingId: number | "new" | null;
  loading: boolean;
  onDraftChange: (key: keyof WarehouseItem, value: string) => void;
  onSave: (id?: number) => void;
  onDelete: (id?: number) => void;
  onCancel: () => void;
  onStartEdit: (item: WarehouseItem) => void;
};

const CardShell: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <div
    className={`relative overflow-hidden rounded-[22px] border border-white/10 bg-slate-900/50 p-4 shadow-xl backdrop-blur-md ${className}`}
  >
    <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl" />
    <div className="relative z-10">{children}</div>
  </div>
);

const Field: React.FC<{
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  multiline?: boolean;
}> = ({ label, value, mono, multiline }) => (
  <div className="min-w-0">
    <p className={`${labelCls} mb-0.5`}>{label}</p>
    <p
      className={`text-sm break-words text-white/85 ${
        mono ? "font-mono text-xs text-white/70" : ""
      } ${multiline ? "whitespace-pre-wrap" : ""}`}
    >
      {value}
    </p>
  </div>
);

const MobileFormFields: React.FC<{
  d: WarehouseItem;
  onChange: (key: keyof WarehouseItem, value: string) => void;
}> = ({ d, onChange }) => (
  <div className="flex flex-col gap-3">
    <div>
      <p className={`${labelCls} mb-1`}>Loại</p>
      <input
        className={inputCls}
        value={d.category || ""}
        placeholder="VD: ADOBE EDU"
        onChange={(e) => onChange("category", e.target.value)}
      />
    </div>
    <div>
      <p className={`${labelCls} mb-1`}>Tài khoản</p>
      <input
        className={inputCls}
        value={d.account || ""}
        placeholder="Email / Username"
        onChange={(e) => onChange("account", e.target.value)}
      />
    </div>
    <div>
      <p className={`${labelCls} mb-1`}>Mật khẩu</p>
      <input
        className={inputCls}
        value={d.password || ""}
        type="text"
        autoComplete="off"
        onChange={(e) => onChange("password", e.target.value)}
      />
    </div>
    <div>
      <p className={`${labelCls} mb-1`}>Mail dự phòng</p>
      <input
        className={inputCls}
        value={d.backup_email || ""}
        placeholder="Backup mail"
        onChange={(e) => onChange("backup_email", e.target.value)}
      />
    </div>
    <div>
      <p className={`${labelCls} mb-1`}>2FA</p>
      <input
        className={inputCls}
        value={d.two_fa || ""}
        onChange={(e) => onChange("two_fa", e.target.value)}
      />
    </div>
    <div>
      <p className={`${labelCls} mb-1`}>Trạng thái</p>
      <input
        className={inputCls}
        value={d.status || ""}
        onChange={(e) => onChange("status", e.target.value)}
      />
    </div>
    <div>
      <p className={`${labelCls} mb-1`}>Hạn sử dụng</p>
      <input
        type="date"
        className={inputCls}
        value={d.expires_at?.slice(0, 10) || ""}
        onChange={(e) => onChange("expires_at", e.target.value)}
      />
    </div>
    <label className="flex cursor-pointer items-center gap-2.5 py-0.5">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-white/20 bg-white/5 accent-indigo-500"
        checked={!!d.is_verified}
        onChange={(e) => onChange("is_verified", e.target.checked ? "true" : "")}
      />
      <span className="text-sm text-white/80">Đã xác minh (V)</span>
    </label>
    <div>
      <p className={`${labelCls} mb-1`}>Ghi chú</p>
      <input
        className={inputCls}
        value={d.note || ""}
        placeholder="Ghi chú…"
        onChange={(e) => onChange("note", e.target.value)}
      />
    </div>
  </div>
);

const FormActions: React.FC<{
  isNew?: boolean;
  itemId?: number;
  loading: boolean;
  onSave: (id?: number) => void;
  onDelete: (id?: number) => void;
  onCancel: () => void;
}> = ({ isNew, itemId, loading, onSave, onDelete, onCancel }) => (
  <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-white/5 pt-4">
    <button
      type="button"
      onClick={() => onSave(isNew ? undefined : itemId)}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/20 px-3 py-2 text-sm font-medium text-emerald-300 ring-1 ring-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-50"
    >
      <CheckIcon className="h-4 w-4" />
      Lưu
    </button>
    {!isNew && itemId != null && (
      <button
        type="button"
        onClick={() => onDelete(itemId)}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500/15 px-3 py-2 text-sm font-medium text-rose-300 ring-1 ring-rose-500/25 hover:bg-rose-500/25 disabled:opacity-50"
      >
        <TrashIcon className="h-4 w-4" />
        Xoá
      </button>
    )}
    <button
      type="button"
      onClick={onCancel}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-2 text-sm text-white/60 ring-1 ring-white/10 hover:bg-white/10 disabled:opacity-50"
    >
      <XMarkIcon className="h-4 w-4" />
      Huỷ
    </button>
  </div>
);

export const StorageMobileList: React.FC<MobileProps> = ({
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
  if (loading && items.length === 0 && editingId !== "new") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-400/20 border-t-indigo-400" />
        <p className="text-sm text-white/40">Đang tải dữ liệu kho…</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-0.5 pb-2">
      {editingId === "new" && draft && (
        <CardShell>
          <p className="mb-3 text-center text-sm font-bold text-white/90">Thêm tài khoản mới</p>
          <MobileFormFields d={draft} onChange={onDraftChange} />
          <FormActions
            isNew
            loading={loading}
            onSave={onSave}
            onDelete={onDelete}
            onCancel={onCancel}
          />
        </CardShell>
      )}

      {items.length === 0 && editingId !== "new" ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 py-16 text-center">
          <p className="text-sm text-white/35">Chưa có dữ liệu tồn kho</p>
        </div>
      ) : (
        items.map((item) => {
          const isEditing = editingId === item.id;
          const cur = isEditing && draft ? draft : item;
          const key = item.id ?? `row-${String(item.account)}-${String(item.category)}`;

          if (isEditing && draft) {
            return (
              <CardShell key={key}>
                <p className="mb-3 text-center text-sm font-bold text-amber-200/90">Sửa bản ghi</p>
                <MobileFormFields d={cur} onChange={onDraftChange} />
                <FormActions
                  itemId={item.id}
                  loading={loading}
                  onSave={onSave}
                  onDelete={onDelete}
                  onCancel={onCancel}
                />
              </CardShell>
            );
          }

          return (
            <ViewCard
              key={key}
              item={item}
              loading={loading}
              onStartEdit={onStartEdit}
              onDelete={onDelete}
            />
          );
        })
      )}
    </div>
  );
};

const ViewCard: React.FC<{
  item: WarehouseItem;
  loading: boolean;
  onStartEdit: (item: WarehouseItem) => void;
  onDelete: (id?: number) => void;
}> = ({ item, loading, onStartEdit, onDelete }) => {
  const exp = item.expires_at
    ? new Date(item.expires_at).toLocaleDateString("vi-VN")
    : "—";
  return (
    <CardShell>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-300/50">Loại</p>
          <h3 className="text-base font-bold leading-tight text-white">
            {item.category || "—"}
          </h3>
        </div>
        {item.status ? (
          <span
            className={`shrink-0 rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${warehouseStatusClass(
              item.status
            )}`}
          >
            {item.status}
          </span>
        ) : null}
      </div>

      <div className="space-y-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
        <Field label="Tài khoản" value={item.account || "—"} />
        <Field label="Mật khẩu" value={item.password || "—"} mono />
        <Field label="Mail dự phòng" value={item.backup_email || "—"} />
        <Field label="2FA" value={item.two_fa || "—"} mono />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className={labelCls}>Hạn SD</p>
            <p className="text-sm tabular-nums text-white/75">{exp}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <p className={labelCls}>Xác minh</p>
            {item.is_verified ? (
              <CheckCircleSolid className="h-5 w-5 text-emerald-400" aria-label="Đã xác minh" />
            ) : (
              <XCircleIcon className="h-5 w-5 text-white/20" aria-label="Chưa xác minh" />
            )}
          </div>
        </div>
        <Field
          label="Ghi chú"
          value={String(item.note || "").trim() || "—"}
          multiline
        />
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onStartEdit(item)}
          disabled={loading}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 py-2.5 text-sm font-medium text-amber-200/90 sm:flex-initial"
        >
          <PencilSquareIcon className="h-4 w-4" />
          Sửa
        </button>
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          disabled={loading || item.id == null}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 py-2.5 text-sm font-medium text-rose-300/90 sm:flex-initial"
        >
          <TrashIcon className="h-4 w-4" />
          Xoá
        </button>
      </div>
    </CardShell>
  );
};
