import {
  PencilSquareIcon,
  StarIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import { ResponsiveTable } from "@/components/ui/ResponsiveTable";
import type { ShopBankAccountItem } from "../types";

type ShopBankAccountTableProps = {
  items: ShopBankAccountItem[];
  startIndex: number;
  onEdit: (item: ShopBankAccountItem) => void;
  onDelete: (item: ShopBankAccountItem) => void;
  onSetDefault: (item: ShopBankAccountItem) => void;
  settingDefaultId: number | null;
};

const actionBtn =
  "inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/70 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white";

export function ShopBankAccountTable({
  items,
  startIndex,
  onEdit,
  onDelete,
  onSetDefault,
  settingDefaultId,
}: ShopBankAccountTableProps) {
  return (
    <ResponsiveTable>
      <table className="min-w-full divide-y divide-white/5 text-white">
        <thead>
          <tr className="[&>th]:bg-white/[0.03] [&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:text-[11px] [&>th]:font-bold [&>th]:uppercase [&>th]:tracking-wider [&>th]:text-indigo-300/70">
            <th className="w-12 text-center">#</th>
            <th>STK / Chủ TK</th>
            <th>Ngân hàng</th>
            <th>Trạng thái</th>
            <th className="text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {items.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-12 text-center text-white/60">
                Chưa có STK nào. Thêm tài khoản để dùng cho QR thanh toán đơn.
              </td>
            </tr>
          ) : (
            items.map((item, index) => (
              <tr key={item.id} className="hover:bg-white/[0.03]">
                <td className="px-4 py-4 text-center text-sm text-white/60">
                  {startIndex + index + 1}
                </td>
                <td className="px-4 py-4">
                  <p className="font-mono text-sm font-semibold text-white">{item.accountNumber}</p>
                  <p className="mt-1 text-sm text-white/70">{item.accountHolder}</p>
                  {item.label && (
                    <p className="mt-1 text-xs text-indigo-200/60">{item.label}</p>
                  )}
                </td>
                <td className="px-4 py-4 text-sm text-white/75">
                  <p>{item.bankDisplayName || "—"}</p>
                  <p className="mt-1 font-mono text-xs text-white/50">
                    BIN {item.bankBin}
                    {item.bankShortCode ? ` · ${item.bankShortCode}` : ""}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    {item.isDefault && (
                      <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-100">
                        Mặc định
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        item.isActive
                          ? "border border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
                          : "border border-white/15 bg-white/5 text-white/50"
                      }`}
                    >
                      {item.isActive ? "Đang bật" : "Tắt"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    {!item.isDefault && item.isActive && (
                      <button
                        type="button"
                        className={actionBtn}
                        onClick={() => onSetDefault(item)}
                        disabled={settingDefaultId === item.id}
                        aria-label="Đặt mặc định"
                        title="Đặt mặc định"
                      >
                        {settingDefaultId === item.id ? (
                          <StarSolidIcon className="h-5 w-5 text-amber-300 animate-pulse" />
                        ) : (
                          <StarIcon className="h-5 w-5" />
                        )}
                      </button>
                    )}
                    {item.isDefault && (
                      <span className={`${actionBtn} border-amber-400/25 text-amber-200`}>
                        <StarSolidIcon className="h-5 w-5" />
                      </span>
                    )}
                    <button
                      type="button"
                      className={actionBtn}
                      onClick={() => onEdit(item)}
                      aria-label="Sửa"
                    >
                      <PencilSquareIcon className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      className={`${actionBtn} border-rose-500/20 text-rose-200/80`}
                      onClick={() => onDelete(item)}
                      aria-label="Xóa"
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
