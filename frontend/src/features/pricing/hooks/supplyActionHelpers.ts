import type {
  NewSupplyRowState,
  ProductPricingRow,
  SupplyPriceItem,
  SupplyPriceState,
} from "../types";
import {
  applyBasePriceToProduct,
  computeHighestSupplyPrice,
  dedupeSupplyItems,
  formatVndInput,
  hasValidPromoRatio,
  normalizeProductKey,
  sortSupplyItems,
} from "../utils";

export type SupplyDraftField =
  | "sourceName"
  | "price"
  | "sourceId"
  | "useCustomName";

type PriceValidationResult =
  | {
      ok: true;
      parsedPrice: number;
    }
  | {
      ok: false;
      error: string;
    };

type NewSupplyValidationResult =
  | {
      ok: true;
      trimmedName: string;
      resolvedSourceId: number | null;
      parsedPrice: number;
    }
  | {
      ok: false;
      error: string;
    };

type SupplyStateMutationResult = {
  nextState: SupplyPriceState;
  nextHighestPrice: number | null;
  shouldRecomputeBase: boolean;
};

export function mapSupplyPriceResponse(payload: unknown): {
  items: SupplyPriceItem[];
  highestPrice: number | null;
} {
  const mappedItems: SupplyPriceItem[] = Array.isArray(payload)
    ? payload.map((entry: any, index: number) => ({
        sourceId: Number.isFinite(Number(entry?.sourceId ?? entry?.source_id))
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
  return {
    items,
    highestPrice: computeHighestSupplyPrice(items, null),
  };
}

export function reconcileFetchedProductPrices(
  rows: ProductPricingRow[],
  productKey: string,
  highestPrice: number
) {
  let changed = false;

  const nextRows = rows.map((row) => {
    if (normalizeProductKey(row.sanPhamRaw) !== productKey) return row;

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

    if (hasSameBase && hasWholesale && hasRetail && (!promoNeeded || hasPromo)) {
      return row;
    }

    changed = true;
    return applyBasePriceToProduct(
      { ...row, baseSupplyPrice: highestPrice },
      highestPrice
    );
  });

  return changed ? nextRows : rows;
}

export function createEmptyNewSupplyRow(): NewSupplyRowState {
  return {
    sourceName: "",
    sourceId: null,
    useCustomName: false,
    price: "",
    error: null,
    isSaving: false,
  };
}

export function updateNewSupplyDraft(
  current: NewSupplyRowState,
  field: SupplyDraftField,
  value: string | number | boolean | null
): NewSupplyRowState {
  let nextValue: string | number | boolean | null = value;

  if (field === "price") {
    nextValue = formatVndInput(String(value ?? ""));
  } else if (field === "sourceId") {
    const numericValue = Number(value);
    nextValue =
      value === null ||
      Number.isNaN(numericValue) ||
      !Number.isFinite(numericValue)
        ? null
        : numericValue;
  } else if (field === "useCustomName") {
    nextValue = Boolean(value);
  } else {
    nextValue = String(value ?? "");
  }

  const nextRow: NewSupplyRowState = {
    ...current,
    [field]: nextValue as never,
    error: null,
  };

  if (field === "useCustomName") {
    if (nextValue) {
      nextRow.sourceId = null;
      nextRow.sourceName = "";
    } else if (!nextRow.sourceName && current.sourceName) {
      nextRow.sourceName = current.sourceName;
    }
  }

  return nextRow;
}

export function validateEditedSupplyDraft(
  rawValue: string | undefined
): PriceValidationResult {
  const trimmedValue = rawValue?.toString().trim() ?? "";
  if (!trimmedValue) {
    return {
      ok: false,
      error: "Vui lòng nhập giá hợp lệ.",
    };
  }

  const parsedPrice = Number(trimmedValue.replace(/\D+/g, ""));
  if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
    return {
      ok: false,
      error: "Giá nhập không được thấp hơn 0.",
    };
  }

  return {
    ok: true,
    parsedPrice,
  };
}

export function validateNewSupplyDraft(
  current: NewSupplyRowState
): NewSupplyValidationResult {
  const trimmedName = current.sourceName.trim();
  const resolvedSourceId =
    current.useCustomName || current.sourceId === null ? null : current.sourceId;
  const parsedPrice = Number((current.price || "").replace(/\D+/g, ""));

  if (!trimmedName) {
    return {
      ok: false,
      error: "Vui lòng chọn hoặc nhập tên nguồn hợp lệ.",
    };
  }

  if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
    return {
      ok: false,
      error: "Giá nhập phải lớn hơn 0.",
    };
  }

  return {
    ok: true,
    trimmedName,
    resolvedSourceId,
    parsedPrice,
  };
}

export function buildEditedSupplyState(
  currentState: SupplyPriceState,
  sourceId: number,
  normalizedPrice: number
): SupplyStateMutationResult {
  const previousMax = computeHighestSupplyPrice(currentState.items, null);
  const currentSupplier = currentState.items.find(
    (supplier) => supplier.sourceId === sourceId
  );
  const previousPrice =
    typeof currentSupplier?.price === "number" ? currentSupplier.price : null;
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
  const priceChanged = previousPrice === null || previousPrice !== normalizedPrice;
  const validUpdatedMax =
    typeof updatedMax === "number" &&
    Number.isFinite(updatedMax) &&
    updatedMax > 0;

  let nextHighestPrice: number | null = null;
  let shouldRecomputeBase = false;

  if (validUpdatedMax) {
    nextHighestPrice = updatedMax;
    if (updatedMax !== previousMax || (wasHighestSupplier && priceChanged)) {
      shouldRecomputeBase = true;
    }
  } else if (wasHighestSupplier && priceChanged) {
    nextHighestPrice = updatedMax ?? null;
    shouldRecomputeBase = true;
  }

  return {
    nextState: {
      ...currentState,
      items: nextItems,
    },
    nextHighestPrice,
    shouldRecomputeBase,
  };
}

export function buildAddedSupplyState(
  currentState: SupplyPriceState | undefined,
  finalSourceId: number,
  trimmedName: string,
  normalizedPrice: number
): SupplyStateMutationResult {
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
  const shouldRecomputeBase =
    typeof previousMax === "number" && typeof updatedMax === "number"
      ? Math.abs(updatedMax - previousMax) > 0.00001
      : previousMax !== updatedMax;

  return {
    nextState: {
      loading: currentState?.loading ?? false,
      error: null,
      items: nextItems,
      productName: currentState?.productName,
    },
    nextHighestPrice: updatedMax,
    shouldRecomputeBase,
  };
}

export function buildDeletedSupplyState(
  currentState: SupplyPriceState,
  sourceId: number
): SupplyStateMutationResult {
  const nextItems = sortSupplyItems(
    currentState.items.filter((supplier) => supplier.sourceId !== sourceId)
  );
  const previousMax = computeHighestSupplyPrice(currentState.items, null);
  const updatedMax = computeHighestSupplyPrice(nextItems, null);
  const shouldRecomputeBase =
    typeof previousMax === "number" && typeof updatedMax === "number"
      ? Math.abs(updatedMax - previousMax) > 0.00001
      : previousMax !== updatedMax;

  return {
    nextState: {
      ...currentState,
      items: nextItems,
    },
    nextHighestPrice: updatedMax,
    shouldRecomputeBase,
  };
}

export function omitStringKey<T>(record: Record<string, T>, key: string) {
  const next = { ...record };
  delete next[key];
  return next;
}

export function omitNumberKey<T>(record: Record<number, T>, key: number) {
  const next = { ...record };
  delete next[key];
  return next;
}
