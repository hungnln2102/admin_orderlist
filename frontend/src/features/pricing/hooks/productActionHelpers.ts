import type {
  BankOption,
  CreateProductFormState,
  CreateSupplierEntry,
  DeleteProductState,
  ProductEditFormState,
  ProductPricingRow,
  SupplierOption,
} from "../types";
import {
  formatVndDisplay,
  normalizeProductKey,
  parseRatioInput,
} from "../utils";

export type SupplierPayload = {
  sourceId?: number;
  sourceName?: string;
  price: number | null;
  numberBank?: string;
  binBank?: string;
};

type ProductEditValidationResult =
  | {
      ok: true;
      normalizedPackageName: string;
      normalizedPackageProduct: string;
      normalizedSanPham: string;
      nextBasePrice: number | null;
      nextPctCtv: number;
      nextPctKhach: number;
      nextPctPromo: number | null;
      nextPctStu: number | null;
    }
  | {
      ok: false;
      error: string;
    };

type CreateProductValidationResult =
  | {
      ok: true;
      payload: {
        packageName?: string;
        packageProduct?: string;
        sanPham: string;
        basePrice: number | null;
        pctCtv?: number;
        pctKhach?: number;
        pctPromo?: number;
        pctStu: number | null;
        suppliers: SupplierPayload[];
      };
    }
  | {
      ok: false;
      error: string;
    };

export function isExistingSanPhamCode(
  existingRows: ProductPricingRow[],
  sanPham: string
): boolean {
  const code = normalizeProductKey(sanPham);
  if (!code) return false;
  return existingRows.some(
    (row) => normalizeProductKey(row.sanPhamRaw) === code
  );
}

