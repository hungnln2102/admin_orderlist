import React from "react";
import { CubeIcon } from "@heroicons/react/24/outline";
import type { ProductOption } from "../hooks/useWarehouseProducts";

const selectCls =
  "w-full min-w-0 cursor-pointer appearance-none rounded-2xl border border-white/10 bg-slate-950/40 py-2.5 pl-10 pr-9 text-sm text-white outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/50";

const chevronStyle: React.CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='2' stroke='%23818cf8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='m19.5 8.25-7.5 7.5-7.5-7.5' /%3E%3C/svg%3E\")",
  backgroundPosition: "right 0.65rem center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "1.1rem",
};

type Props = {
  value: string;
  options: ProductOption[];
  onChange: (value: string) => void;
  loading?: boolean;
};

export const ProductFilterSelect: React.FC<Props> = ({
  value,
  options,
  onChange,
  loading,
}) => (
  <div className="relative w-full min-w-[10rem] sm:w-[13rem] sm:shrink-0">
    <CubeIcon className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-indigo-300/70" />
    <select
      className={selectCls}
      style={chevronStyle}
      value={value}
      disabled={loading}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Lọc theo sản phẩm"
    >
      <option value="" className="bg-slate-900 text-white">
        Tất cả sản phẩm
      </option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);
