import { convertSolar2Lunar } from "./lunarCalendar";

export type ThemeCalendarType = "solar" | "lunar";
export type ThemeBackgroundMode = "fixed_default" | "seasonal_4seasons" | "cycle_loop";

export interface ThemeDateRule {
  id: string;
  name?: string;
  calendarType: ThemeCalendarType;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  theme: string;
  enabled: boolean;
}

export interface SeasonThemeRule {
  id: string;
  startMonth: number;
  endMonth: number;
  theme: string;
}

export interface ThemeCycleConfig {
  themes: string[];
  intervalDays: number;
  startDate: string; // YYYY-MM-DD
}

export interface ThemeScheduleConfig {
  backgroundMode: ThemeBackgroundMode;
  respectHolidays: boolean;
  defaultTheme: string;
  cycleConfig: ThemeCycleConfig;
  seasonRules: SeasonThemeRule[];
  holidayRules: ThemeDateRule[];
}

const holidayRule = (
  id: string,
  calendarType: ThemeCalendarType,
  startMonth: number,
  startDay: number,
  endMonth: number,
  endDay: number,
  theme = id
): ThemeDateRule => ({
  id,
  calendarType,
  startMonth,
  startDay,
  endMonth,
  endDay,
  theme,
  enabled: true,
});

export const DEFAULT_CYCLE_CONFIG: ThemeCycleConfig = {
  themes: ["season-spring", "season-summer", "season-autumn", "season-winter"],
  intervalDays: 91,
  startDate: "2026-01-01",
};

export const DEFAULT_THEME_SCHEDULE: ThemeScheduleConfig = {
  backgroundMode: "seasonal_4seasons",
  respectHolidays: true,
  defaultTheme: "modern",
  cycleConfig: { ...DEFAULT_CYCLE_CONFIG, themes: [...DEFAULT_CYCLE_CONFIG.themes] },
  seasonRules: [
    { id: "spring", startMonth: 1, endMonth: 3, theme: "season-spring" },
    { id: "summer", startMonth: 4, endMonth: 6, theme: "season-summer" },
    { id: "autumn", startMonth: 7, endMonth: 9, theme: "season-autumn" },
    { id: "winter", startMonth: 10, endMonth: 12, theme: "season-winter" },
  ],
  holidayRules: [
    holidayRule("tet", "lunar", 12, 29, 1, 4),
    holidayRule("ong-tao", "lunar", 12, 23, 12, 23),
    holidayRule("nguyen-tieu", "lunar", 1, 15, 1, 15),
    holidayRule("han-thuc", "lunar", 3, 3, 3, 3),
    holidayRule("gio-to", "lunar", 3, 10, 3, 10),
    holidayRule("phat-dan", "lunar", 4, 15, 4, 15),
    holidayRule("doan-ngo", "lunar", 5, 5, 5, 5),
    holidayRule("that-tich", "lunar", 7, 7, 7, 7),
    holidayRule("vu-lan", "lunar", 7, 15, 7, 15),
    holidayRule("trung-thu", "lunar", 8, 14, 8, 15),
    holidayRule("tet-duong-lich", "solar", 1, 1, 1, 1),
    holidayRule("valentine", "solar", 2, 14, 2, 14),
    holidayRule("quoc-te-phu-nu", "solar", 3, 8, 3, 8),
    holidayRule("thong-nhat", "solar", 4, 30, 4, 30),
    holidayRule("lao-dong", "solar", 5, 1, 5, 1),
    holidayRule("thieu-nhi", "solar", 6, 1, 6, 1),
    holidayRule("gia-dinh", "solar", 6, 28, 6, 28),
    holidayRule("quoc-khanh", "solar", 9, 2, 9, 2),
    holidayRule("phu-nu-vn", "solar", 10, 20, 10, 20),
    holidayRule("halloween", "solar", 10, 31, 10, 31),
    holidayRule("nha-giao", "solar", 11, 20, 11, 20),
    holidayRule("qdnd-vn", "solar", 12, 22, 12, 22),
    holidayRule("giang-sinh", "solar", 12, 24, 12, 25),
  ],
};

