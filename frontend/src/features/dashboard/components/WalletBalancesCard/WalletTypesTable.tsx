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
            <th className="px-3 py-2">TÃªn</th>
            <th className="px-3 py-2">MÃ£</th>
            <th className="px-3 py-2">Loáº¡i</th>
            <th className="px-3 py-2 text-right">Thao tÃ¡c</th>
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
                  {column.assetCode || "â€”"}
                  {column.isInvestment ? (
                    <span className="ml-2 text-[10px] text-amber-300/90">Ä‘áº§u tÆ°</span>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-xs text-white/75">
                  {column.balanceScope === "column_total" ? "Tá»•ng cá»™t" : "Theo ngÃ y"}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => onEdit(column)}
                    className="mr-2 text-indigo-300 hover:text-indigo-200"
                    disabled={loading}
                  >
                    Sá»­a
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(column.id)}
                    className="text-rose-300 hover:text-rose-200"
                    disabled={loading}
                  >
                    XÃ³a
                  </button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
