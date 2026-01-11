import { useCallback, useState } from "react";
import { API_ENDPOINTS } from "../../../../constants";
import {
  NewSupplyRowState,
  ProductPricingRow,
  SupplyPriceState,
} from "../types";
import {
  applyBasePriceToProduct,
  buildSupplyRowKey,
  computeHighestSupplyPrice,
  dedupeSupplyItems,
  formatVndDisplay,
  formatVndInput,
  hasValidPromoRatio,
  normalizeProductKey,
  sortSupplyItems,
} from "../utils";

interface UseSupplyActionsParams {
  apiBase: string;
  setProductPrices: React.Dispatch<React.SetStateAction<ProductPricingRow[]>>;
  fetchProductPrices: () => Promise<void>;
}

export const useSupplyActions = ({
  apiBase,
  setProductPrices,
  fetchProductPrices,
}: UseSupplyActionsParams) => {
  const [supplyPriceMap, setSupplyPriceMap] = useState<
    Record<string, SupplyPriceState>
  >({});
  const [editingSupplyRows, setEditingSupplyRows] = useState<
    Record<string, boolean>
  >({});
  const [supplyPriceDrafts, setSupplyPriceDrafts] = useState<
    Record<string, string>
  >({});
  const [savingSupplyRows, setSavingSupplyRows] = useState<
    Record<string, boolean>
  >({});
  const [supplyRowErrors, setSupplyRowErrors] = useState<
    Record<string, string | null>
  >({});
  const [newSupplyRows, setNewSupplyRows] = useState<
    Record<number, NewSupplyRowState>
  >({});

  const fetchSupplyPricesForProduct = useCallback(
    async (productName: string) => {
      const key = normalizeProductKey(productName);
      if (!key) return;
      setSupplyPriceMap((prev) => ({
        ...prev,
        [key]: {
          items: prev[key]?.items ?? [],
          loading: true,
          error: null,
          productName: prev[key]?.productName ?? productName,
        },
      }));

      try {
        const response = await fetch(
          `${apiBase}${API_ENDPOINTS.SUPPLY_PRICES_BY_PRODUCT_NAME(
            productName
          )}`,
          { credentials: "include" }
        );
        if (!response.ok) {
          throw new Error("Không thể tải giá nguồn. Vui lòng thử lại.");
        }
        const payload = await response.json();
        const mappedItems: SupplyPriceState["items"] = Array.isArray(payload)
          ? payload.map((entry: any, index: number) => ({
              sourceId: Number.isFinite(
                Number(entry?.sourceId ?? entry?.source_id)
              )
                ? Number(entry?.sourceId ?? entry?.source_id)
                : index,
              sourceName:
                entry?.supplier_name?.toString().trim() ||
                entry?.sourceName?.toString().trim() ||
                entry?.source_name?.toString().trim() ||
                `Nhà Cung Cấp #${Number(entry?.sourceId) || index + 1}`,
              price:
                typeof entry?.price === "number" && Number.isFinite(entry.price)
                  ? entry.price
                  : null,
              lastOrderDate:
                typeof entry?.last_order_date === "string"
                  ? entry.last_order_date
                  : null,
            }))
          : [];
        const items = sortSupplyItems(dedupeSupplyItems(mappedItems));
        const highestPrice = computeHighestSupplyPrice(items, null);

        if (
          typeof highestPrice === "number" &&
          Number.isFinite(highestPrice) &&
          highestPrice > 0
        ) {
          setProductPrices((prev) => {
            let changed = false;
            const next = prev.map((row) => {
              if (normalizeProductKey(row.sanPhamRaw) !== key) return row;
              const hasSameBase =
                typeof row.baseSupplyPrice === "number" &&
                Number.isFinite(row.baseSupplyPrice) &&
                Math.abs(row.baseSupplyPrice - highestPrice) < 0.00001;
              const hasWholesale =
                typeof row.wholesalePrice === "number" &&
                Number.isFinite(row.wholesalePrice) &&
                row.wholesalePrice > 0;
              const hasRetail =
                typeof row.retailPrice === "number" &&
                Number.isFinite(row.retailPrice) &&
                row.retailPrice > 0;
              const promoNeeded = hasValidPromoRatio(
                row.pctPromo,
                row.pctKhach,
                row.pctCtv
              );
              const hasPromo =
                typeof row.promoPrice === "number" &&
                Number.isFinite(row.promoPrice) &&
                row.promoPrice > 0;

              if (
                hasSameBase &&
                hasWholesale &&
                hasRetail &&
                (!promoNeeded || hasPromo)
              ) {
                return row;
              }

              changed = true;
              return applyBasePriceToProduct(
                { ...row, baseSupplyPrice: highestPrice },
                highestPrice
              );
            });
            return changed ? next : prev;
          });
        }

        setSupplyPriceMap((prev) => ({
          ...prev,
          [key]: {
            loading: false,
            error: null,
            items,
            productName,
          },
        }));
      } catch (err) {
        setSupplyPriceMap((prev) => ({
          ...prev,
          [key]: {
            loading: false,
            items: prev[key]?.items ?? [],
            error:
              err instanceof Error
                ? err.message
                : "Không thể tải giá nguồn. Vui lòng thử lại.",
            productName: prev[key]?.productName ?? productName,
          },
        }));
      }
    },
    [apiBase, setProductPrices]
  );

  const clearSupplyRowState = (rowKey: string) => {
    setEditingSupplyRows((prev) => {
      const next = { ...prev };
      delete next[rowKey];
      return next;
    });
    setSupplyPriceDrafts((prev) => {
      const next = { ...prev };
      delete next[rowKey];
      return next;
    });
    setSupplyRowErrors((prev) => {
      const next = { ...prev };
      delete next[rowKey];
      return next;
    });
  };

  const handleStartEditingSupply = (
    productId: number,
    sourceId: number,
    currentPrice: number | null
  ) => {
    const rowKey = buildSupplyRowKey(productId, sourceId);
    setEditingSupplyRows((prev) => ({ ...prev, [rowKey]: true }));
    setSupplyPriceDrafts((prev) => ({
      ...prev,
      [rowKey]:
        currentPrice === null || currentPrice === undefined
          ? ""
          : formatVndDisplay(currentPrice),
    }));
    setSupplyRowErrors((prev) => ({ ...prev, [rowKey]: null }));
  };

  const handleSupplyInputChange = (
    productId: number,
    sourceId: number,
    nextValue: string
  ) => {
    const rowKey = buildSupplyRowKey(productId, sourceId);
    const formatted = formatVndInput(nextValue);
    setSupplyPriceDrafts((prev) => ({ ...prev, [rowKey]: formatted }));
    setSupplyRowErrors((prev) => ({ ...prev, [rowKey]: null }));
  };

  const handleCancelSupplyEditing = (productId: number, sourceId: number) => {
    const rowKey = buildSupplyRowKey(productId, sourceId);
    clearSupplyRowState(rowKey);
    setSavingSupplyRows((prev) => {
      const next = { ...prev };
      delete next[rowKey];
      return next;
    });
  };

  const handleConfirmSupplyEditing = async (
    productId: number,
    sourceId: number,
    productKey: string,
    productName: string
  ) => {
    const rowKey = buildSupplyRowKey(productId, sourceId);
    const rawValue = supplyPriceDrafts[rowKey];
    const trimmedValue = rawValue?.toString().trim() ?? "";
    if (!trimmedValue) {
      setSupplyRowErrors((prev) => ({
        ...prev,
        [rowKey]: "Vui lòng nhập giá hợp lệ.",
      }));
      return;
    }
    const parsedValue = Number(trimmedValue.replace(/\D+/g, ""));
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      setSupplyRowErrors((prev) => ({
        ...prev,
        [rowKey]: "Giá nhập không được thấp hơn 0.",
      }));
      return;
    }

    setSavingSupplyRows((prev) => ({ ...prev, [rowKey]: true }));

    try {
      const response = await fetch(
        `${apiBase}${API_ENDPOINTS.UPDATE_SUPPLY_PRICE(productId, sourceId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ price: parsedValue }),
          credentials: "include",
        }
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Không thể cập nhật giá nguồn.");
      }
      const normalizedPrice = Number.isFinite(Number(payload?.price))
        ? Number(payload?.price)
        : parsedValue;
      let nextHighestPrice: number | null = null;
      let shouldRecomputeBase = false;
      setSupplyPriceMap((prev) => {
        const currentState = prev[productKey];
        if (!currentState) return prev;
        const previousMax = computeHighestSupplyPrice(currentState.items, null);
        const currentSupplier = currentState.items.find(
          (supplier) => supplier.sourceId === sourceId
        );
        const previousPrice =
          typeof currentSupplier?.price === "number"
            ? currentSupplier.price
            : null;
        const wasHighestSupplier =
          typeof previousPrice === "number" &&
          typeof previousMax === "number" &&
          Math.abs(previousPrice - previousMax) < 0.00001;
        const nextItems = sortSupplyItems(
          currentState.items.map((supplier) =>
            supplier.sourceId === sourceId
              ? { ...supplier, price: normalizedPrice }
              : supplier
          )
        );
        const updatedMax = computeHighestSupplyPrice(nextItems, null);
        const priceChanged =
          previousPrice === null || previousPrice !== normalizedPrice;
        const validUpdatedMax =
          typeof updatedMax === "number" &&
          Number.isFinite(updatedMax) &&
          updatedMax > 0;
        if (validUpdatedMax) {
          nextHighestPrice = updatedMax;
          if (
            updatedMax !== previousMax ||
            (wasHighestSupplier && priceChanged)
          ) {
            shouldRecomputeBase = true;
          }
        } else if (wasHighestSupplier && priceChanged) {
          nextHighestPrice = updatedMax ?? null;
          shouldRecomputeBase = true;
        }
        return {
          ...prev,
          [productKey]: {
            ...currentState,
            items: nextItems,
          },
        };
      });
      if (shouldRecomputeBase) {
        setProductPrices((prev) =>
          prev.map((product) =>
            product.id === productId
              ? applyBasePriceToProduct(product, nextHighestPrice)
              : product
          )
        );
      }
      clearSupplyRowState(rowKey);
      await fetchSupplyPricesForProduct(productName);
      if (shouldRecomputeBase) {
        try {
          await fetchProductPrices();
        } catch (err) {
          console.error("Failed to refresh product pricing:", err);
        }
      }
    } catch (err) {
      setSupplyRowErrors((prev) => ({
        ...prev,
        [rowKey]:
          err instanceof Error ? err.message : "Không thể cập nhật giá nguồn.",
      }));
    } finally {
      setSavingSupplyRows((prev) => {
        const next = { ...prev };
        delete next[rowKey];
        return next;
      });
    }
  };

  const handleStartAddSupplierRow = (productId: number) => {
    setNewSupplyRows((prev) => {
      if (prev[productId]) return prev;
      return {
        ...prev,
        [productId]: {
          sourceName: "",
          sourceId: null,
          useCustomName: false,
          price: "",
          error: null,
          isSaving: false,
        },
      };
    });
  };

  const handleNewSupplierInputChange = (
    productId: number,
    field: "sourceName" | "price" | "sourceId" | "useCustomName",
    value: string | number | boolean | null
  ) => {
    let next: string | number | boolean | null = value;
    if (field === "price") {
      next = formatVndInput(String(value ?? ""));
    } else if (field === "sourceId") {
      const numeric = Number(value);
      next =
        value === null || Number.isNaN(numeric) || !Number.isFinite(numeric)
          ? null
          : numeric;
    } else if (field === "useCustomName") {
      next = Boolean(value);
    } else {
      next = String(value ?? "");
    }

    setNewSupplyRows((prev) => {
      const current = prev[productId];
      if (!current) return prev;
      const nextRow: NewSupplyRowState = {
        ...current,
        [field]: next as any,
        error: null,
      };

      if (field === "useCustomName") {
        if (next) {
          nextRow.sourceId = null;
          nextRow.sourceName = "";
        } else if (!nextRow.sourceName && current.sourceName) {
          nextRow.sourceName = current.sourceName;
        }
      }

      return {
        ...prev,
        [productId]: nextRow,
      };
    });
  };

  const handleCancelAddSupplierRow = (productId: number) => {
    setNewSupplyRows((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const handleConfirmAddSupplierRow = async (product: ProductPricingRow) => {
    const current = newSupplyRows[product.id];
    if (!current) return;
    const trimmedName = current.sourceName.trim();
    const resolvedSourceId =
      current.useCustomName || current.sourceId === null
        ? null
        : current.sourceId;
    const parsedPrice = Number((current.price || "").replace(/\D+/g, ""));
    if (!trimmedName) {
      setNewSupplyRows((prev) => ({
        ...prev,
        [product.id]: {
          ...current,
          error: "Vui lòng chọn hoặc nhập tên nguồn hợp lệ.",
        },
      }));
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setNewSupplyRows((prev) => ({
        ...prev,
        [product.id]: {
          ...current,
          error: "Giá nhập phải lớn hơn 0.",
        },
      }));
      return;
    }

    setNewSupplyRows((prev) => ({
      ...prev,
      [product.id]: { ...current, isSaving: true, error: null },
    }));

    try {
      const response = await fetch(
        `${apiBase}${API_ENDPOINTS.CREATE_SUPPLY_PRICE(product.id)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sourceName: trimmedName,
            sourceId: resolvedSourceId,
            price: parsedPrice,
          }),
          credentials: "include",
        }
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Không thể thêm nguồn mới.");
      }
      const productKey = normalizeProductKey(product.sanPhamRaw);
      const responseSourceId = Number(payload?.sourceId);
      const resolvedSourceIdValue =
        typeof resolvedSourceId === "number" &&
        Number.isFinite(resolvedSourceId) &&
        resolvedSourceId > 0
          ? resolvedSourceId
          : null;
      const fallbackSourceId = resolvedSourceIdValue ?? Date.now();
      const finalSourceId =
        Number.isFinite(responseSourceId) && responseSourceId > 0
          ? responseSourceId
          : fallbackSourceId;
      const normalizedPrice = Number.isFinite(Number(payload?.price))
        ? Number(payload?.price)
        : parsedPrice;
      let nextHighestPrice: number | null = null;
      let shouldRecomputeBase = false;
      setSupplyPriceMap((prev) => {
        const currentState = prev[productKey];
        const currentItems = currentState?.items ?? [];
        const hasExistingRow = currentItems.some(
          (supplier) => supplier.sourceId === finalSourceId
        );
        const nextItems = sortSupplyItems(
          hasExistingRow
            ? currentItems.map((supplier) =>
                supplier.sourceId === finalSourceId
                  ? { ...supplier, price: normalizedPrice }
                  : supplier
              )
            : [
                ...currentItems,
                {
                  sourceId: finalSourceId,
                  sourceName: trimmedName,
                  price: normalizedPrice,
                  lastOrderDate: null,
                },
              ]
        );
        const previousMax = computeHighestSupplyPrice(currentItems, null);
        const updatedMax = computeHighestSupplyPrice(nextItems, null);
        const differenceDetected =
          typeof previousMax === "number" && typeof updatedMax === "number"
            ? Math.abs(updatedMax - previousMax) > 0.00001
            : previousMax !== updatedMax;

        if (differenceDetected) {
          shouldRecomputeBase = true;
        }
        nextHighestPrice = updatedMax;

        return {
          ...prev,
          [productKey]: {
            loading: currentState?.loading ?? false,
            error: null,
            items: nextItems,
          },
        };
      });
      if (shouldRecomputeBase) {
        setProductPrices((prev) =>
          prev.map((row) =>
            row.id === product.id
              ? applyBasePriceToProduct(row, nextHighestPrice)
              : row
          )
        );
      }
      await fetchSupplyPricesForProduct(product.sanPhamRaw);
      handleCancelAddSupplierRow(product.id);
      if (shouldRecomputeBase) {
        try {
          await fetchProductPrices();
        } catch (err) {
          console.error("Failed to refresh product pricing:", err);
        }
      }
    } catch (err) {
      setNewSupplyRows((prev) => ({
        ...prev,
        [product.id]: {
          ...current,
          isSaving: false,
          error:
            err instanceof Error ? err.message : "Không thể thêm nguồn mới.",
        },
      }));
    }
  };

  const handleDeleteSupplyRow = async (
    productId: number,
    sourceId: number,
    productKey: string,
    productName: string
  ) => {
    const rowKey = buildSupplyRowKey(productId, sourceId);
    setSupplyRowErrors((prev) => ({ ...prev, [rowKey]: null }));
    setSavingSupplyRows((prev) => ({ ...prev, [rowKey]: true }));
    let nextHighestPrice: number | null = null;
    let shouldRecomputeBase = false;

    try {
      const response = await fetch(
        `${apiBase}${API_ENDPOINTS.DELETE_SUPPLY_PRICE(productId, sourceId)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Không thể xóa nguồn này.");
      }

      setSupplyPriceMap((prev) => {
        const currentState = prev[productKey];
        if (!currentState) return prev;
        const nextItems = sortSupplyItems(
          currentState.items.filter((supplier) => supplier.sourceId !== sourceId)
        );
        const previousMax = computeHighestSupplyPrice(currentState.items, null);
        const updatedMax = computeHighestSupplyPrice(nextItems, null);
        const differenceDetected =
          typeof previousMax === "number" && typeof updatedMax === "number"
            ? Math.abs(updatedMax - previousMax) > 0.00001
            : previousMax !== updatedMax;

        if (differenceDetected) {
          shouldRecomputeBase = true;
        }
        nextHighestPrice = updatedMax;

        return {
          ...prev,
          [productKey]: {
            ...currentState,
            items: nextItems,
          },
        };
      });

      clearSupplyRowState(rowKey);

      if (shouldRecomputeBase) {
        setProductPrices((prev) =>
          prev.map((product) =>
            product.id === productId
              ? applyBasePriceToProduct(product, nextHighestPrice)
              : product
          )
        );
      }

      await fetchSupplyPricesForProduct(productName);
      if (shouldRecomputeBase) {
        try {
          await fetchProductPrices();
        } catch (err) {
          console.error("Failed to refresh product pricing:", err);
        }
      }
    } catch (err) {
      setSupplyRowErrors((prev) => ({
        ...prev,
        [rowKey]:
          err instanceof Error ? err.message : "Không thể xóa nguồn này.",
      }));
    } finally {
      setSavingSupplyRows((prev) => {
        const next = { ...prev };
        delete next[rowKey];
        return next;
      });
    }
  };

  return {
    supplyPriceMap,
    editingSupplyRows,
    supplyPriceDrafts,
    savingSupplyRows,
    supplyRowErrors,
    newSupplyRows,
    fetchSupplyPricesForProduct,
    handleStartEditingSupply,
    handleSupplyInputChange,
    handleCancelSupplyEditing,
    handleConfirmSupplyEditing,
    handleStartAddSupplierRow,
    handleNewSupplierInputChange,
    handleCancelAddSupplierRow,
    handleConfirmAddSupplierRow,
    handleDeleteSupplyRow,
  };
};
