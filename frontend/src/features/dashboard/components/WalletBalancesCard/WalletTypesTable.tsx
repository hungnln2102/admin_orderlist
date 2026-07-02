import type { WalletColumn } from "../../hooks/useWalletBalances";

type WalletTypesTableProps = {
  columns: WalletColumn[];
  loading: boolean;
  onEdit: (column: WalletColumn) => void;
  onDelete: (id: number) => void;
};

export function WalletTypesTable({
  columns,
  loading,
  onEdit,
  onDelete,
}: WalletTypesTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="min-w-full text-left text-sm text-white">
        <thead className="bg-white/10 text-xs uppercase tracking-wide text-white/70">
          <tr>
            <th className="px-3 py-2">ID</th>
            <th className="px-3 py-2">Tên</th>
            <th className="px-3 py-2">Mã</th>
            <th className="px-3 py-2">Loại</th>
            <th className="px-3 py-2 text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {[...columns]
            .sort((a, b) => a.id - b.id)
            .map((column) => (
              <tr key={column.id} className="bg-white/[0.02]">
                <td className="px-3 py-2 font-mono text-white/80">{column.id}</td>
                <td className="px-3 py-2">{column.name}</td>
                <td className="px-3 py-2 text-white/70">
                  {column.assetCode || "—"}
                  {column.isInvestment ? (
                    <span className="ml-2 text-[10px] text-amber-300/90">đầu tư</span>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-xs text-white/75">
                  {column.balanceScope === "column_total" ? "Tổng cột" : "Theo ngày"}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => onEdit(column)}
                    className="mr-2 text-indigo-300 hover:text-indigo-200"
                    disabled={loading}
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(column.id)}
                    className="text-rose-300 hover:text-rose-200"
                    disabled={loading}
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
