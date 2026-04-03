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
    <div className="rounded-[32px] glass-panel-light p-2 border border-white/5 shadow-2xl flex flex-col sm:flex-row gap-2 relative z-10 transition-all duration-500">
      {CATEGORY_OPTIONS.map((option) => {
        const isActive = activeCategory === option.value;
        const count = counts[option.value];
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`group relative flex-1 min-w-[200px] text-left rounded-[26px] px-6 py-5 transition-all duration-500 overflow-hidden ${
              isActive
                ? "bg-indigo-600/40 text-white shadow-[0_0_40px_rgba(99,102,241,0.25)] border border-indigo-400/30"
                : "text-indigo-100/60 hover:text-white border border-transparent"
            }`}
          >
            {/* Active Aura */}
            {isActive && (
              <div className="absolute -right-8 -top-8 w-24 h-24 bg-indigo-500/20 rounded-full blur-3xl animate-pulse"></div>
            )}
            
            <div className="relative z-10 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] leading-none opacity-80">
                  {option.label}
                </p>
                <p className={`text-sm font-bold tracking-tight transition-colors ${isActive ? 'text-white' : 'text-indigo-100/70 group-hover:text-white'}`}>
                  {option.description}
                </p>
              </div>
              <div className={`text-2xl font-black tracking-tighter ${isActive ? 'text-indigo-300' : 'text-indigo-200/20 group-hover:text-indigo-200/40'}`}>
                {count.toLocaleString()}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
