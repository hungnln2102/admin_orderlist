import React from "react";
import {
  Calendar as CalendarIcon,
  Lock,
  CalendarDays,
  LayoutGrid,
  SlidersHorizontal,
} from "lucide-react";
import { ThemeItem, ViewTab } from "../types";

interface OtpThemeToolbarProps {
  mode: "auto" | "fixed";
  setMode: (mode: "auto" | "fixed") => void;
  selectedTheme: string;
  setSelectedTheme: (theme: string) => void;
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;
  themesList: ThemeItem[];
  activeThemeMeta: ThemeItem;
  rulesCount: number;
  onThemeSelectToast: (themeName: string) => void;
}

export const OtpThemeToolbar: React.FC<OtpThemeToolbarProps> = ({
  mode,
  setMode,
  selectedTheme,
  setSelectedTheme,
  activeTab,
  setActiveTab,
  themesList,
  activeThemeMeta,
  rulesCount,
  onThemeSelectToast,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm shrink-0">
      {/* Nhóm 1: Chế độ hoạt động (Tự động / Cố định) kèm Quick Selector */}
      <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-lg border border-slate-800/80">
        <button
          type="button"
          onClick={() => setMode("auto")}
          className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
            mode === "auto"
              ? "bg-cyan-500 text-slate-950 shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          <span>Tự Động Theo Lịch</span>
        </button>

        <button
          type="button"
          onClick={() => setMode("fixed")}
          className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
            mode === "fixed"
              ? "bg-amber-500 text-slate-950 shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Cố Định 1 Theme</span>
        </button>

        {mode === "fixed" && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
            <span className="text-[11px] text-amber-300 font-semibold hidden lg:inline">Chọn Theme Cố Định:</span>
            <select
              value={selectedTheme}
              onChange={(e) => {
                const pick = e.target.value;
                setSelectedTheme(pick);
                const meta = themesList.find((t) => t.id === pick);
                onThemeSelectToast(meta?.name || pick);
              }}
              className="bg-amber-950/80 text-amber-200 border border-amber-500/50 rounded px-2 py-1 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-amber-400"
            >
              {themesList.map((t) => (
                <option key={t.id} value={t.id} className="bg-slate-900 text-slate-100">
                  {t.icon} {t.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Nhóm 2: View Switcher */}
      <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800/80">
        <button
          type="button"
          onClick={() => setActiveTab("calendar")}
          className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === "calendar"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          <span>Lịch Âm Dương</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("presets")}
          className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === "presets"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Bộ Sưu Tập ({themesList.length} Themes)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("schedule")}
          className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === "schedule"
              ? "bg-amber-500 text-slate-950 shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Lịch Rule ({rulesCount})</span>
        </button>
      </div>

      {/* Nhóm 3: Mini Badge Theme đang chọn */}
      <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
        <span className="text-slate-400 text-[11px] hidden sm:inline">Theme lưu:</span>
        <span className="text-base">{activeThemeMeta.icon}</span>
        <span className="font-bold text-white text-xs">{activeThemeMeta.name}</span>
        <span className="w-2.5 h-2.5 rounded-full border border-white/20 ml-1" style={{ background: activeThemeMeta.accent }} />
      </div>
    </div>
  );
};