function normalizeCycleConfig(raw?: Partial<ThemeCycleConfig> | null): ThemeCycleConfig {
  const themes =
    Array.isArray(raw?.themes) && raw.themes.length > 0
      ? raw.themes.filter((t): t is string => typeof t === "string" && t.trim().length > 0)
      : [...DEFAULT_CYCLE_CONFIG.themes];
  const intervalDays =
    typeof raw?.intervalDays === "number" && Number.isFinite(raw.intervalDays) && raw.intervalDays >= 1
      ? Math.min(366, Math.trunc(raw.intervalDays))
      : DEFAULT_CYCLE_CONFIG.intervalDays;
  const startDate =
    typeof raw?.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.startDate)
      ? raw.startDate
      : DEFAULT_CYCLE_CONFIG.startDate;
  return {
    themes: themes.length > 0 ? themes : [...DEFAULT_CYCLE_CONFIG.themes],
    intervalDays,
    startDate,
  };
}

export function normalizeThemeSchedule(
  value: Partial<ThemeScheduleConfig> | null | undefined,
  legacyMode?: "auto" | "fixed",
  legacyTheme?: string | null
): ThemeScheduleConfig {
  const hasExplicitBackgroundMode =
    value?.backgroundMode === "fixed_default" ||
    value?.backgroundMode === "seasonal_4seasons" ||
    value?.backgroundMode === "cycle_loop";

  // Tương thích ngược cấu hình cũ mode="fixed" chưa có respectHolidays/backgroundMode
  if (legacyMode === "fixed" && !hasExplicitBackgroundMode && value?.respectHolidays === undefined) {
    return {
      backgroundMode: "fixed_default",
      respectHolidays: false,
      defaultTheme: legacyTheme || value?.defaultTheme || DEFAULT_THEME_SCHEDULE.defaultTheme,
      cycleConfig: normalizeCycleConfig(value?.cycleConfig),
      seasonRules:
        Array.isArray(value?.seasonRules) && value.seasonRules.length > 0
          ? value.seasonRules
          : DEFAULT_THEME_SCHEDULE.seasonRules,
      holidayRules:
        Array.isArray(value?.holidayRules)
          ? value.holidayRules
          : DEFAULT_THEME_SCHEDULE.holidayRules,
    };
  }

  return {
    backgroundMode: hasExplicitBackgroundMode ? value!.backgroundMode! : "seasonal_4seasons",
    respectHolidays: typeof value?.respectHolidays === "boolean" ? value.respectHolidays : true,
    defaultTheme: value?.defaultTheme || legacyTheme || DEFAULT_THEME_SCHEDULE.defaultTheme,
    cycleConfig: normalizeCycleConfig(value?.cycleConfig),
    seasonRules:
      Array.isArray(value?.seasonRules) && value.seasonRules.length > 0
        ? value.seasonRules
        : DEFAULT_THEME_SCHEDULE.seasonRules,
    holidayRules: Array.isArray(value?.holidayRules)
      ? value.holidayRules
      : DEFAULT_THEME_SCHEDULE.holidayRules,
  };
}

function isInRecurringRange(month: number, day: number, rule: ThemeDateRule): boolean {
  const value = month * 32 + day;
  const start = rule.startMonth * 32 + rule.startDay;
  const end = rule.endMonth * 32 + rule.endDay;
  return start <= end ? value >= start && value <= end : value >= start || value <= end;
}

export function getHolidayRuleForDate(
  schedule: ThemeScheduleConfig,
  solarDay: number,
  solarMonth: number,
  solarYear: number
): ThemeDateRule | null {
  const lunar = convertSolar2Lunar(solarDay, solarMonth, solarYear);
  return (
    schedule.holidayRules.find((rule) => {
      if (!rule.enabled) return false;
      const month = rule.calendarType === "lunar" ? lunar.month : solarMonth;
      const day = rule.calendarType === "lunar" ? lunar.day : solarDay;
      return isInRecurringRange(month, day, rule);
    }) || null
  );
}

