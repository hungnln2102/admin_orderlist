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
  MIN_PROMO_RATIO,
  formatVndDisplay,
  getDiscountRatioInput,
  getMarginRatioInput,
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

const formatPercent = (ratio: number): string =>
  `${(ratio * 100).toFixed(2).replace(/\.?0+$/, "")}%`;

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
        ? String(product.pctCtv)
        : "",
    pctKhach:
      product.pctKhach !== null && product.pctKhach !== undefined
        ? String(product.pctKhach)
        : "",
    pctPromo:
      product.pctPromo !== null && product.pctPromo !== undefined
        ? String(product.pctPromo)
        : "",
    pctStu:
      product.pctStu !== null && product.pctStu !== undefined
        ? String(product.pctStu)
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
        .map((row: any) => ({
          bin: row?.bin?.toString().trim() ?? "",
          name: row?.bank_name?.toString().trim() ?? row?.name ?? "",
        }))
        .filter((item) => item.bin && item.name)
    : [];
}

export function normalizeSupplierOptions(payload: any): SupplierOption[] {
  const items = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload)
      ? payload
      : [];

  const normalized = items
    .map((item: any) => {
      const idRaw = item?.id ?? item?.sourceId ?? item?.source_id;
      const idValue =
        typeof idRaw === "number" && Number.isFinite(idRaw)
          ? idRaw
          : Number.isFinite(Number(idRaw))
            ? Number(idRaw)
            : null;
      const name =
        item?.supplier_name ??
        item?.source_name ??
        item?.name ??
        item?.sourceName ??
        item?.source ??
        "";

      return {
        id: idValue ?? null,
        name: (name || "").trim(),
        numberBank:
          item?.number_bank ?? item?.numberBank ?? item?.bankNumber ?? "",
        binBank: item?.bin_bank ?? item?.binBank ?? item?.bankBin ?? "",
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

export function parseJsonResponseText(rawBody: string): any | null {
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
    const stuMargin = getMarginRatioInput(nextPctStuRaw);
    if (stuMargin === null) {
      return {
        ok: false,
        error:
          "Thiết lập Sinh viên không hợp lệ. Biên độ phải nhỏ hơn 100% (như Giá Khách).",
      };
    }
    nextPctStu = stuMargin;
  }
  const nextPctCtvMargin = getMarginRatioInput(nextPctCtv);
  const nextPctKhachMargin = getMarginRatioInput(nextPctKhach);
  const nextPctPromoRatio =
    nextPctPromo !== null ? getDiscountRatioInput(nextPctPromo) : null;

  if (nextPctCtv === null || nextPctCtv < 0) {
    return {
      ok: false,
      error: "Tỷ giá CTV không được nhỏ hơn 0",
    };
  }

  if (nextPctKhach === null || nextPctKhach < 0) {
    return {
      ok: false,
      error: "Tỷ giá Khách không được nhỏ hơn 0",
    };
  }

  if (nextPctCtvMargin === null) {
    return {
      ok: false,
      error: "Thiết lập CTV không hợp lệ. Biên độ phải nhỏ hơn 100%.",
    };
  }

  if (nextPctKhachMargin === null) {
    return {
      ok: false,
      error: "Thiết lập Khách không hợp lệ. Biên độ phải nhỏ hơn 100%.",
    };
  }

  if (nextPctPromo !== null) {
    if (nextPctPromo < MIN_PROMO_RATIO) {
      return {
        ok: false,
        error: "Tỷ lệ khuyến mãi không được âm.",
      };
    }

    if (nextPctPromoRatio === null) {
      return {
        ok: false,
        error: "Tỷ lệ khuyến mãi phải nhỏ hơn 100%.",
      };
    }

    const promoHeadroom = Math.max(0, nextPctKhachMargin);
    if (promoHeadroom === 0 && nextPctPromoRatio > 0) {
      return {
        ok: false,
        error: "Khuyến mãi không áp dụng khi biên độ Khách đang ở mức 0%.",
      };
    }

    if (nextPctPromoRatio > promoHeadroom) {
      return {
        ok: false,
        error: `Tỷ lệ khuyến mãi không được vượt ${formatPercent(
          promoHeadroom
        )} theo biên độ Khách.`,
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
  suppliers: CreateSupplierEntry[]
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
    const stuMarginCreate = getMarginRatioInput(pctStuRaw);
    if (stuMarginCreate === null) {
      return {
        ok: false,
        error:
          "Thiết lập Sinh viên không hợp lệ. Biên độ phải nhỏ hơn 100% (như Giá Khách).",
      };
    }
    pctStuValue = stuMarginCreate;
  }
  const pctCtvMargin =
    pctCtvValue !== null ? getMarginRatioInput(pctCtvValue) : null;
  const pctKhachMargin =
    pctKhachValue !== null ? getMarginRatioInput(pctKhachValue) : null;
  const pctPromoRatio =
    pctPromoValue !== null ? getDiscountRatioInput(pctPromoValue) : null;

  if (!trimmedSanPham) {
    return {
      ok: false,
      error: "Vui lòng nhập mã sản phẩm",
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
      error: "Tỷ giá CTV không được nhỏ hơn 0.",
    };
  }

  if (pctKhachValue !== null && pctKhachValue < 0) {
    return {
      ok: false,
      error: "Tỷ giá khách không được nhỏ hơn 0.",
    };
  }

  if (pctCtvValue !== null && pctCtvMargin === null) {
    return {
      ok: false,
      error: "Thiết lập CTV không hợp lệ. Biên độ phải nhỏ hơn 100%.",
    };
  }

  if (pctKhachValue !== null && pctKhachMargin === null) {
    return {
      ok: false,
      error: "Thiết lập Khách không hợp lệ. Biên độ phải nhỏ hơn 100%.",
    };
  }

  if (pctPromoValue !== null) {
    if (pctPromoValue < MIN_PROMO_RATIO) {
      return {
        ok: false,
        error: "Tỷ lệ khuyến mãi không được âm.",
      };
    }

    if (pctPromoRatio === null) {
      return {
        ok: false,
        error: "Tỷ lệ khuyến mãi phải nhỏ hơn 100%.",
      };
    }

    if (pctKhachValue !== null && pctKhachMargin !== null) {
      const promoHeadroom = Math.max(0, pctKhachMargin);
      if (promoHeadroom === 0 && pctPromoRatio > 0) {
        return {
          ok: false,
          error: "Khuyến mãi không áp dụng khi biên độ Khách đang ở mức 0%.",
        };
      }

      if (pctPromoRatio > promoHeadroom) {
        return {
          ok: false,
          error: `Tỷ lệ khuyến mãi không được vượt ${formatPercent(
            promoHeadroom
          )} theo biên độ Khách.`,
        };
      }
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
