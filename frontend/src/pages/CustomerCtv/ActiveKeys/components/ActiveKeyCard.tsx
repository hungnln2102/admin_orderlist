import { EyeIcon, PencilIcon } from "@heroicons/react/24/outline";
import type { ActiveKeyItem } from "../types";

type ActiveKeyCardProps = {
  item: ActiveKeyItem;
  index: number;
  onView: (item: ActiveKeyItem) => void;
  onEdit: (item: ActiveKeyItem) => void;
};

export function ActiveKeyCard({ item, index, onView, onEdit }: ActiveKeyCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-800/40 p-4 shadow-lg backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-indigo-300/70 tabular-nums">
              #{index}
            </span>
            <span className="text-base font-semibold text-white">
              {item.product}
            </span>
          </div>
          <div className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-white/60 shrink-0">Key</span>
              <span className="text-indigo-200 font-mono truncate text-right">
                {item.key}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-white/60 shrink-0">Thời hạn</span>
              <span className="text-white/90">{item.expiry}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onView(item)}
            className="p-2 rounded-xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition-colors"
            title="Xem"
          >
            <EyeIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="p-2 rounded-xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition-colors"
            title="Chỉnh sửa"
          >
            <PencilIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
