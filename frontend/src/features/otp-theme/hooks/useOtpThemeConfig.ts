import { useState, useEffect } from "react";
import { ThemeItem } from "../types";
import { THEMES_LIST } from "../constants/themesList";
import { DEFAULT_THEME_SCHEDULE, normalizeThemeSchedule, ThemeScheduleConfig } from "../../../shared/utils/themeSchedule";
import { fetchRemoteThemesCatalog, fetchSystemConfigs, saveSystemThemeConfig } from "../api/otpThemeApi";

export function useOtpThemeConfig() {
  const [themesList, setThemesList] = useState<ThemeItem[]>(THEMES_LIST);
  const [mode, setMode] = useState<"auto" | "fixed">("auto");
  const [selectedTheme, setSelectedTheme] = useState<string>("modern");
  const [schedule, setSchedule] = useState<ThemeScheduleConfig>(DEFAULT_THEME_SCHEDULE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string, duration = 3500) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), duration);
  };

  // Đồng bộ catalog themes từ backend
  useEffect(() => {
    fetchRemoteThemesCatalog().then((themes) => {
      if (themes) setThemesList(themes);
    });
  }, []);

  // Tải cấu hình từ database
  const fetchConfig = async () => {
    try {
      setLoading(true);
      const configs = await fetchSystemConfigs();
      const themeConfig = configs.find((c) => c.config_key === "OTP_PORTAL_THEME");
      if (themeConfig?.config_value) {
        const parsed = typeof themeConfig.config_value === "string"
          ? JSON.parse(themeConfig.config_value)
          : themeConfig.config_value;
        if (parsed.mode) setMode(parsed.mode);
        if (parsed.theme) setSelectedTheme(parsed.theme);
        if (parsed.schedule || parsed.holidayRules || parsed.defaultTheme) {
          setSchedule(normalizeThemeSchedule(parsed.schedule || parsed));
        }
      }
    } catch (err: any) {
      console.error("[useOtpThemeConfig] Lỗi tải cấu hình theme:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  // Lưu cấu hình toàn diện
  const handleSave = async (overrideSchedule?: ThemeScheduleConfig) => {
    try {
      setSaving(true);
      const targetSchedule = overrideSchedule || schedule;
      await saveSystemThemeConfig({
        mode,
        theme: mode === "fixed" ? selectedTheme : null,
        schedule: targetSchedule,
      });
      showToast("success", "Đã lưu toàn bộ cấu hình Theme OTP lên hệ thống thành công!");
    } catch (err: any) {
      showToast("error", err.message || "Lỗi lưu cấu hình");
    } finally {
      setSaving(false);
    }
  };

  const activeThemeMeta = themesList.find((t) => t.id === selectedTheme) || themesList[0] || THEMES_LIST[0];

  return {
    themesList,
    setThemesList,
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
  };
}

