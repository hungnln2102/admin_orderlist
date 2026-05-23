import { ResponsiveTable } from "@/components/ui/ResponsiveTable";
import GradientButton from "@/components/ui/GradientButton";
import { formatShopBankMoney } from "../helpers/formatShopBankMoney";
import type { ShopBankAccountBalanceItem } from "../types";

type ShopBankBalanceTableProps = {
  items: ShopBankAccountBalanceItem[];
  loading: boolean;
  error: string | null;
  onOpenWithdraw: () => void;
};

export function ShopBankBalanceTable({
  items,
  loading,
  error,
  onOpenWithdraw,
}: ShopBankBalanceTableProps) {
  const totalRemaining = items.reduce(
    (sum, item) => sum + (Number(item.balanceRemaining) || 0),
    0
  );
  return (
    <div className="rounded-[28px] border border-emerald-500/20 bg-emerald-950/10 overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-white/5 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-lg font-bold text-white">Số dư STK</h2>
          <p className="mt-1 text-xs text-white/55 leading-relaxed">
            Tổng tiền = CK Sepay vào STK (ledger). Số còn lại = số dư bank. Tổng còn lại
            các STK = <span className="text-emerald-200">Lợi nhuận khả dụng</span> trên dashboard.
          </p>
        </div>
        <GradientButton
          type="button"
          onClick={onOpenWithdraw}
          disabled={loading}
          className="!rounded-2xl shrink-0 !px-5 !py-2.5 !text-sm"
        >
          Rút tiền
        </GradientButton>
      </div>

      {error ? <p className="px-6 py-4 text-sm text-rose-300">{error}</p> : null}

      {loading ? (
        <p className="px-6 py-10 text-center text-sm text-white/60">Đang tải số dư…</p>
      ) : (
        <ResponsiveTable>
          <table className="min-w-full divide-y divide-white/5 text-white">
            <thead>
              <tr className="[&>th]:bg-white/[0.03] [&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:text-[11px] [&>th]:font-bold [&>th]:uppercase [&>th]:tracking-wider [&>th]:text-emerald-300/70">
                <th>STK / Chủ TK</th>
                <th className="text-right">Tổng tiền CK</th>
                <th className="text-right">Số tiền đã rút</th>
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
                items.map((item) => (
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
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm font-semibold tabular-nums text-amber-100/90">
                        {formatShopBankMoney(item.totalWithdrawn)}
                      </span>
                      <span className="block text-[11px] text-white/40 mt-0.5">VND</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span
                        className={`text-sm font-bold tabular-nums ${
                          item.balanceRemaining < 0 ? "text-amber-300" : "text-emerald-200"
                        }`}
                      >
                        {formatShopBankMoney(item.balanceRemaining)}
                      </span>
                      <span className="block text-[11px] text-white/40 mt-0.5">VND</span>
                      {item.balanceRemaining < 0 ? (
                        <span className="block text-[10px] text-amber-300/80 mt-1">
                          Đã rút lớn hơn tổng CK
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {items.length > 0 ? (
              <tfoot>
                <tr className="border-t border-emerald-500/20 bg-emerald-950/30">
                  <td className="px-4 py-3 text-sm font-semibold text-emerald-100">
                    Tổng số dư STK
                  </td>
                  <td colSpan={2} />
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-bold tabular-nums text-emerald-200">
                      {formatShopBankMoney(totalRemaining)}
                    </span>
                    <span className="block text-[11px] text-white/40 mt-0.5">VND</span>
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </ResponsiveTable>
      )}
    </div>
  );
}
