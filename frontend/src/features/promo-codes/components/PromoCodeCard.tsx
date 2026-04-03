import { EyeIcon, PencilIcon } from "@heroicons/react/24/outline";
import type { PromoCodeItem } from "../types";
import { PROMO_STATUS_LABELS } from "../types";

type PromoCodeCardProps = {
  item: PromoCodeItem;
  index: number;
  onView: (item: PromoCodeItem) => void;
  onEdit: (item: PromoCodeItem) => void;
};

const statusClass: Record<PromoCodeItem["status"], string> = {
  active: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  inactive: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  expired: "bg-amber-500/20 text-amber-300 border-amber-500/30",
};

export function PromoCodeCard({ item, index, onView, onEdit }: PromoCodeCardProps) {
  const statusLabel = PROMO_STATUS_LABELS[item.status];
  const statusStyle = statusClass[item.status];

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-800/40 p-4 shadow-lg backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-indigo-300/70 tabular-nums">#{index}</span>
            <span className="text-base font-mono font-semibold text-indigo-200">{item.code}</span>
            <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-medium ${statusStyle}`}>
              {statusLabel}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <div className="text-white/60">Chiết khấu</div>
            <div className="text-white font-medium text-right">{item.discount}</div>
            <div className="text-white/60">Tối đa</div>
            <div className="text-white/90 text-right">{item.max}</div>
            <div className="text-white/60">Điều kiện</div>
            <div className="text-white/90 text-right truncate" title={item.condition}>{item.condition}</div>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          <button type="button" onClick={() => onView(item)} className="p-2 rounded-xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition-colors" title="Xem">
            <EyeIcon className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => onEdit(item)} className="p-2 rounded-xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition-colors" title="Chỉnh sửa">
            <PencilIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
