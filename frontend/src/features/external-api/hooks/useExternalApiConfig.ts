import { useEffect, useMemo, useState } from "react";
import { useNotification } from "@/shared/context/NotificationContext";
import { externalApiClient } from "@/features/external-api/api/externalApiClient";
import type { PortalSlotItem, PortalSlotRoutingRule, ProductItem, SupplierOption } from "@/features/external-api/types";

export interface Provider {
  key: string;
  name: string;
  category: string;
  description: string;
  input: string;
  enabled: boolean;
  configured: boolean;
  status: string;
}

export interface TestState {
  value: string;
  loading: boolean;
  result?: string;
  otp?: string;
  isError?: boolean;
}

export function useExternalApiConfig() {
  const notification = useNotification();
  const showToast = (type: "success" | "error", message: string) => notification[type](message);

  const [providers, setProviders] = useState<Provider[]>([]);
  const [testInputs, setTestInputs] = useState<Record<string, TestState>>({});
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [availableApis, setAvailableApis] = useState<any[]>([]);
  const [slots, setSlots] = useState<PortalSlotItem[]>([]);
  const [routingRules, setRoutingRules] = useState<PortalSlotRoutingRule[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingSlots, setSavingSlots] = useState(false);

  // Search & Filter States
  const [providerSearch, setProviderSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [productSearch, setProductSearch] = useState("");
  const [productFilter, setProductFilter] = useState<"ALL" | "ASSIGNED" | "UNASSIGNED">("ALL");

  const load = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [providerResponse, mappingResponse, slotResponse, ruleResponse] = await Promise.all([
        fetch("/api/system/providers", { credentials: "include" }).then((response) => response.json()),
        externalApiClient.getProductApis().then((response) => response.json()),
        externalApiClient.getPortalSlots().then((response) => response.json()),
        externalApiClient.getRoutingRules().then((response) => response.json()).catch(() => ({ rules: [], suppliers: [] })),
      ]);

      setProviders(providerResponse.providers || []);
      setProducts(mappingResponse.products || []);
      setAvailableApis(mappingResponse.availableApis || []);
      setRoutingRules(ruleResponse.rules || []);
      setSuppliers(ruleResponse.suppliers || []);
      const loadedSlots = (slotResponse.slots || []).map((slot: PortalSlotItem) => {
        const assigned = Array.isArray(slot.assigned_services) && slot.assigned_services.length > 0
          ? slot.assigned_services
          : [slot.primary_service_key, slot.fallback_service_key].filter((k): k is string => Boolean(k));
        return {
          ...slot,
          assigned_services: assigned,
          enabled: slot.enabled !== false,
        };
      });
      setSlots(loadedSlots);
      if (isManualRefresh) {
        showToast("success", "Đã làm mới dữ liệu cấu hình.");
      }
    } catch (error: any) {
      showToast("error", error.message || "Không thể tải cấu hình provider.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const setInput = (key: string, value: string) => {
    setTestInputs((current) => ({
      ...current,
      [key]: {
        ...(current[key] || { loading: false }),
        value,
      },
    }));
  };

  const testProvider = async (provider: Provider) => {
    const value = testInputs[provider.key]?.value?.trim() || "";
    if (!value) {
      showToast("error", "Vui lòng nhập dữ liệu kiểm tra.");
      return;
    }

    setTestInputs((current) => ({
      ...current,
      [provider.key]: { value, loading: true, result: undefined, otp: undefined, isError: false },
    }));

    try {
      const response = await fetch("/api/system/providers/" + encodeURIComponent(provider.key) + "/test", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: value, email: value }),
      });
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.error || "Provider kiểm tra thất bại.");
      }

      setTestInputs((current) => ({
        ...current,
        [provider.key]: {
          value,
          loading: false,
          result: data.message || "Kết nối thành công",
          otp: data.otp || undefined,
          isError: false,
        },
      }));
      showToast("success", `Đã kiểm tra ${provider.name} thành công.`);
    } catch (error: any) {
      setTestInputs((current) => ({
        ...current,
        [provider.key]: {
          value,
          loading: false,
          result: error.message || "Lỗi kiểm tra",
          otp: undefined,
          isError: true,
        },
      }));
      showToast("error", error.message || "Provider kiểm tra thất bại.");
    }
  };

  const assignProvider = async (productId: number, providerKey: string) => {
    if (!providerKey) return;
    try {
      const response = await externalApiClient.assignProductApi({ productId, providerKey, isDefault: false });
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.error || "Không thể gán provider.");
      }
      showToast("success", "Đã cập nhật mapping provider cho sản phẩm.");
      await load();
    } catch (error: any) {
      showToast("error", error.message || "Không thể gán provider.");
    }
  };

  const setDefaultProvider = async (mappingId: number) => {
    try {
      const response = await externalApiClient.setDefaultProductApi(mappingId);
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.error || "Không thể đặt provider làm mặc định.");
      }
      showToast("success", "Đã đặt provider làm cổng mặc định cho sản phẩm.");
      await load();
    } catch (error: any) {
      showToast("error", error.message || "Không thể đặt provider làm mặc định.");
    }
  };

  const removeMapping = async (mappingId: number) => {
    try {
      const response = await externalApiClient.removeProductApi(mappingId);
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.error || "Không thể gỡ mapping.");
      }
      showToast("success", "Đã gỡ mapping provider.");
      await load();
    } catch (error: any) {
      showToast("error", error.message || "Không thể gỡ mapping.");
    }
  };

  const addServiceToSlot = (slotKey: string, serviceKey: string) => {
    if (!serviceKey) return;
    setSlots((current) =>
      current.map((slot) => {
        if (slot.slot_key !== slotKey) return slot;
        const currentAssigned = Array.isArray(slot.assigned_services)
          ? [...slot.assigned_services]
          : [slot.primary_service_key, slot.fallback_service_key].filter((k): k is string => Boolean(k));

        if (currentAssigned.includes(serviceKey)) return slot;
        const newAssigned = [...currentAssigned, serviceKey];
        return {
          ...slot,
          assigned_services: newAssigned,
          primary_service_key: newAssigned[0],
          fallback_service_key: newAssigned[1] || null,
        };
      })
    );
  };

  const removeServiceFromSlot = (slotKey: string, serviceKey: string) => {
    setSlots((current) =>
      current.map((slot) => {
        if (slot.slot_key !== slotKey) return slot;
        const currentAssigned = Array.isArray(slot.assigned_services)
          ? [...slot.assigned_services]
          : [slot.primary_service_key, slot.fallback_service_key].filter((k): k is string => Boolean(k));

        const newAssigned = currentAssigned.filter((k) => k !== serviceKey);
        return {
          ...slot,
          assigned_services: newAssigned,
          primary_service_key: newAssigned[0] || undefined,
          fallback_service_key: newAssigned[1] || null,
        };
      })
    );
  };

  const moveServiceInSlot = (slotKey: string, fromIndex: number, toIndex: number) => {
    setSlots((current) =>
      current.map((slot) => {
        if (slot.slot_key !== slotKey) return slot;
        const currentAssigned = Array.isArray(slot.assigned_services)
          ? [...slot.assigned_services]
          : [slot.primary_service_key, slot.fallback_service_key].filter((k): k is string => Boolean(k));

        if (fromIndex < 0 || fromIndex >= currentAssigned.length || toIndex < 0 || toIndex >= currentAssigned.length) {
          return slot;
        }

        const newAssigned = [...currentAssigned];
        const [moved] = newAssigned.splice(fromIndex, 1);
        newAssigned.splice(toIndex, 0, moved);

        return {
          ...slot,
          assigned_services: newAssigned,
          primary_service_key: newAssigned[0],
          fallback_service_key: newAssigned[1] || null,
        };
      })
    );
  };

  const toggleSlotEnabled = (slotKey: string, enabled: boolean) => {
    setSlots((current) =>
      current.map((slot) => {
        if (slot.slot_key !== slotKey) return slot;
        return { ...slot, enabled };
      })
    );
  };

  const updateSlot = (
    slotKey: string,
    field: "primary_service_key" | "fallback_service_key",
    value: string
  ) => {
    setSlots((current) =>
      current.map((slot) => {
        if (slot.slot_key !== slotKey) return slot;

        if (field === "primary_service_key") {
          const newPrimary = value || undefined;
          const assigned = [
            value,
            ...(slot.fallback_service_key && slot.fallback_service_key !== value ? [slot.fallback_service_key] : []),
          ].filter((item): item is string => Boolean(item));

          return {
            ...slot,
            primary_service_key: newPrimary,
            assigned_services: assigned,
          };
        } else {
          const newFallback = value || null;
          const assigned = [slot.primary_service_key, value].filter((item): item is string => Boolean(item));

          return {
            ...slot,
            fallback_service_key: newFallback,
            assigned_services: assigned,
          };
        }
      })
    );
  };

  const saveSlots = async () => {
    setSavingSlots(true);
    try {
      const response = await externalApiClient.savePortalSlots({ value: JSON.stringify(slots) });
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.error || "Không thể lưu mapping ô input.");
      }
      showToast("success", "Đã lưu thành công cấu hình cổng OTP.");
    } catch (error: any) {
      showToast("error", error.message || "Không thể lưu mapping ô input.");
    } finally {
      setSavingSlots(false);
    }
  };

  // CRUD Routing Rules (Phương Án A)
  const createRoutingRule = async (ruleData: {
    slotKey: string;
    productNameId: number;
    supplierId?: number | null;
    providerKey: string;
    priority?: number;
    isActive?: boolean;
    note?: string;
  }) => {
    try {
      const response = await externalApiClient.createRoutingRule(ruleData);
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.error || "Không thể tạo quy tắc liên kết.");
      }
      showToast("success", "Đã tạo thành công quy tắc liên kết ô input & NCC.");
      await load();
      return true;
    } catch (error: any) {
      showToast("error", error.message || "Không thể tạo quy tắc liên kết.");
      return false;
    }
  };

  const updateRoutingRule = async (
    ruleId: number,
    ruleData: Partial<{
      slotKey: string;
      productNameId: number;
      supplierId: number | null;
      providerKey: string;
      priority: number;
      isActive: boolean;
      note: string;
    }>
  ) => {
    try {
      const response = await externalApiClient.updateRoutingRule(ruleId, ruleData);
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.error || "Không thể cập nhật quy tắc.");
      }
      showToast("success", "Đã cập nhật quy tắc liên kết.");
      await load();
      return true;
    } catch (error: any) {
      showToast("error", error.message || "Không thể cập nhật quy tắc.");
      return false;
    }
  };

  const deleteRoutingRule = async (ruleId: number) => {
    try {
      const response = await externalApiClient.deleteRoutingRule(ruleId);
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.error || "Không thể xóa quy tắc.");
      }
      showToast("success", "Đã xóa quy tắc liên kết.");
      await load();
      return true;
    } catch (error: any) {
      showToast("error", error.message || "Không thể xóa quy tắc.");
      return false;
    }
  };

  const toggleRoutingRuleActive = async (ruleId: number, currentActive: boolean) => {
    return updateRoutingRule(ruleId, { isActive: !currentActive });
  };

  // Metrics
  const configuredCount = useMemo(
    () => providers.filter((provider) => provider.configured).length,
    [providers]
  );
  const unconfiguredCount = useMemo(
    () => providers.length - configuredCount,
    [providers, configuredCount]
  );
  const assignedProductsCount = useMemo(
    () => products.filter((p) => p.apis && p.apis.length > 0).length,
    [products]
  );

  // Filtered Providers
  const categories = useMemo(() => {
    const set = new Set<string>();
    providers.forEach((p) => {
      if (p.category) set.add(p.category.toUpperCase());
    });
    return Array.from(set);
  }, [providers]);

  const filteredProviders = useMemo(() => {
    return providers.filter((p) => {
      const matchesSearch =
        !providerSearch.trim() ||
        p.name.toLowerCase().includes(providerSearch.toLowerCase()) ||
        p.key.toLowerCase().includes(providerSearch.toLowerCase()) ||
        p.description.toLowerCase().includes(providerSearch.toLowerCase());

      const matchesCategory =
        selectedCategory === "ALL" || p.category.toUpperCase() === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [providers, providerSearch, selectedCategory]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    const list = products.filter((p) => {
      const matchesName = p.package_name.toLowerCase().includes(query);
      const matchesId = String(p.id).includes(query);
      const matchesCategory = (p.category || "").toLowerCase().includes(query);
      const matchesTags = (p.warehouse_tags || []).some((t) => t.toLowerCase().includes(query));
      const matchesVariants = (p.variants || []).some(
        (v) =>
          (v.variant_name || "").toLowerCase().includes(query) ||
          (v.display_name || "").toLowerCase().includes(query)
      );
      const matchesApis = (p.apis || []).some(
        (a) =>
          (a.service_name || "").toLowerCase().includes(query) ||
          (a.provider_key || "").toLowerCase().includes(query)
      );

      const matchesSearch =
        !query ||
        matchesName ||
        matchesId ||
        matchesCategory ||
        matchesTags ||
        matchesVariants ||
        matchesApis;

      const hasApis = p.apis && p.apis.length > 0;
      const matchesFilter =
        productFilter === "ALL" ||
        (productFilter === "ASSIGNED" && hasApis) ||
        (productFilter === "UNASSIGNED" && !hasApis);

      return matchesSearch && matchesFilter;
    });

    return [...list].sort((a, b) => {
      const aAssigned = a.apis && a.apis.length > 0 ? 1 : 0;
      const bAssigned = b.apis && b.apis.length > 0 ? 1 : 0;
      if (aAssigned !== bAssigned) return bAssigned - aAssigned;
      const aSlots = a.total_slots || 0;
      const bSlots = b.total_slots || 0;
      if (aSlots !== bSlots) return bSlots - aSlots;
      return a.id - b.id;
    });
  }, [products, productSearch, productFilter]);

  return {
    providers,
    filteredProviders,
    configuredCount,
    unconfiguredCount,
    categories,
    selectedCategory,
    setSelectedCategory,
    providerSearch,
    setProviderSearch,
    testInputs,
    setInput,
    testProvider,

    products,
    filteredProducts,
    assignedProductsCount,
    productSearch,
    setProductSearch,
    productFilter,
    setProductFilter,
    availableApis,
    assignProvider,
    setDefaultProvider,
    removeMapping,

    slots,
    updateSlot,
    addServiceToSlot,
    removeServiceFromSlot,
    moveServiceInSlot,
    toggleSlotEnabled,
    saveSlots,
    savingSlots,

    routingRules,
    suppliers,
    createRoutingRule,
    updateRoutingRule,
    deleteRoutingRule,
    toggleRoutingRuleActive,

    loading,
    refreshing,
    load,
  };
}

