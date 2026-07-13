import React from "react";
import { toDisplayDate, toISODate } from "@/features/invoices/helpers";

type DashboardDateRangePopoverProps = {
  refNode: React.Ref<HTMLDivElement>;
  top: number;
  left: number;
  localStart: string;
  localEnd: string;
  onLocalStartChange: (value: string) => void;
  onLocalEndChange: (value: string) => void;
  onClear: () => void;
  onClose: () => void;
  onApply: () => void;
};

const fieldClass =
  "w-full rounded-xl border border-white/[0.1] bg-slate-950/65 px-3 py-2.5 text-sm text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.28)] outline-none transition-[box-shadow,border-color,background-color] " +
  "focus:border-indigo-400/50 focus:bg-slate-950/85 focus:ring-2 focus:ring-indigo-500/28 " +
  "[color-scheme:dark]";

export const DashboardDateRangePopover: React.FC<DashboardDateRangePopoverProps> = ({
  refNode,
  top,
  left,
  localStart,
  localEnd,
  onLocalStartChange,
  onLocalEndChange,
  onClear,
  onClose,
  onApply,
}) => (
  <div
    ref={refNode}
    className="fixed z-[10000] w-[min(calc(100vw-1.5rem),20rem)] max-h-[min(90vh,480px)] overflow-y-auto rounded-[20px] border border-white/10 bg-gradient-to-b from-slate-900/98 via-slate-950/98 to-slate-950 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.88),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl [color-scheme:dark]"
    style={{ top, left }}
    role="dialog"
    aria-label="Chọn khoảng ngày"
  >
    <div className="relative border-b border-white/[0.07] bg-gradient-to-r from-indigo-950/50 via-slate-900/40 to-slate-950/20 px-4 py-3">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_0%_0%,rgba(99,102,241,0.12),transparent_55%)]" />
      <p className="relative text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-200/75">
        Chu k???
      </p>
      <p className="relative mt-1 text-sm font-semibold leading-snug text-white">
        Ch???n kho???ng th???i gian
      </p>
    </div>

    <div className="space-y-4 p-4 pt-3">
      <div className="space-y-2">
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400/95">
          T??? ng??y
        </label>
        <input
          type="date"
          className={fieldClass}
          value={toISODate(localStart)}
          onChange={(event) =>
            onLocalStartChange(
              event.target.value ? toDisplayDate(event.target.value) : ""
            )
          }
        />
      </div>
      <div className="space-y-2">
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400/95">
          ?????n ng??y
        </label>
        <input
          type="date"
          className={fieldClass}
          value={toISODate(localEnd)}
          onChange={(event) =>
            onLocalEndChange(
              event.target.value ? toDisplayDate(event.target.value) : ""
            )
          }
        />
      </div>
    </div>

    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] bg-slate-950/50 px-4 py-3">
      <button
        type="button"
        className="rounded-lg px-2 py-1.5 text-sm font-medium text-indigo-300/90 transition-colors hover:bg-white/5 hover:text-indigo-200"
        onClick={onClear}
      >
        X??a l???c
      </button>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-xl px-3.5 py-2 text-xs font-semibold text-white/65 transition-colors hover:bg-white/5 hover:text-white/90"
          onClick={onClose}
        >
          ????ng
        </button>
        <button
          type="button"
          className="rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-950/50 ring-1 ring-white/10 transition-all hover:from-indigo-500 hover:to-sky-500 hover:shadow-lg hover:shadow-indigo-900/35 active:scale-[0.98]"
          onClick={onApply}
        >
          ??p d???ng
        </button>
      </div>
    </div>
  </div>
);
