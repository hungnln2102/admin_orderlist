import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { WarehouseItem } from "../../../../../Personal/Storage/types";
import type { PackageFormValues } from "../../../utils/packageHelpers";
import { EMPTY_MANUAL_ENTRY } from "../../../utils/packageHelpers";

type UsePackageStockStorageControlsParams = {
  values: PackageFormValues;
  setValues: Dispatch<SetStateAction<PackageFormValues>>;
  filterItems: (search: string) => WarehouseItem[];
  findWarehouseItemById: (id: unknown) => WarehouseItem | null;
};

export function usePackageStockStorageControls({
  values,
  setValues,
  filterItems,
  findWarehouseItemById,
}: UsePackageStockStorageControlsParams) {
  const [stockDropdownOpen, setStockDropdownOpen] = useState(false);
  const [stockSearch, setStockSearch] = useState("");
  const [stockManual, setStockManual] = useState(false);
  const stockRef = useRef<HTMLDivElement>(null);

  const [storageDropdownOpen, setStorageDropdownOpen] = useState(false);
  const [storageSearch, setStorageSearch] = useState("");
  const [storageManual, setStorageManual] = useState(false);
  const storageRef = useRef<HTMLDivElement>(null);

  const resetStockStorageControls = useCallback(() => {
    setStockSearch("");
    setStockDropdownOpen(false);
    setStockManual(false);
    setStorageSearch("");
    setStorageDropdownOpen(false);
    setStorageManual(false);
  }, []);

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

  const filteredStockItems = useMemo(
    () => filterItems(stockSearch),
    [filterItems, stockSearch]
  );
  const filteredStorageItems = useMemo(
    () => filterItems(storageSearch),
    [filterItems, storageSearch]
  );

  const selectedStockItem = useMemo(
    () => findWarehouseItemById(values.stockId),
    [findWarehouseItemById, values.stockId]
  );
  const selectedStorageItem = useMemo(
    () => findWarehouseItemById(values.storageId),
    [findWarehouseItemById, values.storageId]
  );

  const handleSelectStock = useCallback((item: WarehouseItem) => {
    setValues((prev) => ({
      ...prev,
      stockId: item.id ?? null,
    }));
    setStockDropdownOpen(false);
    setStockSearch("");
  }, [setValues]);

  const handleClearStock = useCallback(() => {
    setValues((prev) => ({ ...prev, stockId: null }));
  }, [setValues]);

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
  }, [setValues, stockManual]);

  const handleSelectStorage = useCallback((item: WarehouseItem) => {
    setValues((prev) => ({ ...prev, storageId: item.id ?? null }));
    setStorageDropdownOpen(false);
    setStorageSearch("");
  }, [setValues]);

  const handleClearStorage = useCallback(() => {
    setValues((prev) => ({ ...prev, storageId: null }));
  }, [setValues]);

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
  }, [setValues, storageManual]);

  return {
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
    resetStockStorageControls,
    handleSelectStock,
    handleClearStock,
    handleToggleStockManual,
    handleSelectStorage,
    handleClearStorage,
    handleToggleStorageManual,
  };
}

