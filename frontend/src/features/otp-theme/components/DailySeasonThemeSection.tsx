import React from "react";
import { Sun, Sparkles, CheckCircle2, ShieldCheck, CalendarRange } from "lucide-react";
import { ThemeScheduleConfig } from "../../../shared/utils/themeSchedule";
import { ThemeItem } from "../types";

interface DailySeasonThemeSectionProps {
  schedule: ThemeScheduleConfig;
  setSchedule: React.Dispatch<React.SetStateAction<ThemeScheduleConfig>>;
  themesList: ThemeItem[];
}

export const DailySeasonThemeSection: React.FC<DailySeasonThemeSectionProps> = ({
  schedule,
  setSchedule,
  themesList,
}) => {
  const currentMonth = new Date().getMonth() + 1;
  const isSeasonal = (schedule.backgroundMode || "seasonal_4seasons") === "seasonal_4seasons";

  // Tìm mùa đang hoạt động của tháng hiện tại
  const activeSeasonRule = schedule.seasonRules.find((rule) =>
    rule.startMonth <= rule.endMonth
      ? currentMonth >= rule.startMonth && currentMonth <= rule.endMonth
      : currentMonth >= rule.startMonth || currentMonth <= rule.endMonth
  );
  const activeSeasonThemeMeta = themesList.find((t) => t.id === activeSeasonRule?.theme);
  const defaultThemeMeta = themesList.find((t) => t.id === schedule.defaultTheme) || themesList[0];

  return (
    <div className="rounded-xl border border-cyan-800/50 bg-slate-900/90 p-4 space-y-4 shadow-md">
      {/* 1. Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Sun className="w-4 h-4 text-amber-400" />
            Chiến Lược Theme Nền Ngày Thường & 4 Mùa
          </h3>
          <p className="text-[11px] text-slate-400">
            Áp dụng cho mọi ngày trong năm khi không rơi vào các ngày lễ hội ưu tiên.
          </p>
        </div>

        {/* Thông báo trạng thái nhanh */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px]">
          <span className="text-slate-400">Giao diện ngày thường hiện tại:</span>
          {isSeasonal ? (
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              <span>{activeSeasonThemeMeta?.icon || "❄️"}</span>
              <span>{activeSeasonThemeMeta?.name || "Theme Mùa"} (Tháng {currentMonth})</span>
            </span>
          ) : (
            <span className="font-bold text-cyan-400 flex items-center gap-1">
              <span>{defaultThemeMeta.icon}</span>
              <span>{defaultThemeMeta.name} (Cố Định Quanh Năm)</span>
            </span>
          )}
        </div>
      </div>

      {/* 2. Bộ Chuyển Đổi Chiến Lược: 4 Mùa Anime VS Theme Cố Định */}
      <div>
        <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2">
          Chọn Chế Độ Hiển Thị Cho Ngày Thường:
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Nút Chế Độ 1: 4 Mùa Anime */}
          <button
            type="button"
            onClick={() => setSchedule((curr) => ({ ...curr, backgroundMode: "seasonal_4seasons" }))}
            className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
              isSeasonal
                ? "border-emerald-500/80 bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-900 shadow-md ring-1 ring-emerald-500/50"
                : "border-slate-800 bg-slate-950/60 hover:bg-slate-800/40 text-slate-400"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🌸</span>
                <div>
                  <h4 className={`text-xs font-bold ${isSeasonal ? "text-emerald-300" : "text-slate-200"}`}>
                    Tự Động Đổi Theo 4 Mùa Anime
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Xuân (T1-3) • Hạ (T4-6) • Thu (T7-9) • Đông (T10-12)
                  </p>
                </div>
              </div>
              {isSeasonal && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Đang Áp Dụng
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400/90 italic mt-2 border-t border-slate-800/60 pt-1.5">
              💡 Khuyên dùng: Tháng 11 hiện tại sẽ tự động hiển thị ❄️ Mùa Đông Anime!
            </p>
          </button>

          {/* Nút Chế Độ 2: Theme Cố Định Quanh Năm */}
          <button
            type="button"
            onClick={() => setSchedule((curr) => ({ ...curr, backgroundMode: "fixed_default" }))}
            className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
              !isSeasonal
                ? "border-cyan-500/80 bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-slate-900 shadow-md ring-1 ring-cyan-500/50"
                : "border-slate-800 bg-slate-950/60 hover:bg-slate-800/40 text-slate-400"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⚡</span>
                <div>
                  <h4 className={`text-xs font-bold ${!isSeasonal ? "text-cyan-300" : "text-slate-200"}`}>
                    Dùng 1 Theme Cố Định Quanh Năm
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Mặc định Cyber Core hoặc bất kỳ theme tùy chọn nào
                  </p>
                </div>
              </div>
              {!isSeasonal && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-cyan-400" /> Đang Áp Dụng
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400/90 italic mt-2 border-t border-slate-800/60 pt-1.5">
              💡 Phù hợp nếu bạn muốn cố định Cyber Core cho mọi ngày thường mà không đổi theo mùa.
            </p>
          </button>
        </div>
      </div>

      {/* 3. Panel Chi Tiết Của Chế Độ Cố Định */}
      {!isSeasonal && (
        <div className="p-3.5 rounded-xl border border-cyan-600/40 bg-cyan-950/15 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-cyan-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              Theme Cố Định Được Áp Dụng Cho Mọi Ngày Thường:
            </span>
            <div className="flex items-center gap-2">
              <select
                value={schedule.defaultTheme}
                onChange={(e) => setSchedule((curr) => ({ ...curr, defaultTheme: e.target.value }))}
                className="rounded-lg border border-cyan-500/60 bg-slate-900 px-3 py-1.5 text-xs font-bold text-cyan-300 focus:outline-none shadow-inner"
              >
                {themesList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.icon} {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            🎯 Toàn bộ các ngày trong năm (không rơi vào ngày lễ ưu tiên) sẽ hiển thị theme{" "}
            <span className="text-cyan-300 font-bold">{defaultThemeMeta.icon} {defaultThemeMeta.name}</span>.
          </p>
        </div>
      )}

      {/* 4. Khối 4 Thẻ Mùa Trong Năm */}
      <div className={`space-y-2.5 transition-all ${!isSeasonal ? "opacity-50 pointer-events-none" : ""}`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <CalendarRange className="w-3.5 h-3.5 text-indigo-400" />
            Cấu Hình 4 Mùa Trong Năm:
          </span>
          {!isSeasonal ? (
            <span className="text-[10px] font-bold text-amber-400/90 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded">
              🔒 Đang tắt (Đang ưu tiên Theme Cố Định ở trên)
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 italic">
              Tự động nhận diện theo tháng dương lịch hiện hành
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
          {schedule.seasonRules.map((rule) => {
            const seasonTitles: Record<string, { label: string; icon: string; color: string; borderActive: string }> = {
              spring: { label: "Mùa Xuân", icon: "🌸", color: "border-rose-800/40 bg-rose-950/20 text-rose-300", borderActive: "ring-2 ring-rose-400/80 border-rose-500 shadow-rose-950/50" },
              summer: { label: "Mùa Hạ", icon: "☀️", color: "border-amber-800/40 bg-amber-950/20 text-amber-300", borderActive: "ring-2 ring-amber-400/80 border-amber-500 shadow-amber-950/50" },
              autumn: { label: "Mùa Thu", icon: "🍁", color: "border-orange-800/40 bg-orange-950/20 text-orange-300", borderActive: "ring-2 ring-orange-400/80 border-orange-500 shadow-orange-950/50" },
              winter: { label: "Mùa Đông", icon: "❄️", color: "border-sky-800/40 bg-sky-950/20 text-sky-300", borderActive: "ring-2 ring-sky-400/80 border-sky-500 shadow-sky-950/50" },
            };
            const meta = seasonTitles[rule.id] || { label: rule.id, icon: "✨", color: "border-slate-800 bg-slate-950/70 text-slate-300", borderActive: "ring-2 ring-cyan-400" };

            // Kiểm tra mùa hiện hành
            const isCurrentSeason =
              rule.startMonth <= rule.endMonth
                ? currentMonth >= rule.startMonth && currentMonth <= rule.endMonth
                : currentMonth >= rule.startMonth || currentMonth <= rule.endMonth;

            return (
              <div
                key={rule.id}
                className={`rounded-xl border p-2.5 space-y-2 shadow-sm transition-all ${meta.color} ${
                  isSeasonal && isCurrentSeason ? meta.borderActive : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black flex items-center gap-1.5">
                    <span className="text-base">{meta.icon}</span> {meta.label}
                  </span>
                  {isSeasonal && isCurrentSeason ? (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                      🔥 ĐANG HOẠT ĐỘNG
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400">
                      Tháng {rule.startMonth} - Tháng {rule.endMonth}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <span className="text-[9px] text-slate-400 block mb-0.5">Tháng Bắt Đầu</span>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={rule.startMonth}
                      onChange={(e) =>
                        setSchedule((curr) => ({
                          ...curr,
                          seasonRules: curr.seasonRules.map((r) => (r.id === rule.id ? { ...r, startMonth: Number(e.target.value) } : r)),
                        }))
                      }
                      className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-center font-bold text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block mb-0.5">Tháng Kết Thúc</span>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={rule.endMonth}
                      onChange={(e) =>
                        setSchedule((curr) => ({
                          ...curr,
                          seasonRules: curr.seasonRules.map((r) => (r.id === rule.id ? { ...r, endMonth: Number(e.target.value) } : r)),
                        }))
                      }
                      className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-center font-bold text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-[9px] text-slate-400 block mb-0.5">Theme áp dụng cho mùa:</span>
                  <select
                    value={rule.theme}
                    onChange={(e) =>
                      setSchedule((curr) => ({
                        ...curr,
                        seasonRules: curr.seasonRules.map((r) => (r.id === rule.id ? { ...r, theme: e.target.value } : r)),
                      }))
                    }
                    className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-cyan-500"
                  >
                    {themesList.map((theme) => (
                      <option key={theme.id} value={theme.id}>
                        {theme.icon} {theme.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
