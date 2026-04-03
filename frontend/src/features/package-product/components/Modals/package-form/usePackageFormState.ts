import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { apiFetch } from "@/lib/api";
import { API_ENDPOINTS } from "@/constants";
import type { WarehouseItem } from "../../../../../Personal/Storage/types";
import type {
  AccountInfo,
  PackageFormValues,
  SlotLinkMode,
} from "../../../utils/packageHelpers";
import {
  EMPTY_FORM_VALUES,
  EMPTY_MANUAL_ENTRY,
} from "../../../utils/packageHelpers";
import {
  normalizeWarehouseId,
  type EditableWarehouseFields,
} from "./shared";

type UsePackageFormStateParams = {
  open: boolean;
  initialValues?: PackageFormValues;
  onSubmit: (values: PackageFormValues) => void;
};

export const usePackageFormState = ({
  open,
  initialValues,
  onSubmit,
}: UsePackageFormStateParams) => {
  const mergedInitialValues = useMemo(
    () => ({ ...EMPTY_FORM_VALUES, ...(initialValues ?? {}) }),
    [initialValues]
  );
  const [values, setValues] = useState<PackageFormValues>(mergedInitialValues);
  const [warehouseItems, setWarehouseItems] = useState<WarehouseItem[]>([]);
  const [warehouseLoading, setWarehouseLoading] = useState(false);

  const [stockDropdownOpen, setStockDropdownOpen] = useState(false);
  const [stockSearch, setStockSearch] = useState("");
  const [stockManual, setStockManual] = useState(false);
  const stockRef = useRef<HTMLDivElement>(null);

  const [storageDropdownOpen, setStorageDropdownOpen] = useState(false);
  const [storageSearch, setStorageSearch] = useState("");
  const [storageManual, setStorageManual] = useState(false);
  const storageRef = useRef<HTMLDivElement>(null);

  const formatImportValue = useCallback((raw: string): string => {
    const digitsOnly = raw.replace(/[^0-9]/g, "");
    if (!digitsOnly) return "";
    const numeric = Number(digitsOnly);
    return Number.isFinite(numeric) ? numeric.toLocaleString("vi-VN") : "";
  }, []);

  useEffect(() => {
    if (!open) return;

    setValues({
      ...mergedInitialValues,
      import: formatImportValue(mergedInitialValues.import),
    });
    setStockSearch("");
    setStockDropdownOpen(false);
    setStockManual(false);
    setStorageSearch("");
    setStorageDropdownOpen(false);
    setStorageManual(false);
  }, [open, mergedInitialValues, formatImportValue]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const fetchWarehouse = async () => {
      setWarehouseLoading(true);
      try {
        const response = await apiFetch(API_ENDPOINTS.WAREHOUSE);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = (await response.json()) as WarehouseItem[];
        if (!cancelled) setWarehouseItems(data);
      } catch {
        if (!cancelled) setWarehouseItems([]);
      } finally {
        if (!cancelled) setWarehouseLoading(false);
      }
    };

    fetchWarehouse();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (stockRef.current && !stockRef.current.contains(event.target as Node)) {
        setStockDropdownOpen(false);
      }
      if (
        storageRef.current &&
        !storageRef.current.contains(event.target as Node)
      ) {
        setStorageDropdownOpen(false);
      }
    };

    if (stockDropdownOpen || storageDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [stockDropdownOpen, storageDropdownOpen]);

  const inStockItems = useMemo(
    () =>
      warehouseItems.filter((item) =>
        (item.status || "").toLowerCase().includes("tồn")
      ),
    [warehouseItems]
  );

  const filterItems = useCallback(
    (search: string) => {
      if (!search.trim()) return inStockItems;
      const query = search.toLowerCase();
      return inStockItems.filter(
        (item) =>
          (item.account || "").toLowerCase().includes(query) ||
          (item.category || "").toLowerCase().includes(query) ||
          (item.note || "").toLowerCase().includes(query)
      );
    },
    [inStockItems]
  );

  const filteredStockItems = useMemo(
    () => filterItems(stockSearch),
    [filterItems, stockSearch]
  );
  const filteredStorageItems = useMemo(
    () => filterItems(storageSearch),
    [filterItems, storageSearch]
  );

  const selectedStockItem = useMemo(() => {
    const targetId = normalizeWarehouseId(values.stockId);
    if (targetId == null) return null;
    return (
      warehouseItems.find((item) => normalizeWarehouseId(item.id) === targetId) ??
      null
    );
  }, [values.stockId, warehouseItems]);

  const selectedStorageItem = useMemo(() => {
    const targetId = normalizeWarehouseId(values.storageId);
    if (targetId == null) return null;
    return (
      warehouseItems.find((item) => normalizeWarehouseId(item.id) === targetId) ??
      null
    );
  }, [values.storageId, warehouseItems]);

  const handleUpdateWarehouseInfo = useCallback(
    async (id: number, fields: EditableWarehouseFields) => {
      const targetId = normalizeWarehouseId(id);
      const currentItem =
        targetId == null
          ? undefined
          : warehouseItems.find(
              (item) => normalizeWarehouseId(item.id) === targetId
            );

      if (!currentItem) throw new Error("WAREHOUSE_ITEM_NOT_FOUND");

      const payload = {
        category: currentItem.category ?? null,
        account: fields.account || null,
        password: fields.password || null,
        backup_email: fields.backup_email || null,
        two_fa: fields.two_fa || null,
        note: fields.note || null,
        status: currentItem.status ?? null,
        expires_at: currentItem.expires_at ?? null,
        is_verified: currentItem.is_verified ?? false,
      };

      const response = await apiFetch(`${API_ENDPOINTS.WAREHOUSE}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const updated = (await response.json()) as WarehouseItem;
      setWarehouseItems((prev) =>
        prev.map((item) =>
          normalizeWarehouseId(item.id) === targetId
            ? { ...item, ...updated }
            : item
        )
      );
    },
    [warehouseItems]
  );

  const handleChange = useCallback(
    (
      field: keyof PackageFormValues,
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      const value = event.target.value;
      if (field === "import") {
        setValues((prev) => ({ ...prev, import: formatImportValue(value) }));
        return;
      }

      setValues((prev) => ({ ...prev, [field]: value }));
    },
    [formatImportValue]
  );

  const handleSelectStock = useCallback((item: WarehouseItem) => {
    setValues((prev) => ({
      ...prev,
      stockId: item.id ?? null,
    }));
    setStockDropdownOpen(false);
    setStockSearch("");
  }, []);

  const handleClearStock = useCallback(() => {
    setValues((prev) => ({ ...prev, stockId: null }));
  }, []);

  const handleToggleStockManual = useCallback(() => {
    setStockManual((prev) => !prev);
    setStockDropdownOpen(false);
    if (!stockManual) {
      setValues((prev) => ({
        ...prev,
        stockId: null,
        manualStock: { ...EMPTY_MANUAL_ENTRY },
      }));
    }
  }, [stockManual]);

  const handleSelectStorage = useCallback((item: WarehouseItem) => {
    setValues((prev) => ({ ...prev, storageId: item.id ?? null }));
    setStorageDropdownOpen(false);
    setStorageSearch("");
  }, []);

  const handleClearStorage = useCallback(() => {
    setValues((prev) => ({ ...prev, storageId: null }));
  }, []);

  const handleToggleStorageManual = useCallback(() => {
    setStorageManual((prev) => !prev);
    setStorageDropdownOpen(false);
    if (!storageManual) {
      setValues((prev) => ({
        ...prev,
        storageId: null,
        manualStorage: { ...EMPTY_MANUAL_ENTRY },
      }));
    }
  }, [storageManual]);

  const matchRequiresAccountError =
    (values.slotLinkMode === "slot" || values.slotLinkMode === "information") &&
    !values.stockId &&
    !stockManual
      ? "Khi chọn Match, cần liên kết với kho hàng (stock_id)."
      : null;

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      if (matchRequiresAccountError) return;
      onSubmit(values);
    },
    [matchRequiresAccountError, onSubmit, values]
  );

  const handleSlotLinkModeChange = useCallback((mode: SlotLinkMode) => {
    setValues((prev) => ({ ...prev, slotLinkMode: mode }));
  }, []);

  return {
    values,
    setValues,
    warehouseLoading,
    inStockItemsCount: inStockItems.length,
    stockDropdownOpen,
    setStockDropdownOpen,
    stockSearch,
    setStockSearch,
    stockManual,
    stockRef,
    storageDropdownOpen,
    setStorageDropdownOpen,
    storageSearch,
    setStorageSearch,
    storageManual,
    storageRef,
    filteredStockItems,
    filteredStorageItems,
    selectedStockItem,
    selectedStorageItem,
    handleUpdateWarehouseInfo,
    handleChange,
    handleSelectStock,
    handleClearStock,
    handleToggleStockManual,
    handleSelectStorage,
    handleClearStorage,
    handleToggleStorageManual,
    matchRequiresAccountError,
    handleSubmit,
    handleSlotLinkModeChange,
  };
};