export function getSeasonThemeForMonth(schedule: ThemeScheduleConfig, month: number): string | null {
  const rule = schedule.seasonRules.find((item) =>
    item.startMonth <= item.endMonth
      ? month >= item.startMonth && month <= item.endMonth
      : month >= item.startMonth || month <= item.endMonth
  );
  return rule?.theme || null;
}

export function getCycleThemeForDate(
  cycleConfig: ThemeCycleConfig,
  solarDay: number,
  solarMonth: number,
  solarYear: number
): { themeKey: string; stepIndex: number; totalSteps: number } | null {
  const themes = cycleConfig?.themes;
  if (!Array.isArray(themes) || themes.length === 0) return null;

  const intervalDays = Math.max(1, Math.trunc(cycleConfig.intervalDays || 1));
  const [sy, sm, sd] = (cycleConfig.startDate || "2026-01-01").split("-").map(Number);
  const startUtc = Date.UTC(sy || 2026, (sm || 1) - 1, sd || 1);
  const targetUtc = Date.UTC(solarYear, solarMonth - 1, solarDay);
  const diffDays = Math.floor((targetUtc - startUtc) / 86_400_000);
  const slot = Math.floor(diffDays / intervalDays);
  const stepIndex = ((slot % themes.length) + themes.length) % themes.length;

  return {
    themeKey: themes[stepIndex],
    stepIndex,
    totalSteps: themes.length,
  };
}

export function resolveScheduledThemeForDate(
  schedule: ThemeScheduleConfig,
  solarDay: number,
  solarMonth: number,
  solarYear: number
): {
  themeKey: string;
  ruleType: "holiday" | "cycle" | "season" | "fixed_default";
  label: string;
} {
  if (schedule.respectHolidays !== false) {
    const holiday = getHolidayRuleForDate(schedule, solarDay, solarMonth, solarYear);
    if (holiday) {
      return {
        themeKey: holiday.theme,
        ruleType: "holiday",
        label: holiday.name ? `Lịch: ${holiday.name}` : "Dải ngày trên Lịch",
      };
    }
  }

  if (schedule.backgroundMode === "cycle_loop") {
    const cycle = getCycleThemeForDate(schedule.cycleConfig, solarDay, solarMonth, solarYear);
    if (cycle) {
      return {
        themeKey: cycle.themeKey,
        ruleType: "cycle",
        label: `Chu kỳ ${cycle.stepIndex + 1}/${cycle.totalSteps} (${schedule.cycleConfig.intervalDays} ngày/lượt)`,
      };
    }
  }

  if (schedule.backgroundMode === "seasonal_4seasons") {
    const seasonTheme = getSeasonThemeForMonth(schedule, solarMonth);
    if (seasonTheme) {
      return {
        themeKey: seasonTheme,
        ruleType: "season",
        label: "Cố định theo 4 mùa",
      };
    }
  }

  return {
    themeKey: schedule.defaultTheme || "modern",
    ruleType: "fixed_default",
    label: "Cố định cả năm",
  };
}

export function findNextRuleDate(rule: ThemeDateRule, fromDate = new Date()): Date | null {
  const start = new Date(Date.UTC(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate()));
  for (let offset = 0; offset <= 740; offset += 1) {
    const candidate = new Date(start);
    candidate.setUTCDate(start.getUTCDate() + offset);
    const day = candidate.getUTCDate();
    const month = candidate.getUTCMonth() + 1;
    const lunar = convertSolar2Lunar(day, month, candidate.getUTCFullYear());
    const ruleMonth = rule.calendarType === "lunar" ? lunar.month : month;
    const ruleDay = rule.calendarType === "lunar" ? lunar.day : day;
    if (rule.enabled && isInRecurringRange(ruleMonth, ruleDay, rule)) return candidate;
  }
  return null;
}
