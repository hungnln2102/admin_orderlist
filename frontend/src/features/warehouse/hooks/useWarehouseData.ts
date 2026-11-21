import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNotification } from "@/shared/context/NotificationContext";
import { fetchCachedJson, invalidateApiCache } from "@/shared/api/apiCache";
import {
  WarehouseAccountItem,
  WarehouseServiceSlot,
  WarehouseSlotEditFormData,
  ServiceNameCategoryItem,
  SystemProduct,
  WarehouseAccountFormData,
  WarehouseAddServiceFormData,
  CatalogFormData,
} from "../types";

export const INITIAL_ACCOUNT_FORM: WarehouseAccountFormData = {
  account: "",
  serviceName: "",
  category: "",
  variantTag: "",
  password: "",
  backupEmail: "",
  twoFa: "",
  providerKey: "",
  otpEnabled: false,
  statusCheckEnabled: false,
  expiresAt: "",
  note: "",
  createPackage: false,
  hasLinkedAccount: false,
  linkedAccountRole: "storage",
  linkedAccountId: null,
  storageTotal: "",
};

export const INITIAL_CATALOG_FORM: CatalogFormData = {
  name: "",
  category: "",
  productId: null,
  loginUrl: "",
};

/**
 * useWarehouseData — Hook quản lý dữ liệu, bộ lọc, thống kê và các thao tác CRUD của Kho Hàng.
 * Tách khỏi WarehousePage để giữ Page Orchestrator mỏng gọn (FE-09, FE-10).
 */
