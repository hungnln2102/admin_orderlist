import React from "react";
import { Eye, Edit2 } from "lucide-react";
import { CategorySummary } from "../types";

const CATEGORY_ACCENTS = [
  { border: "border-sky-500/30", glow: "bg-sky-500/20", text: "text-sky-400", bg: "bg-sky-500/10" },
  { border: "border-purple-500/30", glow: "bg-purple-500/20", text: "text-purple-400", bg: "bg-purple-500/10" },
  { border: "border-emerald-500/30", glow: "bg-emerald-500/20", text: "text-emerald-400", bg: "bg-emerald-500/10" },
  { border: "border-amber-500/30", glow: "bg-amber-500/20", text: "text-amber-400", bg: "bg-amber-500/10" },
  { border: "border-cyan-500/30", glow: "bg-cyan-500/20", text: "text-cyan-400", bg: "bg-cyan-500/10" },
  { border: "border-rose-500/30", glow: "bg-rose-500/20", text: "text-rose-400", bg: "bg-rose-500/10" },
];

interface PackageCategoryCardsProps {
  categorySummaries: CategorySummary[];
  selectedCategory: string;
  onSelectCategory: (name: string) => void;
  onEditCategory: (name: string) => void;
}

export const PackageCategoryCards: React.FC<PackageCategoryCardsProps> = ({
  categorySummaries,
  selectedCategory,
  onSelectCategory,
  onEditCategory,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {categorySummaries.map((cat, idx) => {
        const isSelected = cat.name.toLowerCase() === selectedCategory.toLowerCase();
        const accent = CATEGORY_ACCENTS[idx % CATEGORY_ACCENTS.length];

        return (
          <div
            key={cat.name}
            onClick={() => onSelectCategory(cat.name)}
            className={`relative group rounded-2xl border transition-all duration-300 p-5 cursor-pointer backdrop-blur-xl overflow-hidden ${
              isSelected
                ? `bg-slate-900/90 ${accent.border} ring-2 ring-cyan-500/40 shadow-xl shadow-cyan-950/40`
                : "bg-slate-900/40 border-slate-800/80 hover:bg-slate-900/70 hover:border-slate-700"
            }`}
          >
            {/* Background Ambient Glow */}
            <div className={`absolute -right-10 -top-10 w-28 h-28 rounded-full blur-2xl opacity-20 ${accent.glow}`} />

            <div className="flex items-center justify-between mb-4 relative z-10">
              <div>
                <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-slate-400">LOẠI GÓI</span>
                <h3 className="text-lg font-bold text-white tracking-wide mt-0.5">{cat.name}</h3>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCategory(cat.name);
                  }}
                  className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Xem danh sách"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditCategory(cat.name);
                  }}
                  className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Chỉnh sửa loại gói"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 3 Stats Indicators */}
            <div className="grid grid-cols-3 gap-2 relative z-10">
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60 text-center">
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">SỐ GÓI</div>
                <div className="text-base font-black text-white mt-0.5">{cat.total}</div>
              </div>
              <div className="bg-amber-500/5 p-2.5 rounded-xl border border-amber-500/15 text-center">
                <div className="text-[9px] font-bold text-amber-500/70 uppercase tracking-wider">SẮP HẾT</div>
                <div className="text-base font-black text-amber-400 mt-0.5">{cat.low}</div>
              </div>
              <div className="bg-rose-500/5 p-2.5 rounded-xl border border-rose-500/15 text-center">
                <div className="text-[9px] font-bold text-rose-500/70 uppercase tracking-wider">HẾT</div>
                <div className="text-base font-black text-rose-400 mt-0.5">{cat.out}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
