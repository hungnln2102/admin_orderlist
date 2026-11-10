import { useEffect, useMemo, useState } from "react";
import { useNotification } from "@/shared/context/NotificationContext";
import { externalApiClient } from "@/features/external-api/api/externalApiClient";
import type { PortalSlotItem, ProductItem } from "@/features/external-api/types";

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
      const [providerResponse, mappingResponse, slotResponse] = await Promise.all([
        fetch("/api/system/providers", { credentials: "include" }).then((response) => response.json()),
        externalApiClient.getProductApis().then((response) => response.json()),
        externalApiClient.getPortalSlots().then((response) => response.json()),
      ]);

      setProviders(providerResponse.providers || []);
      setProducts(mappingResponse.products || []);
      setAvailableApis(mappingResponse.availableApis || []);
      setSlots(slotResponse.slots || []);
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
    return products.filter((p) => {
      const matchesSearch =
        !productSearch.trim() ||
        p.package_name.toLowerCase().includes(productSearch.toLowerCase()) ||
        String(p.id).includes(productSearch.trim());

      const hasApis = p.apis && p.apis.length > 0;
      const matchesFilter =
        productFilter === "ALL" ||
        (productFilter === "ASSIGNED" && hasApis) ||
        (productFilter === "UNASSIGNED" && !hasApis);

      return matchesSearch && matchesFilter;
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
    removeMapping,

    slots,
    updateSlot,
    saveSlots,
    savingSlots,

    loading,
    refreshing,
    load,
  };
}

