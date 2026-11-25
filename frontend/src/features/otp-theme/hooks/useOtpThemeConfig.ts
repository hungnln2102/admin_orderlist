import { useCallback, useEffect, useMemo, useState } from "react";
import { useNotification } from "@/shared/context/NotificationContext";
import { ThemeItem } from "../types";
import { THEMES_LIST } from "../constants/themesList";
import {
  DEFAULT_THEME_SCHEDULE,
  normalizeThemeSchedule,
  resolveScheduledThemeForDate,
  ThemeScheduleConfig,
} from "../../../shared/utils/themeSchedule";
import {
  fetchRemoteThemesCatalog,
  fetchSystemConfigs,
  saveSystemThemeConfig,
} from "../api/otpThemeApi";

export function useOtpThemeConfig() {
  const notify = useNotification();
  const [themesList, setThemesList] = useState<ThemeItem[]>(THEMES_LIST);
  const [schedule, setSchedule] = useState<ThemeScheduleConfig>(DEFAULT_THEME_SCHEDULE);
  const [savedSnapshot, setSavedSnapshot] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRemoteThemesCatalog().then((themes) => {
      if (themes) setThemesList(themes);
    });
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const configs = await fetchSystemConfigs();
      const themeConfig = configs.find((c) => c.config_key === "OTP_PORTAL_THEME");

      let nextSchedule = DEFAULT_THEME_SCHEDULE;
      if (themeConfig?.config_value) {
        const parsed =
          typeof themeConfig.config_value === "string"
            ? JSON.parse(themeConfig.config_value)
            : themeConfig.config_value;
        nextSchedule = normalizeThemeSchedule(
          parsed.schedule || parsed,
          parsed.mode,
          parsed.theme
        );
      }

      setSchedule(nextSchedule);
      setSavedSnapshot(JSON.stringify(nextSchedule));
    } catch (err: any) {
      notify.error(err?.message || "Không thể tải cấu hình theme.", "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    void fetchConfig();
  }, [fetchConfig]);

  const isDirty = useMemo(() => {
    if (!savedSnapshot) return false;
    return JSON.stringify(schedule) !== savedSnapshot;
  }, [schedule, savedSnapshot]);

  const handleSave = useCallback(
    async (overrideSchedule?: ThemeScheduleConfig) => {
      const target = overrideSchedule || schedule;
      if (
        target.backgroundMode === "cycle_loop" &&
        (!target.cycleConfig.themes || target.cycleConfig.themes.length === 0)
      ) {
        notify.warning(
          "Vui lòng tick chọn ít nhất 1 theme trong danh sách xoay vòng trước khi lưu.",
          "Chưa chọn theme"
        );
        return;
      }

      try {
        setSaving(true);
        await saveSystemThemeConfig(target);
        setSavedSnapshot(JSON.stringify(target));
        notify.success("Đã lưu cấu hình Theme Website thành công!", "Đã lưu");
      } catch (err: any) {
        notify.error(err?.message || "Không thể lưu cấu hình theme.", "Lỗi lưu cấu hình");
      } finally {
        setSaving(false);
      }
    },
    [schedule, notify]
  );

  const todayActiveTheme = useMemo(() => {
    const now = new Date();
    const resolved = resolveScheduledThemeForDate(
      schedule,
      now.getDate(),
      now.getMonth() + 1,
      now.getFullYear()
    );
    const meta = themesList.find((t) => t.id === resolved.themeKey) || themesList[0];
    return {
      theme: meta,
      ruleType: resolved.ruleType,
      sourceLabel: resolved.label,
    };
  }, [schedule, themesList]);

  return {
    themesList,
    schedule,
    setSchedule,
    loading,
    saving,
    isDirty,
    todayActiveTheme,
    fetchConfig,
    handleSave,
  };
}
