import type { SupplyPriceState } from "../../types";
import {
  computeHighestSupplyPrice,
  sortSupplyItems,
} from "../../supplyPriceUtils";

type SupplyStateMutationResult = {
  nextState: SupplyPriceState;
  nextHighestPrice: number | null;
  shouldRecomputeBase: boolean;
};

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

