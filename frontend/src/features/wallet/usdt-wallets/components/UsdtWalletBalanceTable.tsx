import { ResponsiveTable } from "@/components/ui/ResponsiveTable";
import GradientButton from "@/components/ui/GradientButton";
import { formatUsdtMoney } from "../helpers/formatUsdtMoney";
import type { UsdtWalletBalanceItem } from "../types";

type UsdtWalletBalanceTableProps = {
  items: UsdtWalletBalanceItem[];
  loading: boolean;
  error: string | null;
  exchangeRate: number | null;
  onOpenWithdraw: () => void;
};

export function UsdtWalletBalanceTable({
  items,
  loading,
  error,
  exchangeRate,
  onOpenWithdraw,
}: UsdtWalletBalanceTableProps) {
  const totalRemaining = items.reduce(
    (sum, item) => sum + (Number(item.balanceRemaining) || 0),
    0
  );

  return (
    <div className="rounded-[28px] border border-cyan-500/20 bg-cyan-950/10 overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-white/5 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-lg font-bold text-white">Số dư ví USDT</h2>
          <p className="mt-1 text-xs text-white/55 leading-relaxed">
            Số dư theo USD (≈ USDT). Tổng tiền = các khoản nạp thủ công từ đơn USDT.
            {exchangeRate ? (
              <>
                {" "}
                Tỷ giá Binance:{" "}
                <span className="text-cyan-200 tabular-nums">
                  {Math.round(exchangeRate).toLocaleString("vi-VN")} VND/USDT
                </span>
              </>
            ) : null}
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
              <tr className="[&>th]:bg-white/[0.03] [&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:text-[11px] [&>th]:font-bold [&>th]:uppercase [&>th]:tracking-wider [&>th]:text-cyan-300/70">
                <th>Ví / Nhãn</th>
                <th className="text-right">Tổng nạp (USD)</th>
                <th className="text-right">Đã rút (USD)</th>
                <th className="text-right">Còn lại (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-white/60">
                    Chưa có ví USDT.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.03]">
                    <td className="px-4 py-4">
                      <p className="font-mono text-sm text-white break-all">{item.walletAddress}</p>
                      <p className="mt-1 text-xs text-white/50">
                        {item.network}
                        {item.label ? ` · ${item.label}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-right font-mono tabular-nums text-sm">
                      {formatUsdtMoney(item.totalReceived)} USD
                    </td>
                    <td className="px-4 py-4 text-right font-mono tabular-nums text-sm text-white/70">
                      {formatUsdtMoney(item.totalWithdrawn)} USD
                    </td>
                    <td className="px-4 py-4 text-right font-mono tabular-nums text-sm font-semibold text-cyan-200">
                      {formatUsdtMoney(item.balanceRemaining)} USD
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {items.length > 0 && (
              <tfoot>
                <tr className="border-t border-white/10 bg-white/[0.02]">
                  <td className="px-4 py-4 text-sm font-bold text-white">Tổng số dư USDT</td>
                  <td colSpan={2} />
                  <td className="px-4 py-4 text-right font-mono tabular-nums text-base font-bold text-cyan-200">
                    {formatUsdtMoney(totalRemaining)} USD
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </ResponsiveTable>
      )}
    </div>
  );
}
