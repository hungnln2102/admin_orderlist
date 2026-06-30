import type { MatchableOrder } from "@/features/renew-adobe/user-orders/api";

const STATUS_BADGE_CLASS: Record<string, string> = {
  "ÄÃ£ Thanh ToÃ¡n": "bg-emerald-500/15 text-emerald-300 border-emerald-400/40",
  "Äang Xá»­ LÃ½": "bg-sky-500/15 text-sky-300 border-sky-400/40",
  "Cáº§n Gia Háº¡n": "bg-amber-500/15 text-amber-300 border-amber-400/40",
};

function StatusPill({ status }: { status: string | null }) {
  const cls =
    (status && STATUS_BADGE_CLASS[status]) ||
    "bg-slate-500/20 text-slate-300 border-slate-400/35";
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${cls}`}
    >
      {status || "â€”"}
    </span>
  );
}

type AddTrackingOrdersTableProps = {
  items: MatchableOrder[];
  selected: Set<string>;
  submitting: boolean;
  selectableCount: number;
  allSelectableSelected: boolean;
  onToggleSelect: (orderCode: string) => void;
  onToggleSelectAll: () => void;
};

export function AddTrackingOrdersTable({
  items,
  selected,
  submitting,
  selectableCount,
  allSelectableSelected,
  onToggleSelect,
  onToggleSelectAll,
}: AddTrackingOrdersTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10">
      <table className="min-w-full divide-y divide-white/5 text-white text-sm">
        <thead className="bg-white/[0.04] text-[10px] uppercase tracking-[0.1em] text-indigo-300/70">
          <tr>
            <th className="px-3 py-2 w-10 text-left">
              <input
                type="checkbox"
                className="h-4 w-4 accent-emerald-500"
                checked={allSelectableSelected}
                onChange={onToggleSelectAll}
                disabled={submitting || selectableCount === 0}
                aria-label="Chá»n táº¥t cáº£"
              />
            </th>
            <th className="px-3 py-2 text-left">MÃ£ Ä‘Æ¡n</th>
            <th className="px-3 py-2 text-left">KhÃ¡ch hÃ ng</th>
            <th className="px-3 py-2 text-left">Email/Profile</th>
            <th className="px-3 py-2 text-left">Háº¡n</th>
            <th className="px-3 py-2 text-left">Tráº¡ng thÃ¡i</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {items.map((item) => {
            const checked = selected.has(item.order_code);
            const disabled = item.in_tracking;
            return (
              <tr
                key={item.order_code}
                className={
                  disabled ? "bg-white/[0.015] text-white/45" : "hover:bg-white/[0.04]"
                }
              >
                <td className="px-3 py-2 align-top">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-emerald-500"
                    checked={checked}
                    onChange={() => onToggleSelect(item.order_code)}
                    disabled={disabled || submitting}
                  />
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {item.order_code}
                  {disabled && (
                    <span className="ml-2 inline-flex rounded-md border border-emerald-400/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] text-emerald-300">
                      ÄÃ£ track
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="text-white/90">{item.customer || "â€”"}</div>
                  <div className="text-[11px] text-white/55">{item.contact || ""}</div>
                </td>
                <td className="px-3 py-2 text-xs break-all">
                  {item.information_order || "â€”"}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-xs">
                  {item.expiry_date || "â€”"}
                </td>
                <td className="px-3 py-2">
                  <StatusPill status={item.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
