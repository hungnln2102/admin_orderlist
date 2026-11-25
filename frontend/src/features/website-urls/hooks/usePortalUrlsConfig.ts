import { useCallback, useEffect, useState } from "react";
import { useNotification } from "@/shared/context/NotificationContext";
import {
  fetchPortalUrlsConfig,
  resetPortalUrlsConfig,
  savePortalUrlsConfig,
} from "../api/portalUrlsApi";
import type { PortalRouteKey, PortalUrlsConfig } from "../types";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED_SLUGS = new Set([
  "assets",
  "scripts",
  "seasonal",
  "api",
  "index",
  "index.html",
  "favicon",
  "favicon.ico",
  "robots.txt",
]);

export function normalizeSlugInput(value: string): string {
  return value.toLowerCase().replace(/^\/+/, "").replace(/\s+/g, "-");
}

export function usePortalUrlsConfig() {
  const notify = useNotification();
  const [config, setConfig] = useState<PortalUrlsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchPortalUrlsConfig();
      setConfig(res.config);
    } catch (err: any) {
      notify.error(err?.message || "Không thể tải cấu hình URL.", "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const validateRowSlug = useCallback(
    (key: PortalRouteKey, rawSlug: string): string | null => {
      const slug = rawSlug.trim().replace(/^\/+|\/+$/g, "");
      if (!slug) return "Slug không được để trống.";
      if (slug.length > 64) return "Slug tối đa 64 ký tự.";
      if (!SLUG_PATTERN.test(slug)) {
        return "Chỉ dùng chữ thường (a-z), số (0-9) và dấu gạch ngang (-).";
      }
      if (RESERVED_SLUGS.has(slug)) {
        return `Slug "${slug}" trùng đường dẫn hệ thống.`;
      }
      if (config) {
        const duplicate = Object.values(config.routes).find(
          (item) => item.key !== key && item.slug === slug
        );
        if (duplicate) {
          return `Slug "/${slug}" bị trùng với "${duplicate.label}".`;
        }
      }
      return null;
    },
    [config]
  );

  const saveRow = useCallback(
    async (
      key: PortalRouteKey,
      rawSlug: string,
      setAsDefault: boolean
    ): Promise<boolean> => {
      if (!config) return false;
      const cleanSlug = rawSlug.trim().replace(/^\/+|\/+$/g, "");
      const err = validateRowSlug(key, cleanSlug);
      if (err) {
        notify.error(err, "Đường dẫn không hợp lệ");
        return false;
      }

      setSaving(true);
      try {
        const routesPayload: Record<string, { slug: string }> = {};
        for (const [routeKey, item] of Object.entries(config.routes)) {
          routesPayload[routeKey] = {
            slug: routeKey === key ? cleanSlug : item.slug,
          };
        }

        const updated = await savePortalUrlsConfig({
          defaultRouteKey: setAsDefault ? key : config.defaultRouteKey,
          routes: routesPayload,
        });
        setConfig(updated);
        notify.success("Đã cập nhật URL thành công!", "Đã lưu");
        return true;
      } catch (error: any) {
        notify.error(error?.message || "Lưu URL thất bại.", "Lỗi lưu cấu hình");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [config, notify, validateRowSlug]
  );

  const handleResetDefaults = useCallback(() => {
    notify.confirm({
      title: "Khôi phục URL mặc định",
      message:
        "Toàn bộ 8 đường dẫn và trang mặc định sẽ được đưa về giá trị ban đầu. Bạn có chắc chắn muốn thực hiện?",
      confirmText: "Khôi phục mặc định",
      danger: true,
      onConfirm: async () => {
        setSaving(true);
        try {
          const updated = await resetPortalUrlsConfig();
          setConfig(updated);
          notify.success("Đã khôi phục toàn bộ URL về mặc định.", "Hoàn tất");
        } catch (err: any) {
          notify.error(err?.message || "Không thể khôi phục mặc định.", "Lỗi");
        } finally {
          setSaving(false);
        }
      },
    });
  }, [notify]);

  return {
    config,
    loading,
    saving,
    loadConfig,
    validateRowSlug,
    saveRow,
    handleResetDefaults,
  };
}
