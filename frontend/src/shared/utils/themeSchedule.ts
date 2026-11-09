import { convertSolar2Lunar } from "./lunarCalendar";

export type ThemeCalendarType = "solar" | "lunar";
export type ThemeBackgroundMode = "fixed_default" | "seasonal_4seasons";

export interface ThemeDateRule {
  id: string;
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

export interface ThemeScheduleConfig {
  backgroundMode?: ThemeBackgroundMode;
  defaultTheme: string;
  seasonRules: SeasonThemeRule[];
  holidayRules: ThemeDateRule[];
}

const holidayRule = (id: string, calendarType: ThemeCalendarType, startMonth: number, startDay: number, endMonth: number, endDay: number, theme = id): ThemeDateRule => ({ id, calendarType, startMonth, startDay, endMonth, endDay, theme, enabled: true });

export const DEFAULT_THEME_SCHEDULE: ThemeScheduleConfig = {
  backgroundMode: "seasonal_4seasons",
  defaultTheme: "modern",
  seasonRules: [
    { id: "spring", startMonth: 1, endMonth: 3, theme: "season-spring" },
    { id: "summer", startMonth: 4, endMonth: 6, theme: "season-summer" },
    { id: "autumn", startMonth: 7, endMonth: 9, theme: "season-autumn" },
    { id: "winter", startMonth: 10, endMonth: 12, theme: "season-winter" },
  ],
  holidayRules: [
    holidayRule("tet", "lunar", 12, 29, 1, 4), holidayRule("ong-tao", "lunar", 12, 23, 12, 23), holidayRule("nguyen-tieu", "lunar", 1, 15, 1, 15), holidayRule("han-thuc", "lunar", 3, 3, 3, 3), holidayRule("gio-to", "lunar", 3, 10, 3, 10), holidayRule("phat-dan", "lunar", 4, 15, 4, 15), holidayRule("doan-ngo", "lunar", 5, 5, 5, 5), holidayRule("that-tich", "lunar", 7, 7, 7, 7), holidayRule("vu-lan", "lunar", 7, 15, 7, 15), holidayRule("trung-thu", "lunar", 8, 14, 8, 15),
    holidayRule("tet-duong-lich", "solar", 1, 1, 1, 1), holidayRule("valentine", "solar", 2, 14, 2, 14), holidayRule("quoc-te-phu-nu", "solar", 3, 8, 3, 8), holidayRule("thong-nhat", "solar", 4, 30, 4, 30), holidayRule("lao-dong", "solar", 5, 1, 5, 1), holidayRule("thieu-nhi", "solar", 6, 1, 6, 1), holidayRule("gia-dinh", "solar", 6, 28, 6, 28), holidayRule("quoc-khanh", "solar", 9, 2, 9, 2), holidayRule("phu-nu-vn", "solar", 10, 20, 10, 20), holidayRule("halloween", "solar", 10, 31, 10, 31), holidayRule("nha-giao", "solar", 11, 20, 11, 20), holidayRule("qdnd-vn", "solar", 12, 22, 12, 22), holidayRule("giang-sinh", "solar", 12, 24, 12, 25),
  ],
};

export function normalizeThemeSchedule(value: Partial<ThemeScheduleConfig> | null | undefined): ThemeScheduleConfig {
  return {
    backgroundMode: value?.backgroundMode === "fixed_default" ? "fixed_default" : "seasonal_4seasons",
    defaultTheme: value?.defaultTheme || DEFAULT_THEME_SCHEDULE.defaultTheme,
    seasonRules: Array.isArray(value?.seasonRules) && value.seasonRules.length > 0 ? value.seasonRules : DEFAULT_THEME_SCHEDULE.seasonRules,
    holidayRules: Array.isArray(value?.holidayRules) && value.holidayRules.length > 0 ? value.holidayRules : DEFAULT_THEME_SCHEDULE.holidayRules,
  };
}

function isInRecurringRange(month: number, day: number, rule: ThemeDateRule): boolean {
  const value = month * 32 + day;
  const start = rule.startMonth * 32 + rule.startDay;
  const end = rule.endMonth * 32 + rule.endDay;
  return start <= end ? value >= start && value <= end : value >= start || value <= end;
}

export function getHolidayRuleForDate(schedule: ThemeScheduleConfig, solarDay: number, solarMonth: number, solarYear: number): ThemeDateRule | null {
  const lunar = convertSolar2Lunar(solarDay, solarMonth, solarYear);
  return schedule.holidayRules.find((rule) => {
    if (!rule.enabled) return false;
    const month = rule.calendarType === "lunar" ? lunar.month : solarMonth;
    const day = rule.calendarType === "lunar" ? lunar.day : solarDay;
    return isInRecurringRange(month, day, rule);
  }) || null;
}

export function getSeasonThemeForMonth(schedule: ThemeScheduleConfig, month: number): string | null {
  const rule = schedule.seasonRules.find((item) => item.startMonth <= item.endMonth ? month >= item.startMonth && month <= item.endMonth : month >= item.startMonth || month <= item.endMonth);
  return rule?.theme || null;
}

export function resolveScheduledThemeForDate(
  schedule: ThemeScheduleConfig,
  solarDay: number,
  solarMonth: number,
  solarYear: number
): { themeKey: string; ruleType: "holiday" | "season" | "fixed_default"; label: string } {
  const holiday = getHolidayRuleForDate(schedule, solarDay, solarMonth, solarYear);
  if (holiday) {
    return { themeKey: holiday.theme, ruleType: "holiday", label: "Theme Lễ Ưu Tiên" };
  }
  if (schedule.backgroundMode === "seasonal_4seasons") {
    const seasonTheme = getSeasonThemeForMonth(schedule, solarMonth);
    if (seasonTheme) {
      return { themeKey: seasonTheme, ruleType: "season", label: "Theme Theo Mùa Anime" };
    }
  }
  return {
    themeKey: schedule.defaultTheme || "modern",
    ruleType: "fixed_default",
    label: "Theme Ngày Thường Cố Định",
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