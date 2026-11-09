import { CalendarCell } from "../../shared/utils/lunarCalendar";
import { ThemeCalendarType } from "../../shared/utils/themeSchedule";

export type SeasonFilter = "all" | "spring" | "summer" | "autumn" | "winter" | "modern";
export type ViewTab = "calendar" | "presets" | "schedule";
export type RuleCalendarFilter = "all" | "lunar" | "solar" | "enabled";

export interface ThemeItem {
  id: string;
  season: SeasonFilter;
  name: string;
  icon: string;
  badge: string;
  title: string;
  subtitle: string;
  accent: string;
}

export interface RangeSelection {
  start: CalendarCell;
  end: CalendarCell;
}

export interface HolidayFormState {
  id?: string;
  theme: string;
  calendarType: ThemeCalendarType;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  holidayName: string;
  enabled: boolean;
}

