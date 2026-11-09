import React, { useState } from "react";
import { Sparkles, RefreshCw, ExternalLink, Save, CheckCircle2, AlertCircle } from "lucide-react";
import { findNextRuleDate, getSeasonThemeForMonth, resolveScheduledThemeForDate, ThemeDateRule } from "../shared/utils/themeSchedule";
import {
  useOtpThemeConfig,
  useCalendarDragRange,
  OtpThemeToolbar,
  CalendarGridSection,
  HolidayThemeConfigForm,
  DayDetailsInspector,
  DailySeasonThemeSection,
  HolidayRulesTable,
  ThemePresetsGrid,
  ViewTab,
  SeasonFilter,
  RuleCalendarFilter,
} from "../features/otp-theme";

export const OtpThemeConfigPage: React.FC = () => {
  // 1. Hook quản trị cấu hình hệ thống & catalog themes
  const {
    themesList,
    mode,
    setMode,
    selectedTheme,
    setSelectedTheme,
    schedule,
    setSchedule,
    loading,
    saving,
    toast,
    showToast,
    fetchConfig,
    handleSave,
    activeThemeMeta,
  } = useOtpThemeConfig();

  // 2. View Tab states
  const [activeTab, setActiveTab] = useState<ViewTab>("calendar");
  const [activeSeason, setActiveSeason] = useState<SeasonFilter>("all");
  const [ruleSearch, setRuleSearch] = useState<string>("");
  const [ruleCalendarFilter, setRuleCalendarFilter] = useState<RuleCalendarFilter>("all");

  // 3. Hook quản trị tương tác lịch, long press và drag selection
  const {
    calYear,
    setCalYear,
    calMonth,
    setCalMonth,
    selectedDayCell,
    setSelectedDayCell,
    selectedRange,
    setSelectedRange,
    isConfiguringHoliday,
    setIsConfiguringHoliday,
    holidayForm,
    setHolidayForm,
    monthCells,
    handlePrevMonth,
    handleNextMonth,
    handleGoToday,
    isCellInRange,
    openHolidayConfigForRange,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleCellMouseUp,
    applyHolidayFormRule,
    deleteCurrentHolidayRule,
  } = useCalendarDragRange(schedule, setSchedule, themesList, handleSave, showToast);

  // Focus hoặc chọn theme khi click trong tab Bộ Sưu Tập
  const handleSelectPresetTheme = (themeId: string) => {
    setSelectedTheme(themeId);
    if (mode === "fixed") {
      const meta = themesList.find((t) => t.id === themeId);
      showToast("success", `Đã chọn Theme Cố Định: "${meta?.name || themeId}". Hãy bấm "Lưu Cấu Hình" để áp dụng!`);
      return;
    }
    const rule = schedule.holidayRules.find((item) => item.enabled && item.theme === themeId);
    if (!rule) return;
    const nextDate = findNextRuleDate(rule);
    if (!nextDate) return;
    setCalYear(nextDate.getUTCFullYear());
    setCalMonth(nextDate.getUTCMonth() + 1);
    setActiveTab("calendar");
  };

  // Điều hướng xem vị trí lễ trên lịch từ bảng rule
  const handleViewRuleOnCalendar = (rule: ThemeDateRule) => {
    const nextDate = findNextRuleDate(rule);
    if (nextDate) {
      setCalYear(nextDate.getUTCFullYear());
      setCalMonth(nextDate.getUTCMonth() + 1);
    } else {
      setCalMonth(rule.startMonth);
    }
    setActiveTab("calendar");
  };

  // Khóa cố định theme từ card ngày
  const handleLockTheme = (themeKey: string, themeName: string) => {
    setSelectedTheme(themeKey);
    setMode("fixed");
    showToast("success", `Đã cố định theme "${themeName}". Hãy bấm "Lưu Cấu Hình" để áp dụng!`);
  };

  // Theme của ngày click và theme ngày thường hiện hành
  const activeCellTheme = selectedDayCell?.holidayTheme
    ? themesList.find((t) => t.id === selectedDayCell.holidayTheme?.themeKey) || null
    : null;

  const dayResolution = selectedDayCell
    ? resolveScheduledThemeForDate(schedule, selectedDayCell.solarDay, selectedDayCell.solarMonth, selectedDayCell.solarYear)
    : { themeKey: schedule.defaultTheme || "modern", ruleType: "fixed_default" as const, label: "Theme Ngày Thường" };

  const cellDailyThemeMeta = themesList.find((t) => t.id === dayResolution.themeKey) || themesList[0];
  const cellDailyThemeType = dayResolution.ruleType === "season" ? "season" : "fixed_default";

  const filteredThemes = activeSeason === "all"
    ? themesList
    : themesList.filter((t) => t.season === activeSeason);

  const filteredRules = schedule.holidayRules.filter((rule) => {
    if (ruleCalendarFilter === "lunar" && rule.calendarType !== "lunar") return false;
    if (ruleCalendarFilter === "solar" && rule.calendarType !== "solar") return false;
    if (ruleCalendarFilter === "enabled" && !rule.enabled) return false;
    if (ruleSearch.trim()) {
      const query = ruleSearch.toLowerCase().trim();
      const themeMeta = themesList.find((t) => t.id === rule.theme);
      const matchName = themeMeta?.name.toLowerCase().includes(query) || false;
      const matchId = rule.id.toLowerCase().includes(query) || rule.theme.toLowerCase().includes(query);
      return matchName || matchId;
    }
    return true;
  });

  return (
    <div className="h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] flex flex-col p-4 space-y-3 text-slate-100 overflow-hidden">
      {/* 1. Header Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-900/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              Cấu Hình Theme OTP
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60 uppercase">
                v2.0
              </span>
            </h1>
            <span className="hidden md:inline text-[11px] text-slate-400">
              • Quản trị giao diện ngày lễ & cỗ máy đổi theme cho otp.mavrykpremium.com
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchConfig}
            disabled={loading}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60 transition-all flex items-center gap-1 shadow-sm"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            <span className="hidden sm:inline">Tải Lại</span>
          </button>

          <a
            href="http://localhost:3005"
            target="_blank"
            rel="noreferrer"
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 transition-all flex items-center gap-1 shadow-sm"
          >
            <ExternalLink className="w-3 h-3 text-indigo-400" />
            <span className="hidden sm:inline">Cổng Live</span>
          </a>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 transition-all flex items-center gap-1.5 shadow-md shadow-cyan-900/40 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            <span>{saving ? "Lưu..." : "Lưu Cấu Hình"}</span>
          </button>
        </div>
      </div>

      {/* Toast Alert mini */}
      {toast && (
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border animate-in fade-in duration-200 shrink-0 ${
            toast.type === "success"
              ? "bg-emerald-950/90 text-emerald-300 border-emerald-500/40"
              : "bg-rose-950/90 text-rose-300 border-rose-500/40"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* 2. Top Control Toolbar */}
      <OtpThemeToolbar
        mode={mode}
        setMode={setMode}
        selectedTheme={selectedTheme}
        setSelectedTheme={setSelectedTheme}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        themesList={themesList}
        activeThemeMeta={activeThemeMeta}
        rulesCount={schedule.holidayRules.length}
        onThemeSelectToast={(themeName) =>
          showToast("success", `Đã chọn cố định theme "${themeName}". Bấm "Lưu Cấu Hình" để áp dụng!`)
        }
      />

      {/* 3. Main Content Area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "schedule" ? (
          /* TAB 3: LỊCH RULE */
          <div className="h-full overflow-y-auto pr-1 space-y-3.5">
            <DailySeasonThemeSection
              schedule={schedule}
              setSchedule={setSchedule}
              themesList={themesList}
            />
            <HolidayRulesTable
              schedule={schedule}
              setSchedule={setSchedule}
              themesList={themesList}
              filteredRules={filteredRules}
              ruleSearch={ruleSearch}
              setRuleSearch={setRuleSearch}
              ruleCalendarFilter={ruleCalendarFilter}
              setRuleCalendarFilter={setRuleCalendarFilter}
              onViewOnCalendar={handleViewRuleOnCalendar}
              showToast={showToast}
            />
          </div>
        ) : activeTab === "calendar" ? (
          /* TAB 1: BẢNG LỊCH ÂM DƯƠNG */
          <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden select-none">
            <CalendarGridSection
              calYear={calYear}
              calMonth={calMonth}
              monthCells={monthCells}
              selectedDayCell={selectedDayCell}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              onGoToday={handleGoToday}
              onCellMouseDown={handleCellMouseDown}
              onCellMouseEnter={handleCellMouseEnter}
              onCellMouseUp={handleCellMouseUp}
              isCellInRange={isCellInRange}
            />

            <div className="lg:col-span-4 h-full flex flex-col gap-2.5 overflow-hidden">
              {isConfiguringHoliday && selectedRange ? (
                <HolidayThemeConfigForm
                  selectedRange={selectedRange}
                  holidayForm={holidayForm}
                  setHolidayForm={setHolidayForm}
                  themesList={themesList}
                  onClose={() => {
                    setIsConfiguringHoliday(false);
                    setSelectedRange(null);
                  }}
                  onApply={applyHolidayFormRule}
                  onDelete={() => deleteCurrentHolidayRule()}
                />
              ) : selectedDayCell ? (
                <DayDetailsInspector
                  selectedDayCell={selectedDayCell}
                  activeCellTheme={activeCellTheme}
                  cellDailyThemeMeta={cellDailyThemeMeta}
                  cellDailyThemeType={cellDailyThemeType}
                  activeThemeMeta={activeThemeMeta}
                  onOpenConfig={() => openHolidayConfigForRange(selectedDayCell, selectedDayCell)}
                  onLockTheme={handleLockTheme}
                />
              ) : null}
            </div>
          </div>
        ) : (
          /* TAB 2: BỘ SƯU TẬP 28 THEMES */
          <ThemePresetsGrid
            themesList={themesList}
            filteredThemes={filteredThemes}
            selectedTheme={selectedTheme}
            activeSeason={activeSeason}
            setActiveSeason={setActiveSeason}
            mode={mode}
            onSelectTheme={handleSelectPresetTheme}
          />
        )}
      </div>
    </div>
  );
};

export default OtpThemeConfigPage;
