import React from "react";
import ReactDOM from "react-dom";
import type { NavGroupAccent } from "./navigation";

export interface RailTooltipState {
  label: string;
  groupName?: string;
  accent?: NavGroupAccent;
  top: number;
  left: number;
}

const ACCENT_LABEL_CLASS: Record<NavGroupAccent, string> = {
  cyan: "text-cyan-400",
  emerald: "text-emerald-400",
  amber: "text-amber-400",
  purple: "text-purple-400",
  sky: "text-sky-400",
  indigo: "text-indigo-400",
};

const ACCENT_DOT_CLASS: Record<NavGroupAccent, string> = {
  cyan: "bg-cyan-400",
  emerald: "bg-emerald-400",
  amber: "bg-amber-400",
  purple: "bg-purple-400",
  sky: "bg-sky-400",
  indigo: "bg-indigo-400",
};

interface SidebarRailTooltipProps {
  tooltip: RailTooltipState | null;
}

/**
 * Floating Tooltip cho chế độ Sidebar Icon Rail.
 * Render qua React Portal để không bị cắt bởi overflow-y-auto của danh sách menu.
 */
export const SidebarRailTooltip: React.FC<SidebarRailTooltipProps> = ({ tooltip }) => {
  if (!tooltip || typeof document === "undefined") return null;

  const accent = tooltip.accent || "cyan";

  return ReactDOM.createPortal(
    <div
      role="tooltip"
      className="fixed z-[100] pointer-events-none -translate-y-1/2 animate-in fade-in zoom-in-95 duration-150"
      style={{ top: tooltip.top, left: tooltip.left }}
    >
      <div className="relative rounded-xl border border-slate-700/90 bg-[#0b1120]/95 backdrop-blur-xl px-3 py-2 shadow-2xl shadow-black/70 min-w-[140px] max-w-[240px]">
        {/* Mũi tên nhỏ chỉ về icon */}
        <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45 bg-[#0b1120] border-l border-b border-slate-700/90" />

        {tooltip.groupName && (
          <div
            className={`flex items-center gap-1.5 text-[9.5px] font-extrabold uppercase tracking-wider mb-0.5 ${ACCENT_LABEL_CLASS[accent]}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ACCENT_DOT_CLASS[accent]}`} />
            <span className="truncate">{tooltip.groupName}</span>
          </div>
        )}

        <div className="text-xs font-bold text-slate-100 whitespace-nowrap">
          {tooltip.label}
        </div>
      </div>
    </div>,
    document.body
  );
};
