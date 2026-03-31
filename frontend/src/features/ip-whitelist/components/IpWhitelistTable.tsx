import {
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { ResponsiveTable, TableCard } from "@/components/ui/ResponsiveTable";
import type { IpWhitelistItem } from "../types";

type IpWhitelistTableProps = {
  items: IpWhitelistItem[];
  startIndex: number;
  onEdit: (item: IpWhitelistItem) => void;
  onDelete: (item: IpWhitelistItem) => void;
};

const actionButtonClass =
  "inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/70 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white";

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

export function IpWhitelistTable({
  items,
  startIndex,
  onEdit,
  onDelete,
}: IpWhitelistTableProps) {
  return (
    <ResponsiveTable
      showCardOnMobile
      cardView={
        items.length === 0 ? (
          <div className="p-8 text-center">
            <p className="mb-2 text-lg text-white/75">Chưa có IP whitelist nào</p>
            <p className="text-sm text-white/55">
              Thêm IP mới hoặc thay đổi từ khóa tìm kiếm để kiểm tra lại.
            </p>
          </div>
        ) : (
          <TableCard
            data={items}
            className="p-4"
            renderCard={(rawItem, index) => {
              const item = rawItem as IpWhitelistItem;

              return (
                <div className="rounded-[24px] border border-white/10 bg-slate-900/55 p-4 shadow-lg backdrop-blur-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-200/45">
                        #{startIndex + index + 1}
                      </p>
                      <p className="mt-2 break-all text-base font-semibold text-white">
                        {item.ipAddress}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(item)}
                        className={actionButtonClass}
                        aria-label={`Sửa ${item.ipAddress}`}
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(item)}
                        className={`${actionButtonClass} border-rose-500/20 text-rose-200/80 hover:border-rose-400/35 hover:bg-rose-500/10 hover:text-rose-100`}
                        aria-label={`Xóa ${item.ipAddress}`}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3 text-sm">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                        Mô tả
                      </p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-white/80">
                        {item.description || "Chưa có mô tả"}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                          Tạo lúc
                        </p>
                        <p className="mt-1 text-white/80">
                          {formatDateTime(item.createdAt)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                          Cập nhật
                        </p>
                        <p className="mt-1 text-white/80">
                          {formatDateTime(item.updatedAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }}
          />
        )
      }
    >
      <table className="min-w-full divide-y divide-white/5 text-white">
        <thead>
          <tr className="[&>th]:bg-white/[0.03] [&>th]:px-2 [&>th]:py-3 [&>th]:text-left [&>th]:text-[10px] [&>th]:font-bold [&>th]:uppercase [&>th]:tracking-[0.12em] [&>th]:text-indigo-300/70 [&>th]:whitespace-nowrap sm:[&>th]:px-4 sm:[&>th]:text-[11px]">
            <th className="w-14 text-center">STT</th>
            <th className="min-w-[220px]">IP</th>
            <th className="min-w-[260px]">Mô tả</th>
            <th className="w-[160px]">Tạo lúc</th>
            <th className="w-[160px]">Cập nhật</th>
            <th className="w-[120px] pr-4 text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {items.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-white/70">
                <p className="mb-2 text-lg">Chưa có IP whitelist nào</p>
                <p className="text-sm text-white/55">
                  Thêm IP mới hoặc thay đổi từ khóa tìm kiếm để kiểm tra lại.
                </p>
              </td>
            </tr>
          ) : (
            items.map((item, index) => (
              <tr
                key={item.id}
                className="border-b border-white/5 transition-colors hover:bg-white/[0.03]"
              >
                <td className="px-2 py-4 text-center text-sm text-white/75 sm:px-4">
                  {startIndex + index + 1}
                </td>
                <td className="px-2 py-4 sm:px-4">
                  <div className="inline-flex max-w-full rounded-2xl border border-indigo-400/20 bg-indigo-500/10 px-3 py-2 text-sm font-semibold text-indigo-100/95">
                    <span className="break-all">{item.ipAddress}</span>
                  </div>
                </td>
                <td className="px-2 py-4 text-sm text-white/78 sm:px-4">
                  <p className="line-clamp-2 max-w-[420px] break-words">
                    {item.description || "Chưa có mô tả"}
                  </p>
                </td>
                <td className="px-2 py-4 text-sm text-white/60 sm:px-4">
                  {formatDateTime(item.createdAt)}
                </td>
                <td className="px-2 py-4 text-sm text-white/60 sm:px-4">
                  {formatDateTime(item.updatedAt)}
                </td>
                <td className="px-2 py-4 sm:px-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(item)}
                      className={actionButtonClass}
                      aria-label={`Sửa ${item.ipAddress}`}
                    >
                      <PencilSquareIcon className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(item)}
                      className={`${actionButtonClass} border-rose-500/20 text-rose-200/80 hover:border-rose-400/35 hover:bg-rose-500/10 hover:text-rose-100`}
                      aria-label={`Xóa ${item.ipAddress}`}
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </ResponsiveTable>
  );
}
