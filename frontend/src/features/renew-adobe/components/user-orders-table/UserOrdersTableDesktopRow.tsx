import type { UserOrderRow } from "@/features/renew-adobe/user-orders/types";
import { StatusBadge, SystemBadge, OtpSourceBadge } from "./badges";
import { RowActionButtons } from "./row-actions";
import type { UserOrdersTableActionProps } from "./types";

type Props = Omit<UserOrdersTableActionProps, "row" | "displayStatus"> & {
  row: UserOrderRow;
};



export function UserOrdersTableDesktopRow({ row, ...actionProps }: Props) {
  return (
    <tr
      key={row.id}
      className="hover:bg-white/[0.02] border-b border-white/5 transition-all duration-200"
    >
      <td className="px-4 py-3.5 text-xs text-white/50 font-mono tracking-wider font-semibold">
        {row.order_code}
      </td>
      <td className="px-4 py-3.5 text-sm text-white/95">
        <div className="font-semibold">{row.customer_name}</div>
      </td>
      <td className="px-4 py-3.5 text-sm text-white/80 font-mono break-all">
        {row.email}
      </td>
      <td className="px-4 py-3.5 text-sm text-white/70">{row.profile || "—"}</td>
      <td className="px-4 py-3.5">
        <SystemBadge code={row.systemNote} />
      </td>
      <td className="px-4 py-3.5">
        <OtpSourceBadge code={row.otpSource} />
      </td>
      <td className="px-4 py-3.5">
        <StatusBadge status={row.display_status} />
      </td>
      <td className="px-4 py-3.5 text-sm text-white/75 font-mono tabular-nums">
        {row.expiry || "—"}
      </td>
      <td className="px-4 py-3.5">
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
