import { TableCard } from "@/components/ui/ResponsiveTable";
import type { UserOrderRow } from "@/features/renew-adobe/user-orders/types";
import { StatusBadge, SystemBadge } from "./badges";
import { RowActionButtons } from "./row-actions";
import type { UserOrdersTableActionProps } from "./types";

type Props = Omit<UserOrdersTableActionProps, "row" | "displayStatus"> & {
  rows: UserOrderRow[];
};

export function UserOrdersTableCard({ rows, ...actionProps }: Props) {
  if (rows.length === 0) {
    return (
      <div className="p-8 text-center text-white/70">
        Chưa có dữ liệu. Chạy Check để đồng bộ users từ Adobe.
      </div>
    );
  }

  return (
    <TableCard
      data={rows}
      renderCard={(item) => {
        const row = item as UserOrderRow;
        return (
          <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-white/60">Mã đơn: {row.order_code}</p>
              <SystemBadge code={row.systemNote} />
            </div>
            <p className="text-sm font-medium text-white">{row.customer_name}</p>
            <p className="text-xs text-white/80 break-all">{row.email}</p>
            <p className="text-xs text-white/60">Profile: {row.profile}</p>
            <StatusBadge status={row.display_status} />
            <p className="text-xs text-white/70">Hạn: {row.expiry}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <RowActionButtons
                {...actionProps}
                row={row}
                displayStatus={row.display_status}
              />
            </div>
          </div>
        );
      }}
      className="p-4"
    />
  );
}