const parseCurrencyInput = (value: string): number | null => {
  const digits = String(value ?? "").replace(/\D+/g, "");
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseBasePriceInput = (
  value: string,
  currency: ProductEditFormState["basePriceCurrency"]
): number | null => {
  if (currency === "VND") return parseCurrencyInput(value);

  const normalized = String(value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/,/g, ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

export function buildProductEditForm(
  product: ProductPricingRow
): ProductEditFormState {
  return {
    packageName: product.packageName || "",
    packageProduct: product.packageProduct || "",
    sanPham: product.sanPhamRaw || "",
    basePrice:
      product.basePrice !== null && product.basePrice !== undefined
        ? formatVndDisplay(product.basePrice)
        : "",
    basePriceCurrency: "VND",
    pctCtv:
      product.pctCtv !== null && product.pctCtv !== undefined
        ? formatVndDisplay(product.pctCtv)
        : "",
    pctKhach:
      product.pctKhach !== null && product.pctKhach !== undefined
        ? formatVndDisplay(product.pctKhach)
        : "",
    pctPromo:
      product.pctPromo !== null && product.pctPromo !== undefined
        ? formatVndDisplay(product.pctPromo)
        : "",
    pctStu:
      product.pctStu !== null &&
      product.pctStu !== undefined &&
      Number.isFinite(product.pctStu) &&
      product.pctStu > 0
        ? formatVndDisplay(product.pctStu)
        : "",
  };
}

export function createEmptyCreateForm(): CreateProductFormState {
  return {
    packageName: "",
    packageProduct: "",
    sanPham: "",
    basePrice: "",
    pctCtv: "",
    pctKhach: "",
    pctPromo: "",
    pctStu: "",
  };
}

export function createDeleteProductState(
  product: ProductPricingRow | null = null
): DeleteProductState {
  return {
    product,
    loading: false,
    error: null,
  };
}

export function normalizeBankOptions(payload: unknown): BankOption[] {
  return Array.isArray(payload)
    ? payload
        .map((row) => {
          const item =
            row && typeof row === "object" ? (row as Record<string, unknown>) : {};
          return {
            bin: String(item.bin ?? "").trim(),
            name: String(item.bank_name ?? item.name ?? "").trim(),
          };
        })
        .filter((item) => item.bin && item.name)
    : [];
}

export function normalizeSupplierOptions(payload: unknown): SupplierOption[] {
  const payloadObject =
    payload && typeof payload === "object"
      ? (payload as { items?: unknown[] })
      : undefined;
  const items = Array.isArray(payloadObject?.items)
    ? payloadObject.items
    : Array.isArray(payload)
      ? payload
      : [];

  const normalized = items
    .map((item) => {
      const row =
        item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const idRaw = row.id ?? row.sourceId ?? row.source_id;
      const idValue =
        typeof idRaw === "number" && Number.isFinite(idRaw)
          ? idRaw
          : Number.isFinite(Number(idRaw))
            ? Number(idRaw)
            : null;
      const name =
        row.supplier_name ??
        row.source_name ??
        row.name ??
        row.sourceName ??
        row.source ??
        "";

      return {
        id: idValue ?? null,
        name: String(name || "").trim(),
        numberBank:
          String(row.number_bank ?? row.numberBank ?? row.bankNumber ?? ""),
        binBank: String(row.bin_bank ?? row.binBank ?? row.bankBin ?? ""),
      } as SupplierOption;
    })
    .filter((option: SupplierOption) => option.name.length > 0);

  const deduped: SupplierOption[] = [];
  const seen = new Set<string>();

  for (const option of normalized) {
    const key =
      option.id !== null
        ? `id:${option.id}`
        : `name:${option.name.toLowerCase().trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(option);
  }

  return deduped;
}

export function parseJsonResponseText(rawBody: string): unknown {
  if (!rawBody) return null;

  try {
    return JSON.parse(rawBody);
  } catch {
    return null;
  }
}

export function updateCreateSupplierEntry(
  entry: CreateSupplierEntry,
  field: keyof Omit<CreateSupplierEntry, "id">,
  value: string
): CreateSupplierEntry {
  return {
    ...entry,
    [field]:
      field === "sourceId"
        ? value
          ? Number(value) || null
          : null
        : field === "useCustomName"
          ? value === "true"
          : value,
  };
}

export function applySelectedSupplierToEntry(
  entry: CreateSupplierEntry,
  selected: SupplierOption | null
): CreateSupplierEntry {
  return {
    ...entry,
    sourceId: selected?.id ?? null,
    sourceName: selected?.name ?? "",
    numberBank: selected?.numberBank ?? "",
    bankBin: selected?.binBank ?? "",
    useCustomName: false,
  };
}

export function enableCustomSupplierEntry(
  entry: CreateSupplierEntry
): CreateSupplierEntry {
  return {
    ...entry,
    sourceId: null,
    sourceName: "",
    numberBank: "",
    bankBin: "",
    useCustomName: true,
  };
}

export function validateProductEditForm(
  form: ProductEditFormState
): ProductEditValidationResult {
  const normalizedPackageName = form.packageName?.trim() ?? "";
  const normalizedPackageProduct = form.packageProduct?.trim() ?? "";
  const normalizedSanPham = form.sanPham?.trim() ?? "";
  const rawBasePrice = form.basePrice?.trim() ?? "";
  const nextBasePrice = parseBasePriceInput(rawBasePrice, form.basePriceCurrency);

  if (!normalizedSanPham) {
    return {
      ok: false,
      error: "Vui lòng nhập mã sản phẩm hợp lệ",
    };
  }

  if (rawBasePrice && (!nextBasePrice || nextBasePrice <= 0)) {
    return {
      ok: false,
      error: "Giá gốc phải lớn hơn 0",
    };
  }

  const nextPctCtv = parseRatioInput(form.pctCtv);
  const nextPctKhach = parseRatioInput(form.pctKhach);
  const nextPctPromo = parseRatioInput(form.pctPromo);
  const nextPctStuRaw = parseRatioInput(form.pctStu);
  let nextPctStu: number | null = null;
  const pctStuTrimmed = (form.pctStu ?? "").trim();
  if (pctStuTrimmed) {
    if (nextPctStuRaw === null || nextPctStuRaw < 0) {
      return {
        ok: false,
        error: "Giá Sinh Viên không hợp lệ (cùng định dạng với Giá Khách).",
      };
    }
    if (nextPctStuRaw === 0) {
      nextPctStu = null;
    } else {
      nextPctStu = nextPctStuRaw;
    }
  }

  if (nextPctCtv === null || nextPctCtv < 0) {
    return {
      ok: false,
      error: "Giá CTV không được nhỏ hơn 0",
    };
  }

  if (nextPctKhach === null || nextPctKhach < 0) {
    return {
      ok: false,
      error: "Giá Khách không được nhỏ hơn 0",
    };
  }

  if (nextPctPromo !== null) {
    if (nextPctPromo < 0) {
      return {
        ok: false,
        error: "Giá Khuyến mãi không được nhỏ hơn 0.",
      };
    }
  }

  return {
    ok: true,
    normalizedPackageName,
    normalizedPackageProduct,
    normalizedSanPham,
    nextBasePrice,
    nextPctCtv,
    nextPctKhach,
    nextPctPromo,
    nextPctStu,
  };
}

export function validateCreateProductForm(
  form: CreateProductFormState,
  suppliers: CreateSupplierEntry[],
  existingRows: ProductPricingRow[] = []
): CreateProductValidationResult {
  const trimmedPackage = form.packageName.trim();
  const trimmedProduct = form.packageProduct.trim();
  const trimmedSanPham = form.sanPham.trim();
  const trimmedBasePrice = form.basePrice.trim();
  const parsedBasePrice = parseCurrencyInput(trimmedBasePrice);
  const pctCtvValue = parseRatioInput(form.pctCtv);
  const pctKhachValue = parseRatioInput(form.pctKhach);
  const pctPromoValue = parseRatioInput(form.pctPromo);
  const pctStuRaw = parseRatioInput(form.pctStu);
  let pctStuValue: number | null = null;
  const pctStuTrimmedCreate = form.pctStu.trim();
  if (pctStuTrimmedCreate) {
    if (pctStuRaw === null || pctStuRaw < 0) {
      return {
        ok: false,
        error: "Giá Sinh Viên không hợp lệ (cùng định dạng với Giá Khách).",
      };
    }
    if (pctStuRaw === 0) {
      pctStuValue = null;
    } else {
      pctStuValue = pctStuRaw;
    }
  }

  if (!trimmedSanPham) {
    return {
      ok: false,
      error: "Vui lòng nhập mã sản phẩm",
    };
  }

  if (isExistingSanPhamCode(existingRows, trimmedSanPham)) {
    return {
      ok: false,
      error: "Mã sản phẩm đã tồn tại.",
    };
  }

  if (trimmedBasePrice && (!parsedBasePrice || parsedBasePrice <= 0)) {
    return {
      ok: false,
      error: "Giá gốc phải lớn hơn 0.",
    };
  }

  if (pctCtvValue !== null && pctCtvValue < 0) {
    return {
      ok: false,
      error: "Giá CTV không được nhỏ hơn 0.",
    };
  }

  if (pctKhachValue !== null && pctKhachValue < 0) {
    return {
      ok: false,
      error: "Giá Khách không được nhỏ hơn 0.",
    };
  }

  if (pctPromoValue !== null) {
    if (pctPromoValue < 0) {
      return {
        ok: false,
        error: "Giá Khuyến mãi không được nhỏ hơn 0.",
      };
    }
  }

  const normalizedSuppliers = suppliers
    .map<SupplierPayload | null>((entry) => {
      const name = (entry.sourceName || "").trim();
      const numericPrice = Number((entry.price || "").replace(/\D+/g, ""));
      const price =
        Number.isFinite(numericPrice) && numericPrice > 0 ? numericPrice : null;
      const rawSourceId = entry.sourceId;
      const sourceIdNum =
        rawSourceId !== null &&
        rawSourceId !== undefined &&
        Number.isFinite(Number(rawSourceId))
          ? Number(rawSourceId)
          : undefined;

      if (!sourceIdNum && !name) return null;

      return {
        sourceId: sourceIdNum,
        sourceName: name || undefined,
        price,
        numberBank: (entry.numberBank || "").trim() || undefined,
        binBank: (entry.bankBin || "").trim() || undefined,
      };
    })
    .filter(
      (entry): entry is SupplierPayload =>
        Boolean(
          entry &&
            (entry.sourceId !== undefined ||
              (entry.sourceName && entry.sourceName.length > 0))
        )
    );

  if (normalizedSuppliers.length === 0) {
    return {
      ok: false,
      error:
        "Vui lòng chọn hoặc nhập ít nhất một Nhà Cung Cấp và giá nhập.",
    };
  }

  return {
    ok: true,
      payload: {
        packageName: trimmedPackage || undefined,
        packageProduct: trimmedProduct || undefined,
        sanPham: trimmedSanPham,
        basePrice: parsedBasePrice,
        pctCtv: pctCtvValue ?? undefined,
        pctKhach: pctKhachValue ?? undefined,
        pctPromo: pctPromoValue ?? undefined,
        pctStu: pctStuValue,
      suppliers: normalizedSuppliers,
    },
  };
}
