import { convertDMYToYMD, formatDateToDMY } from "@/shared/date";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DashboardDateRangePopover } from "./DashboardDateRangePopover";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";

/** chartBucket: preset — day | month | year (một cột mỗi năm dương lịch). */
export type DashboardDateRangeValue = {
  from: string;
  to: string;
  chartBucket?: "day" | "month" | "year";
};

type Props = {
  value: DashboardDateRangeValue | null;
  onChange: (next: DashboardDateRangeValue | null) => void;
  /** Gộp thêm class cho wrapper (layout trang cha). */
  className?: string;
};

const parseRangeText = (raw: string): DashboardDateRangeValue | null => {
  const trimmed = raw.trim();
  const parts = trimmed
    .split(/\s*(?:-|–|—|→)\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length !== 2) return null;
  const [a, b] = parts;
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(a) || !/^\d{2}\/\d{2}\/\d{4}$/.test(b)) {
    return null;
  }
  const from = convertDMYToYMD(a);
  const to = convertDMYToYMD(b);
  if (from > to) return null;
  return { from, to };
};

const POPOVER_W = 320;

export const DashboardDateRangeFilter: React.FC<Props> = ({
  value,
  onChange,
  className = "",
}) => {
  const [text, setText] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [localStart, setLocalStart] = useState("");
  const [localEnd, setLocalEnd] = useState("");
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const hasValue = Boolean(value?.from && value?.to);

  useEffect(() => {
    if (value) {
      const d0 = formatDateToDMY(value.from) || value.from;
      const d1 = formatDateToDMY(value.to) || value.to;
      setText(`${d0} - ${d1}`);
      setLocalStart(d0);
      setLocalEnd(d1);
    } else {
      setText("");
      setLocalStart("");
      setLocalEnd("");
    }
  }, [value]);

  const updatePopoverPosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const w = Math.min(POPOVER_W, window.innerWidth - 24);
    let left = r.right - w;
    if (left < 12) left = 12;
    if (left + w > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - 12 - w);
    }
    const top = r.bottom + 8;
    setPopoverPos({ top, left });
  }, []);

  useEffect(() => {
    if (!popoverOpen) return;
    updatePopoverPosition();
    window.addEventListener("scroll", updatePopoverPosition, true);
    window.addEventListener("resize", updatePopoverPosition);
    return () => {
      window.removeEventListener("scroll", updatePopoverPosition, true);
      window.removeEventListener("resize", updatePopoverPosition);
    };
  }, [popoverOpen, updatePopoverPosition]);

  useEffect(() => {
    if (!popoverOpen) return;
    const onDocPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;
      setPopoverOpen(false);
    };
    const t = window.setTimeout(() => {
      document.addEventListener("pointerdown", onDocPointerDown, true);
    }, 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("pointerdown", onDocPointerDown, true);
    };
  }, [popoverOpen]);

  const applyRange = useCallback(
    (next: DashboardDateRangeValue | null) => {
      onChange(next);
      setPopoverOpen(false);
    },
    [onChange]
  );

  const applyFromText = useCallback(() => {
    if (!text.trim()) {
      applyRange(null);
      return;
    }
    const parsed = parseRangeText(text);
    if (parsed) {
      applyRange(parsed);
      return;
    }
    if (value) {
      const d0 = formatDateToDMY(value.from) || value.from;
      const d1 = formatDateToDMY(value.to) || value.to;
      setText(`${d0} - ${d1}`);
    }
  }, [applyRange, text, value]);

  const handleTextBlur = useCallback(() => {
    window.setTimeout(() => {
      const ae = document.activeElement;
      if (wrapRef.current?.contains(ae)) return;
      if (popoverRef.current?.contains(ae)) return;
      applyFromText();
    }, 0);
  }, [applyFromText]);

  const handleCalendarApply = () => {
    if (!localStart || !localEnd) return;
    const from = convertDMYToYMD(localStart);
    const to = convertDMYToYMD(localEnd);
    if (from && to && from <= to) {
      applyRange({ from, to });
    }
  };

  const widthClasses = className.trim()
    ? className.trim()
    : "relative w-full min-w-0 sm:min-w-[272px] lg:w-[min(100%,320px)] lg:flex-shrink-0";

  const wrapClassName = widthClasses.startsWith("relative")
    ? widthClasses
    : `relative min-w-0 ${widthClasses}`;

  const popover =
    popoverOpen && typeof document !== "undefined"
      ? createPortal(
          <DashboardDateRangePopover
            refNode={popoverRef}
            top={popoverPos.top}
            left={popoverPos.left}
            localStart={localStart}
            localEnd={localEnd}
            onLocalStartChange={setLocalStart}
            onLocalEndChange={setLocalEnd}
            onClear={() => {
              setLocalStart("");
              setLocalEnd("");
              applyRange(null);
            }}
            onClose={() => setPopoverOpen(false)}
            onApply={handleCalendarApply}
          />,
          document.body
        )
      : null;

  return (
    <div ref={wrapRef} className={wrapClassName}>
      <div
        ref={anchorRef}
        className={[
          "group flex min-h-[46px] items-stretch overflow-hidden rounded-2xl border transition-all duration-200",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
          hasValue
            ? "border-indigo-400/35 bg-gradient-to-br from-slate-900/90 via-slate-950/70 to-indigo-950/25"
            : "border-white/10 bg-slate-950/45 hover:border-white/[0.14] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
          popoverOpen
            ? "ring-2 ring-indigo-500/50 border-indigo-400/50 shadow-[0_12px_40px_-14px_rgba(79,70,229,0.4)]"
            : "focus-within:border-indigo-400/55 focus-within:ring-2 focus-within:ring-indigo-500/45",
        ].join(" ")}
      >
        <input
          type="text"
          spellCheck={false}
          autoComplete="off"
          placeholder="dd/mm/yyyy – dd/mm/yyyy"
          className="min-w-0 flex-1 border-0 bg-transparent py-2.5 pl-3.5 pr-2 text-sm font-medium text-white outline-none selection:bg-indigo-500/35 placeholder:text-slate-400/60 sm:pl-4 tabular-nums tracking-wide"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleTextBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              applyFromText();
            }
          }}
        />
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            setPopoverOpen((o) => {
              const next = !o;
              if (next) queueMicrotask(() => updatePopoverPosition());
              return next;
            });
          }}
          className={[
            "group/cal relative flex min-w-[50px] shrink-0 cursor-pointer items-center justify-center border-l border-white/[0.08] bg-gradient-to-br from-indigo-500/[0.08] via-transparent to-transparent",
            "bg-slate-900/30 transition-[background,color,box-shadow] duration-200",
            "hover:bg-indigo-500/[0.14] hover:text-indigo-50 hover:shadow-[inset_0_0_20px_rgba(99,102,241,0.12)]",
            "active:bg-indigo-500/25",
            popoverOpen
              ? "bg-indigo-500/22 text-indigo-50 shadow-[inset_0_0_24px_rgba(99,102,241,0.18)]"
              : "text-indigo-200/88",
          ].join(" ")}
          aria-label="Mở lịch chọn khoảng ngày"
          aria-expanded={popoverOpen}
        >
          <CalendarDaysIcon
            className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover/cal:scale-[1.05] group-active/cal:scale-95"
            strokeWidth={1.75}
          />
        </button>
      </div>

      {popover}
    </div>
  );
};
