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
    <div className="rounded-[28px] bg-gradient-to-br from-slate-800/75 via-slate-800/60 to-slate-900/80 border border-white/12 p-4 shadow-[0_20px_55px_-32px_rgba(0,0,0,0.8),0_14px_36px_-28px_rgba(255,255,255,0.18)] backdrop-blur-sm flex flex-col sm:flex-row gap-3 text-slate-200">
      {CATEGORY_OPTIONS.map((option) => {
        const isActive = activeCategory === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex-1 min-w-[180px] text-left rounded-2xl border p-4 transition shadow-[0_12px_28px_-18px_rgba(0,0,0,0.65)] ${
              isActive
                ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white border-white/50 shadow-[0_16px_45px_-22px_rgba(79,70,229,0.65)]"
                : "bg-slate-800/70 text-slate-100 border-white/12 hover:bg-slate-700/70 hover:border-white/20"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold drop-shadow-sm">
                  {option.label}
                </p>
                <p className="text-xs text-slate-300 mt-1">
                  {option.description}
                </p>
              </div>
              <span
                className={`text-lg font-semibold ${
                  isActive ? "text-white" : "text-slate-100"
                }`}
              >
                {counts[option.value]}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