export function useWarehouseData() {
  const notification = useNotification();

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedAccountIds, setExpandedAccountIds] = useState<number[]>([]);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<number, boolean>>({});
  const [copiedKeyMap, setCopiedKeyMap] = useState<Record<string, boolean>>({});
  const [loggedSlotsMap, setLoggedSlotsMap] = useState<Record<number, boolean>>({});
  const [openingSlotId, setOpeningSlotId] = useState<number | null>(null);

  const [accounts, setAccounts] = useState<WarehouseAccountItem[]>([]);
  const [catalog, setCatalog] = useState<ServiceNameCategoryItem[]>([]);
  const [systemProducts, setSystemProducts] = useState<SystemProduct[]>([]);
  const [loading, setLoading] = useState(false);

  const systemProductsLoadedRef = useRef(false);

  // Lazy-fetch /api/warehouse/system-products chỉ khi cần (mở tab Danh mục hoặc mở modal liên quan)
  const ensureSystemProducts = useCallback(async (forceRefresh = false) => {
    if (systemProductsLoadedRef.current && !forceRefresh) return;
    try {
      const result = await fetchCachedJson<SystemProduct[]>("/api/warehouse/system-products", {
        ttlMs: 5 * 60 * 1000,
        staleWhileRevalidateMs: 5 * 60 * 1000,
      });
      setSystemProducts(Array.isArray(result.data) ? result.data : []);
      systemProductsLoadedRef.current = true;
      void result.revalidate
        ?.then((data) => setSystemProducts(Array.isArray(data) ? data : []))
        .catch(() => undefined);
    } catch (err) {
      console.error("Error loading system products:", err);
    }
  }, []);

  const loadWarehouseData = useCallback(async () => {
    setLoading(true);
    try {
      const [accRes, catalogResult] = await Promise.all([
        fetch("/api/warehouse", { credentials: "include" }),
        fetchCachedJson<ServiceNameCategoryItem[]>("/api/warehouse/catalog", {
          ttlMs: 5 * 60 * 1000,
          staleWhileRevalidateMs: 5 * 60 * 1000,
        }),
      ]);

      if (!accRes.ok) throw new Error("Không thể tải danh sách kho.");
      const accData: WarehouseAccountItem[] = await accRes.json();
      const nextAccounts = Array.isArray(accData) ? accData : [];
      setAccounts(nextAccounts);
      setLoggedSlotsMap(
        Object.fromEntries(
          nextAccounts.flatMap((account) =>
            account.services.map((service) => [service.id, service.is_authenticated === true])
          )
        )
      );
      setCatalog(Array.isArray(catalogResult.data) ? catalogResult.data : []);

      void catalogResult.revalidate
        ?.then((data) => setCatalog(Array.isArray(data) ? data : []))
        .catch(() => undefined);

      if (systemProductsLoadedRef.current) {
        void ensureSystemProducts(true);
      }
    } catch (err) {
      console.error("Error loading warehouse data:", err);
      notification.error("Không thể kết nối đến cơ sở dữ liệu kho hàng.");
    } finally {
      setLoading(false);
    }
  }, [notification, ensureSystemProducts]);

  useEffect(() => {
    void loadWarehouseData();
  }, [loadWarehouseData]);

  const invalidateAndReload = useCallback(async () => {
    invalidateApiCache(["/api/warehouse/catalog", "/api/warehouse/system-products"]);
    await loadWarehouseData();
  }, [loadWarehouseData]);

  const toggleExpand = useCallback((id: number) => {
    const numericId = Number(id);
    setExpandedAccountIds((prev) =>
      prev.map(Number).includes(numericId)
        ? prev.filter((i) => Number(i) !== numericId)
        : [...prev, numericId]
    );
  }, []);

  const toggleShowPassword = useCallback((serviceId: number) => {
    setShowPasswordMap((prev) => ({ ...prev, [serviceId]: !prev[serviceId] }));
  }, []);

  const copyToClipboard = useCallback(
    (text: string, label: string, keyId: string) => {
      navigator.clipboard.writeText(text);
      setCopiedKeyMap((prev) => ({ ...prev, [keyId]: true }));
      notification.success(`Đã sao chép ${label} vào bộ nhớ tạm!`, "Sao chép thành công");
      setTimeout(() => {
        setCopiedKeyMap((prev) => ({ ...prev, [keyId]: false }));
      }, 2000);
    },
    [notification]
  );

  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const matchSearch =
        searchTerm === "" ||
        acc.account.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.services.some(
          (s) =>
            s.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.note && s.note.toLowerCase().includes(searchTerm.toLowerCase()))
        );

      const matchCategory =
        categoryFilter === "all" ||
        acc.services.some((s) => s.category === categoryFilter || s.display_name === categoryFilter);

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "AVAILABLE" && acc.services.some((s) => s.status === "AVAILABLE")) ||
        (statusFilter === "EXPIRED" &&
          acc.services.some((s) => s.status === "EXPIRED" || s.status === "UNAVAILABLE")) ||
        (statusFilter === "RESERVED" &&
          acc.services.some((s) => s.status === "IN_USE" || s.status === "RESERVED"));

      return matchSearch && matchCategory && matchStatus;
    });
  }, [accounts, searchTerm, categoryFilter, statusFilter]);

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    catalog.forEach((c) => {
      if (c.name) set.add(c.name);
    });
    accounts.forEach((a) => {
      (a.services || []).forEach((s) => {
        if (s.display_name) set.add(s.display_name);
        else if (s.category) set.add(s.category);
      });
    });
    return Array.from(set).sort();
  }, [catalog, accounts]);

  const stats = useMemo(() => {
    let totalAvailableSlots = 0;
    let totalReservedSlots = 0;
    let totalExpiredSlots = 0;
    for (const item of accounts) {
      for (const s of item.services) {
        if (s.status === "AVAILABLE") totalAvailableSlots += 1;
        else if (s.status === "IN_USE" || s.status === "RESERVED") totalReservedSlots += 1;
        else if (s.status === "EXPIRED" || s.status === "UNAVAILABLE") totalExpiredSlots += 1;
      }
    }
    return {
      totalAccounts: accounts.length,
      totalAvailableSlots,
      totalReservedSlots,
      totalExpiredSlots,
    };
  }, [accounts]);

  const createAccount = useCallback(
    async (formData: WarehouseAccountFormData) => {
      const res = await fetch("/api/warehouse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Lỗi tạo tài khoản kho");
      }
      notification.success("Đã tạo mới tài khoản kho thành công!", "Tạo tài khoản");
      await invalidateAndReload();
    },
    [notification, invalidateAndReload]
  );

  const updateAccount = useCallback(
    async (accountId: number, newAccountName: string) => {
      const res = await fetch(`/api/warehouse/accounts/${accountId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account: newAccountName }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể cập nhật tài khoản kho");
      }
      notification.success(
        `Đã cập nhật tài khoản "${newAccountName}" thành công!`,
        "Cập Nhật Thành Công"
      );
      await invalidateAndReload();
    },
    [notification, invalidateAndReload]
  );

  const deleteAccount = useCallback(
    async (acc: WarehouseAccountItem) => {
      const res = await fetch(`/api/warehouse/${acc.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Lỗi xóa tài khoản");
      notification.success("Đã xóa tài khoản kho thành công!");
      await invalidateAndReload();
    },
    [notification, invalidateAndReload]
  );

  const addServiceToAccount = useCallback(
    async (account: WarehouseAccountItem, formData: WarehouseAddServiceFormData) => {
      const res = await fetch(`/api/warehouse/accounts/${account.id}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể thêm dịch vụ vào tài khoản");
      }
      notification.success(
        `Đã thêm dịch vụ "${formData.serviceName}" vào tài khoản ${account.account} thành công!`,
        "Thêm dịch vụ kho"
      );
      await invalidateAndReload();
    },
    [notification, invalidateAndReload]
  );

  const updateSlot = useCallback(
    async (slotId: number, formData: WarehouseSlotEditFormData) => {
      const res = await fetch(`/api/warehouse/services/${slotId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể cập nhật slot dịch vụ");
      }
      notification.success("Cập nhật thông tin slot thành công!");
      await invalidateAndReload();
    },
    [notification, invalidateAndReload]
  );

  const deleteSlot = useCallback(
    async (srv: WarehouseServiceSlot) => {
      const res = await fetch(`/api/warehouse/services/${srv.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Lỗi xóa dịch vụ kho");
      }
      notification.success(`Đã xóa dịch vụ "${srv.display_name || srv.category}" thành công!`);
      await invalidateAndReload();
    },
    [notification, invalidateAndReload]
  );

  const createCatalogItem = useCallback(
    async (formData: CatalogFormData) => {
      const res = await fetch("/api/warehouse/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Lỗi tạo dịch vụ danh mục");
      }
      notification.success("Đã thêm dịch vụ vào danh mục thành công!", "Tạo dịch vụ");
      await invalidateAndReload();
    },
    [notification, invalidateAndReload]
  );

  const updateCatalogItem = useCallback(
    async (data: {
      id: number;
      name: string;
      category: string;
      loginUrl: string;
      productId: number | null;
      syncSlotsTag?: boolean;
    }) => {
      const res = await fetch(`/api/warehouse/catalog/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Không thể cập nhật dịch vụ kho");
      }
      notification.success(
        `Đã cập nhật dịch vụ "${data.name}" thành công!`,
        "Cập Nhật Thành Công"
      );
      await invalidateAndReload();
    },
    [notification, invalidateAndReload]
  );

  const deleteCatalogItem = useCallback(
    async (item: ServiceNameCategoryItem) => {
      const res = await fetch(`/api/warehouse/catalog/${item.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể xóa dịch vụ kho");
      }
      notification.success(
        data.message || `Đã xóa dịch vụ "${item.name}" khỏi danh mục kho thành công!`,
        "Xóa Dịch Vụ Kho"
      );
      await invalidateAndReload();
    },
    [notification, invalidateAndReload]
  );

  const toggleCatalogPackage = useCallback(
    async (item: ServiceNameCategoryItem) => {
      try {
        const nextVal = !item.isPackage;
        const res = await fetch(`/api/warehouse/catalog/${item.id}/toggle-package`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPackage: nextVal }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Không thể cập nhật cấu hình gói kho");
        }
        notification.success(
          `Đã ${nextVal ? "BẬT" : "TẮT"} chế độ tự động tạo gói kho cho dịch vụ "${item.name}"!`,
          "Cập Nhật Dịch Vụ"
        );
        await invalidateAndReload();
      } catch (err: any) {
        console.error("Lỗi toggle package:", err);
        notification.error(err.message || "Lỗi cập nhật cấu hình gói kho");
      }
    },
    [notification, invalidateAndReload]
  );

  const openBrowserForUrl = useCallback(
    (url: string, serviceName: string) => {
      const rawUrl = url.trim();
      if (!rawUrl) {
        notification.warning(
          `Dịch vụ ${serviceName} chưa có đường link đăng nhập. Vui lòng cấu hình trong Danh mục Kho Hàng.`,
          "Thiếu đường link"
        );
        return;
      }
      const targetUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
      if (targetUrl && navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(targetUrl).catch(() => {});
      }
      const browserWindow = window.open(
        "/browser/",
        "MavrykCloudBrowser",
        "width=1280,height=820,menubar=no,toolbar=no,location=no,status=no,resizable=yes"
      );
      if (browserWindow) browserWindow.focus();
      notification.info(
        `Đang mở Trình duyệt Đám Mây cho ${serviceName}. Link (${targetUrl}) đã được sao chép vào bộ nhớ tạm để dán trong cửa sổ stream.`,
        "Trình Duyệt Đám Mây"
      );
    },
    [notification]
  );

  const openBrowserForSlot = useCallback(
    async (account: WarehouseAccountItem, service: any) => {
      if (openingSlotId) return;
      setOpeningSlotId(service.id);
      try {
        const rawUrl =
          (service.login_url || "").trim() ||
          (
            catalog.find((c) => c.name === service.display_name || c.name === service.category)
              ?.loginUrl || ""
          ).trim();

        const targetUrl = rawUrl
          ? rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
            ? rawUrl
            : `https://${rawUrl}`
          : "";

        if (!targetUrl) {
          notification.warning(
            `Dịch vụ ${service.display_name || service.category} chưa có đường link đăng nhập. Vui lòng cấu hình trong Danh mục Kho Hàng.`,
            "Thiếu đường link"
          );
          return;
        }

        if (targetUrl && navigator?.clipboard?.writeText) {
          navigator.clipboard.writeText(targetUrl).catch(() => {});
        }

        const browserWindow = window.open(
          "/browser/",
          "MavrykCloudBrowser",
          "width=1280,height=820,menubar=no,toolbar=no,location=no,status=no,resizable=yes"
        );
        if (browserWindow) browserWindow.focus();

        notification.info(
          `Đã mở Trình duyệt Đám Mây cho tài khoản ${account.account} (${service.display_name || service.category}). Link đăng nhập (${targetUrl}) đã được chép vào bộ nhớ tạm. Hãy thao tác trực tiếp trên cửa sổ vừa mở; Profile sẽ được lưu vĩnh viễn trên VPS.`,
          "Trình Duyệt Đám Mây"
        );

        const res = await fetch(`/api/warehouse/accounts/${account.id}/open-browser`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serviceName: service.display_name || service.category,
            slotId: service.id,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const hasAuthenticatedSession = data.data?.hasAuthenticatedSession === true;
          setLoggedSlotsMap((previous) => ({
            ...previous,
            [service.id]: hasAuthenticatedSession,
          }));
          if (hasAuthenticatedSession) {
            notification.success(
              "Đã xác minh phiên đăng nhập của tài khoản này.",
              "Đã Đăng Nhập"
            );
          }
        }
      } catch (err: any) {
        console.warn("Lưu ý probe session:", err);
      } finally {
        setOpeningSlotId(null);
      }
    },
    [openingSlotId, catalog, notification]
  );

  return {
    accounts,
    catalog,
    systemProducts,
    loading,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    expandedAccountIds,
    showPasswordMap,
    copiedKeyMap,
    loggedSlotsMap,
    openingSlotId,
    filteredAccounts,
    availableCategories,
    stats,
    loadWarehouseData,
    ensureSystemProducts,
    invalidateAndReload,
    toggleExpand,
    toggleShowPassword,
    copyToClipboard,
    createAccount,
    updateAccount,
    deleteAccount,
    addServiceToAccount,
    updateSlot,
    deleteSlot,
    createCatalogItem,
    updateCatalogItem,
    deleteCatalogItem,
    toggleCatalogPackage,
    openBrowserForUrl,
    openBrowserForSlot,
  };
}
