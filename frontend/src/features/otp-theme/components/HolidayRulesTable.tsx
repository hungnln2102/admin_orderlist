import React from "react";
import { Sparkles, Search, Plus, Eye, Trash2 } from "lucide-react";
import { ThemeDateRule, ThemeScheduleConfig } from "../../../shared/utils/themeSchedule";
import { RuleCalendarFilter, ThemeItem } from "../types";

interface HolidayRulesTableProps {
  schedule: ThemeScheduleConfig;
  setSchedule: React.Dispatch<React.SetStateAction<ThemeScheduleConfig>>;
  themesList: ThemeItem[];
  filteredRules: ThemeDateRule[];
  ruleSearch: string;
  setRuleSearch: (val: string) => void;
  ruleCalendarFilter: RuleCalendarFilter;
  setRuleCalendarFilter: (val: RuleCalendarFilter) => void;
  onViewOnCalendar: (rule: ThemeDateRule) => void;
  showToast: (type: "success" | "error", msg: string) => void;
}

export const HolidayRulesTable: React.FC<HolidayRulesTableProps> = ({
  schedule,
  setSchedule,
  themesList,
  filteredRules,
  ruleSearch,
  setRuleSearch,
  ruleCalendarFilter,
  setRuleCalendarFilter,
  onViewOnCalendar,
  showToast,
}) => {
  const updateHolidayRule = (ruleId: string, patch: Partial<ThemeDateRule>) => {
    setSchedule((current) => ({
      ...current,
      holidayRules: current.holidayRules.map((rule) => (rule.id === ruleId ? { ...rule, ...patch } : rule)),
    }));
  };

  const handleAddNewRule = () => {
    const newRule: ThemeDateRule = {
      id: `holiday-${Date.now()}`,
      calendarType: "solar",
      startMonth: 1,
      startDay: 1,
      endMonth: 1,
      endDay: 1,
      theme: themesList[0]?.id || "tet",
      enabled: true,
    };
    setSchedule((curr) => ({ ...curr, holidayRules: [newRule, ...curr.holidayRules] }));
    showToast("success", "Đã thêm rule lễ mới ở đầu danh sách!");
  };

  const handleDeleteRule = (ruleId: string) => {
    setSchedule((curr) => ({
      ...curr,
      holidayRules: curr.holidayRules.filter((r) => r.id !== ruleId),
    }));
    showToast("success", "Đã xóa rule lễ.");
  };

  return (
    <div className="rounded-xl border border-rose-800/50 bg-slate-900/90 p-3.5 space-y-3 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-rose-400" />
            Theme Lễ Ưu Tiên
          </h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800/50">
            {schedule.holidayRules.length} Rules ({schedule.holidayRules.filter((r) => r.enabled).length} Đang Bật)
          </span>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm rule theo tên..."
              value={ruleSearch}
              onChange={(e) => setRuleSearch(e.target.value)}
              className="pl-8 pr-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 w-36 sm:w-48 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-0.5 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
            {(
              [
                { id: "all", label: "Tất cả" },
                { id: "lunar", label: "🌙 Âm Lịch" },
                { id: "solar", label: "🌞 Dương Lịch" },
                { id: "enabled", label: "Đang Bật" },
              ] as const
            ).map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setRuleCalendarFilter(filter.id)}
                className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                  ruleCalendarFilter === filter.id
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddNewRule}
            className="px-3 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white flex items-center gap-1 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Thêm Rule</span>
          </button>
        </div>
      </div>

      {/* Bảng Quản Trị Rule Lễ */}
      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/50">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-950/90 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
            <tr>
              <th className="p-2.5 text-center w-12">Bật</th>
              <th className="p-2.5 min-w-[180px]">Theme Lễ Hội</th>
              <th className="p-2.5 text-center w-28">Hệ Lịch</th>
              <th className="p-2.5 min-w-[130px]">Ngày Bắt Đầu (dd/mm)</th>
              <th className="p-2.5 min-w-[130px]">Ngày Kết Thúc (dd/mm)</th>
              <th className="p-2.5 text-center min-w-[120px]">Dải Ngày</th>
              <th className="p-2.5 text-center w-24">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {filteredRules.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500 italic">
                  Không tìm thấy rule lễ hội nào phù hợp với bộ lọc.
                </td>
              </tr>
            ) : (
              filteredRules.map((rule) => {
                const themeMeta = themesList.find((t) => t.id === rule.theme);
                return (
                  <tr
                    key={rule.id}
                    className={`hover:bg-slate-900/60 transition-colors ${
                      !rule.enabled ? "opacity-50" : ""
                    }`}
                  >
                    <td className="p-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={(e) => updateHolidayRule(rule.id, { enabled: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-rose-400 cursor-pointer"
                        title={rule.enabled ? "Đang bật" : "Đang tắt"}
                      />
                    </td>

                    <td className="p-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg shrink-0">{themeMeta?.icon || "✨"}</span>
                        <select
                          value={rule.theme}
                          onChange={(e) => updateHolidayRule(rule.id, { theme: e.target.value })}
                          className="w-full rounded border border-slate-800 bg-slate-900 px-2 py-1 text-xs font-semibold text-white focus:outline-none focus:border-cyan-500"
                        >
                          {themesList.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>

                    <td className="p-2.5 text-center">
                      <select
                        value={rule.calendarType}
                        onChange={(e) =>
                          updateHolidayRule(rule.id, { calendarType: e.target.value as ThemeDateRule["calendarType"] })
                        }
                        className={`rounded px-2 py-1 text-xs font-bold border focus:outline-none ${
                          rule.calendarType === "lunar"
                            ? "bg-purple-950/80 text-purple-300 border-purple-700/60"
                            : "bg-cyan-950/80 text-cyan-300 border-cyan-700/60"
                        }`}
                      >
                        <option value="lunar" className="bg-slate-900 text-purple-300">🌙 Lịch Âm</option>
                        <option value="solar" className="bg-slate-900 text-cyan-300">🌞 Dương Lịch</option>
                      </select>
                    </td>

                    <td className="p-2.5">
                      <div className="flex items-center gap-1">
                        <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5">
                          <span className="text-[10px] text-slate-500">Ngày</span>
                          <input
                            type="number"
                            min="1"
                            max="31"
                            value={rule.startDay}
                            onChange={(e) => updateHolidayRule(rule.id, { startDay: Number(e.target.value) })}
                            className="w-8 bg-transparent text-center font-bold text-white text-xs focus:outline-none"
                          />
                        </div>
                        <span className="text-slate-500 font-bold">/</span>
                        <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5">
                          <span className="text-[10px] text-slate-500">Tháng</span>
                          <input
                            type="number"
                            min="1"
                            max="12"
                            value={rule.startMonth}
                            onChange={(e) => updateHolidayRule(rule.id, { startMonth: Number(e.target.value) })}
                            className="w-8 bg-transparent text-center font-bold text-white text-xs focus:outline-none"
                          />
                        </div>
                      </div>
                    </td>

                    <td className="p-2.5">
                      <div className="flex items-center gap-1">
                        <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5">
                          <span className="text-[10px] text-slate-500">Ngày</span>
                          <input
                            type="number"
                            min="1"
                            max="31"
                            value={rule.endDay}
                            onChange={(e) => updateHolidayRule(rule.id, { endDay: Number(e.target.value) })}
                            className="w-8 bg-transparent text-center font-bold text-white text-xs focus:outline-none"
                          />
                        </div>
                        <span className="text-slate-500 font-bold">/</span>
                        <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5">
                          <span className="text-[10px] text-slate-500">Tháng</span>
                          <input
                            type="number"
                            min="1"
                            max="12"
                            value={rule.endMonth}
                            onChange={(e) => updateHolidayRule(rule.id, { endMonth: Number(e.target.value) })}
                            className="w-8 bg-transparent text-center font-bold text-white text-xs focus:outline-none"
                          />
                        </div>
                      </div>
                    </td>

                    <td className="p-2.5 text-center">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold inline-block border"
                        style={{
                          backgroundColor: `${themeMeta?.accent || "#22d3ee"}20`,
                          borderColor: `${themeMeta?.accent || "#22d3ee"}60`,
                          color: themeMeta?.accent || "#22d3ee",
                        }}
                      >
                        {rule.startDay}/{rule.startMonth} → {rule.endDay}/{rule.endMonth} {rule.calendarType === "lunar" ? "(Âm)" : ""}
                      </span>
                    </td>

                    <td className="p-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onViewOnCalendar(rule)}
                          title="Xem vị trí ngày lễ này trên Lịch Âm Dương"
                          className="p-1 rounded hover:bg-slate-800 text-cyan-400 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteRule(rule.id)}
                          title="Xóa rule này"
                          className="p-1 rounded hover:bg-rose-950 text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

