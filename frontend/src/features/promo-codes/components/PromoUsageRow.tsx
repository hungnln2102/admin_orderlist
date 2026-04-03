import type { PromoUsageItem } from "../types";

type PromoUsageRowProps = {
  item: PromoUsageItem;
  index: number;
};

export function PromoUsageRow({ item, index }: PromoUsageRowProps) {
  return (
    <tr className="group border-b border-white/5 hover:bg-white/[0.03] transition-colors">
      <td className="px-2 py-3 sm:px-4 text-center text-sm text-white/80 tabular-nums whitespace-nowrap">
        {index}
      </td>
      <td className="px-2 py-3 sm:px-4 text-sm font-medium text-indigo-200 font-mono whitespace-nowrap">
        {item.promoCode}
      </td>
      <td className="px-2 py-3 sm:px-4 text-sm text-white/90 whitespace-nowrap">
        {item.account}
      </td>
      <td className="px-2 py-3 sm:px-4 text-sm text-white/80 whitespace-nowrap">
        {item.usedAt}
      </td>
      <td className="px-2 py-3 sm:px-4 text-sm text-white/90 font-mono whitespace-nowrap">
        {item.orderCode ?? "—"}
      </td>
      <td className="px-2 py-3 sm:px-4 text-sm text-white/90 font-medium whitespace-nowrap">
        {item.discountAmount}
      </td>
    </tr>
  );
}
