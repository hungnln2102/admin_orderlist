import React from "react";

type WithdrawItem = {
  id: number;
  amount: number;
  reason: string;
  expenseDate: string | null;
};

type WalletWithdrawTableProps = {
  items: WithdrawItem[];
  loading: boolean;
  error: string | null;
  currencyFormatter: Intl.NumberFormat;
};

const formatDate = (value: string | null) => {
  if (!value) return "—";
  const [y, m, d] = value.split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
};

const WalletWithdrawTable: React.FC<WalletWithdrawTableProps> = ({
  items,
  loading,
  error,
  currencyFormatter,
}) => {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
      <table className="min-w-full text-sm text-white">
        <thead className="bg-white/10 text-xs uppercase tracking-[0.08em] text-white/80">
          <tr>
            <th className="px-3 py-2 text-center">Ngày</th>
            <th className="px-3 py-2 text-center">Số tiền</th>
            <th className="px-3 py-2 text-center">Lý do</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {loading ? (
            <tr>
              <td colSpan={3} className="px-3 py-3 text-center text-white/70">
                Đang tải dữ liệu rút tiền...
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan={3} className="px-3 py-3 text-center text-rose-200">
                {error}
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-3 py-3 text-center text-white/70">
                Chưa có dữ liệu rút tiền.
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id} className="hover:bg-white/5">
                <td className="px-3 py-2 text-center font-semibold">
                  {formatDate(item.expenseDate)}
                </td>
                <td className="px-3 py-2 text-center">
                  {currencyFormatter.format(Number(item.amount || 0))}
                </td>
                <td className="px-3 py-2 text-center text-white/90">
                  {item.reason || "—"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default WalletWithdrawTable;
