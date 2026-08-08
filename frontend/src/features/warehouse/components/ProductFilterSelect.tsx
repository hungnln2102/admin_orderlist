import React from "react";
import { CubeIcon } from "@heroicons/react/24/outline";

const selectCls =
  "w-full min-w-0 cursor-pointer appearance-none rounded-2xl border border-white/5 bg-slate-950/50 py-3 !pl-12 pr-9 text-sm text-white placeholder:text-slate-500 outline-none transition-all focus:border-indigo-500/60 focus:bg-slate-950/70 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50";

const chevronStyle: React.CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='2' stroke='%236366f1'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='m19.5 8.25-7.5 7.5-7.5-7.5' /%3E%3C/svg%3E\")",
  backgroundPosition: "right 0.8rem center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "1rem",
};

type Props = {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  loading?: boolean;
};

export const ProductFilterSelect: React.FC<Props> = ({
  value,
  options,
  onChange,
  loading,
}) => (
  <div className="relative w-full min-w-[12rem] sm:w-[14rem] sm:shrink-0">
    <CubeIcon className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-indigo-400/80" />
    <select
      className={selectCls}
      style={chevronStyle}
      value={value}
      disabled={loading}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Lọc theo sản phẩm"
    >
      <option value="" className="bg-slate-950 text-slate-300">
        Tất cả sản phẩm
      </option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-slate-950 text-slate-100">
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);
