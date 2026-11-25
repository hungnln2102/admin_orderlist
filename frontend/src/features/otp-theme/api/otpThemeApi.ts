import { ThemeItem } from "../types";
import { ThemeScheduleConfig } from "../../../shared/utils/themeSchedule";

export interface RemoteThemeCatalogResponse {
  success: boolean;
  themes: ThemeItem[];
}

export interface SystemConfigItem {
  id?: string;
  config_key: string;
  config_value: string;
  data_type: string;
  group_name: string;
  description: string;
}

export async function fetchRemoteThemesCatalog(): Promise<ThemeItem[] | null> {
  try {
    const res = await fetch("/api/public/themes");
    if (!res.ok) return null;
    const data: RemoteThemeCatalogResponse = await res.json();
    if (data?.themes && Array.isArray(data.themes) && data.themes.length > 0) {
      return data.themes;
    }
    return null;
  } catch (err) {
    console.warn("[otpThemeApi] Dùng danh mục themes fallback nội bộ:", err);
    return null;
  }
}

export async function fetchSystemConfigs(): Promise<SystemConfigItem[]> {
  const res = await fetch("/api/system/configs");
  if (!res.ok) {
    throw new Error("Không thể tải cấu hình hệ thống");
  }
  return res.json();
}

export async function saveSystemThemeConfig(schedule: ThemeScheduleConfig): Promise<void> {
  const isStrictSingleFixed =
    schedule.backgroundMode === "fixed_default" && !schedule.respectHolidays;

  const payloadValue = JSON.stringify({
    mode: isStrictSingleFixed ? "fixed" : "auto",
    theme: isStrictSingleFixed ? schedule.defaultTheme : null,
    schedule,
    backgroundMode: schedule.backgroundMode,
    respectHolidays: schedule.respectHolidays,
    defaultTheme: schedule.defaultTheme,
    cycleConfig: schedule.cycleConfig,
    seasonRules: schedule.seasonRules,
    holidayRules: schedule.holidayRules,
  });

  const res = await fetch("/api/system/configs/OTP_PORTAL_THEME", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: payloadValue }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Không thể lưu cấu hình OTP Portal Theme");
  }
}
