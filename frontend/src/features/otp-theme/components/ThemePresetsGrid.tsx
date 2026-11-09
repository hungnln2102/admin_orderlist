import React from "react";
import { Lock, Check } from "lucide-react";
import { SeasonFilter, ThemeItem } from "../types";

interface ThemePresetsGridProps {
  themesList: ThemeItem[];
  filteredThemes: ThemeItem[];
  selectedTheme: string;
  activeSeason: SeasonFilter;
  setActiveSeason: (s: SeasonFilter) => void;
  mode: "auto" | "fixed";
  onSelectTheme: (themeId: string) => void;
}

export const ThemePresetsGrid: React.FC<ThemePresetsGridProps> = ({
  themesList,
  filteredThemes,
  selectedTheme,
  activeSeason,
  setActiveSeason,
  mode,
  onSelectTheme,
}) => {
  return (
    <div className="h-full flex flex-col space-y-2 overflow-hidden">
      {/* Filter buttons */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 shrink-0">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900/90 border border-slate-800">
          {[
            { id: "all", label: `Tất cả (${themesList.length})` },
            { id: "spring", label: `Mùa Xuân (${themesList.filter((t) => t.season === "spring").length})` },
            { id: "summer", label: `Mùa Hạ (${themesList.filter((t) => t.season === "summer").length})` },
            { id: "autumn", label: `Mùa Thu (${themesList.filter((t) => t.season === "autumn").length})` },
            { id: "winter", label: `Mùa Đông (${themesList.filter((t) => t.season === "winter").length})` },
            { id: "modern", label: "Cyber Core" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSeason(tab.id as SeasonFilter)}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
                activeSeason === tab.id
                  ? "bg-cyan-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {mode === "fixed" && (
          <span className="text-xs text-amber-400 font-semibold hidden sm:flex items-center gap-1 shrink-0">
            <Lock className="w-3.5 h-3.5" /> Bấm vào thẻ để chọn theme muốn cố định cho cổng OTP
          </span>
        )}
      </div>

      {/* Scrollable Theme Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {filteredThemes.map((item) => {
          const isSelected = selectedTheme === item.id;
          return (
            <div
              key={item.id}
              onClick={() => onSelectTheme(item.id)}
              className={`relative p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? "bg-slate-900/90 border-cyan-400 ring-2 ring-cyan-500/20 shadow-md shadow-cyan-950/60"
                  : "bg-slate-900/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/40"
              }`}
            >
              {isSelected && (
                <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-cyan-400 text-slate-950 flex items-center gap-1 font-bold text-[10px] shadow-xs">
                  <Check className="w-3 h-3" />
                  <span>ĐANG CHỌN</span>
                </div>
              )}

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{item.icon}</span>
                  <div>
                    <h4 className="font-bold text-xs text-white truncate max-w-[150px]">{item.name}</h4>
                    <span className="text-[9px] text-slate-400">{item.badge}</span>
                  </div>
                </div>

                <div className="mt-2 space-y-0.5">
                  <p className="text-[10px] font-bold text-slate-200 truncate">{item.title}</p>
                  <p className="text-[9px] text-slate-400 italic truncate">{item.subtitle}</p>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[9px]">
                <span className="text-slate-500 font-mono">#{item.id}</span>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: item.accent }} />
                  <span className="text-slate-400">{item.accent}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

