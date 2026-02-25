import { EyeIcon, PencilIcon } from "@heroicons/react/24/outline";
import type { ActiveKeyItem } from "../types";

type ActiveKeyRowProps = {
  item: ActiveKeyItem;
  index: number;
  onView: (item: ActiveKeyItem) => void;
  onEdit: (item: ActiveKeyItem) => void;
};

export function ActiveKeyRow({ item, index, onView, onEdit }: ActiveKeyRowProps) {
  return (
    <tr className="group border-b border-white/5 hover:bg-white/[0.03] transition-colors">
      <td className="px-2 py-3 sm:px-4 text-center text-sm text-white/80 tabular-nums whitespace-nowrap">
        {index}
      </td>
      <td className="px-2 py-3 sm:px-4 text-sm font-medium text-white whitespace-nowrap">
        {item.product}
      </td>
      <td className="px-2 py-3 sm:px-4 text-sm text-indigo-200 font-mono whitespace-nowrap">
        {item.key}
      </td>
      <td className="px-2 py-3 sm:px-4 text-sm text-white/90 whitespace-nowrap">
        {item.expiry}
      </td>
      <td className="px-2 py-3 sm:px-4 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => onView(item)}
            className="p-2 rounded-xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            title="Xem"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="p-2 rounded-xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            title="Chỉnh sửa"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
