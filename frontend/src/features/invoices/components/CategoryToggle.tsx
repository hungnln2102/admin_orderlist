import React from "react";
import { CATEGORY_OPTIONS, ReceiptCategory } from "../helpers";

type CategoryToggleProps = {
  activeCategory: ReceiptCategory;
  counts: Record<ReceiptCategory, number>;
  onChange: (category: ReceiptCategory) => void;
};

export const CategoryToggle: React.FC<CategoryToggleProps> = ({
  activeCategory,
  counts,
  onChange,
}) => {
  return (
    <div className="bg-slate-900/50 backdrop-blur-md border border-white/[0.06] rounded-2xl p-1.5 flex gap-2 relative z-10 transition-all">
      {CATEGORY_OPTIONS.map((option) => {
        const isActive = activeCategory === option.value;
        const count = counts[option.value];
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`group relative flex-1 flex items-center justify-center gap-2.5 rounded-xl py-3 px-4 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
              isActive
                ? "bg-gradient-to-r from-indigo-500/80 to-purple-600/80 text-white shadow-md shadow-indigo-950/50 border border-indigo-400/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent"
            }`}
          >
            <span>{option.label}</span>
            <span
              className={`font-mono text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                isActive
                  ? "bg-indigo-950/80 text-indigo-300 border-indigo-400/30"
                  : "bg-slate-950/40 text-slate-500 border-white/[0.04] group-hover:border-white/[0.08] group-hover:text-slate-400"
              }`}
            >
              {count.toLocaleString()}
            </span>
          </button>
        );
      })}
    </div>
  );
};
