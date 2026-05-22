import { ResponsiveTable } from "@/components/ui/ResponsiveTable";
import {
  formatShopBankMoney,
  formatShopBankMoneyInput,
  parseShopBankMoneyInput,
} from "../helpers/formatShopBankMoney";
import type { ShopBankAccountBalanceItem } from "../types";

type ShopBankBalanceTableProps = {
  items: ShopBankAccountBalanceItem[];
  loading: boolean;
  error: string | null;
  savingId: number | null;
  draftWithdrawn: Record<number, string>;
  onWithdrawnDraftChange: (id: number, value: string) => void;
  onSaveWithdrawn: (item: ShopBankAccountBalanceItem) => void;
  onRefresh: () => void;
  refreshing: boolean;
};

const inputCls =
  "w-full min-w-[8rem] rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-right text-sm font-mono text-white tabular-nums focus:border-emerald-400/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/20";

export function ShopBankBalanceTable({
  items,
  loading,
  error,
  savingId,
  draftWithdrawn,
  onWithdrawnDraftChange,
  onSaveWithdrawn,
  onRefresh,
  refreshing,
}: ShopBankBalanceTableProps) {
  return (
    <div className="rounded-[28px] border border-emerald-500/20 bg-emerald-950/10 overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-white/5 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-lg font-bold text-white">Số dư STK</h2>
          <p className="mt-1 text-xs text-white/55 leading-relaxed">
            Tổng tiền = CK Sepay thực tế vào STK. Số tiền còn lại = tổng tiền − đã rút (số dư bank).
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing || loading}
          className="shrink-0 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/[0.08] disabled:opacity-50"
        >
          {refreshing ? "Đang cập nhật…" : "Làm mới tổng CK"}
        </button>
      </div>

      {error ? (
        <p className="px-6 py-4 text-sm text-rose-300">{error}</p>
      ) : null}

      {loading ? (
        <p className="px-6 py-10 text-center text-sm text-white/60">Đang tải số dư…</p>
      ) : (
        <ResponsiveTable>
          <table className="min-w-full divide-y divide-white/5 text-white">
            <thead>
              <tr className="[&>th]:bg-white/[0.03] [&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:text-[11px] [&>th]:font-bold [&>th]:uppercase [&>th]:tracking-wider [&>th]:text-emerald-300/70">
                <th>STK / Chủ TK</th>
                <th className="text-right">Tổng tiền CK</th>
                <th className="text-right min-w-[10rem]">Số tiền đã rút</th>
                <th className="text-right">Số tiền còn lại</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-white/60">
                    Chưa có STK. Thêm tài khoản bên dưới để theo dõi số dư.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const draft =
                    draftWithdrawn[item.id] ??
                    formatShopBankMoneyInput(item.totalWithdrawn);
                  const draftAmount = parseShopBankMoneyInput(draft);
                  const balancePreview = item.totalReceived - draftAmount;
                  const dirty = draftAmount !== item.totalWithdrawn;

                  return (
                    <tr key={item.id} className="hover:bg-white/[0.02] align-top">
                      <td className="px-4 py-4">
                        <p className="font-mono text-sm font-semibold text-white">
                          {item.accountNumber}
                        </p>
                        <p className="mt-1 text-sm text-white/70">{item.accountHolder}</p>
                        <p className="mt-1 text-xs text-white/45">
                          {item.bankDisplayName || "—"}
                          {item.isDefault ? " · Mặc định" : ""}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-sm font-semibold tabular-nums text-sky-200">
                          {formatShopBankMoney(item.totalReceived)}
                        </span>
                        <span className="block text-[11px] text-white/40 mt-0.5">VND</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col items-end gap-2 sm:flex-row sm:justify-end">
                          <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            className={inputCls}
                            value={draft}
                            onChange={(event) =>
                              onWithdrawnDraftChange(item.id, event.target.value)
                            }
                            aria-label={`Số tiền đã rút ${item.accountNumber}`}
                          />
                          <button
                            type="button"
                            className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-40"
                            disabled={!dirty || savingId === item.id}
                            onClick={() => onSaveWithdrawn(item)}
                          >
                            {savingId === item.id ? "Đang lưu…" : "Lưu"}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span
                          className={`text-sm font-bold tabular-nums ${
                            balancePreview < 0 ? "text-amber-300" : "text-emerald-200"
                          }`}
                        >
                          {formatShopBankMoney(balancePreview)}
                        </span>
                        <span className="block text-[11px] text-white/40 mt-0.5">VND</span>
                        {balancePreview < 0 ? (
                          <span className="block text-[10px] text-amber-300/80 mt-1">
                            Đã rút lớn hơn tổng CK
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </ResponsiveTable>
      )}
    </div>
  );
}
