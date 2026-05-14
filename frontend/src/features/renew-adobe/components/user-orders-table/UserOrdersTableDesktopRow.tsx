import type { UserOrderRow } from "@/features/renew-adobe/user-orders/types";
import { StatusBadge, SystemBadge } from "./badges";
import { RowActionButtons } from "./row-actions";
import type { UserOrdersTableActionProps } from "./types";

type Props = Omit<UserOrdersTableActionProps, "row" | "displayStatus"> & {
  row: UserOrderRow;
};

export function UserOrdersTableDesktopRow({ row, ...actionProps }: Props) {
  return (
    <tr key={row.id}>
      <td className="px-2 sm:px-4 py-3 text-sm text-white/80 font-mono">
        {row.order_code}
      </td>
      <td className="px-2 sm:px-4 py-3 text-sm text-white/90">
        {row.customer_name}
      </td>
      <td className="px-2 sm:px-4 py-3 text-sm text-white/90 break-all">
        {row.email}
      </td>
      <td className="px-2 sm:px-4 py-3 text-sm text-white/80">{row.profile}</td>
      <td className="px-2 sm:px-4 py-3">
        <SystemBadge code={row.systemNote} />
      </td>
      <td className="px-2 sm:px-4 py-3">
        <StatusBadge status={row.display_status} />
      </td>
      <td className="px-2 sm:px-4 py-3 text-sm text-white/80">{row.expiry}</td>
      <td className="px-2 sm:px-4 py-3">
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          <RowActionButtons
            {...actionProps}
            row={row}
            displayStatus={row.display_status}
            compact
          />
        </div>
      </td>
    </tr>
  );
}
