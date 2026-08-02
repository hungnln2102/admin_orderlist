import type { NewSupplyRowState } from "../../types";
import { formatVndInput } from "../../priceFormatters";

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

