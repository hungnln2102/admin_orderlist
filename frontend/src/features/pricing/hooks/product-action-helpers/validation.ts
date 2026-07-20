import type {
  CreateProductFormState,
  CreateSupplierEntry,
  ProductEditFormState,
  ProductPricingRow,
} from "../../types";
import { normalizeProductKey } from "../../priceLabels";
import { parseBasePriceInput, parseCurrencyInput } from "./parsers";
import type {
  CreateProductValidationResult,
  ProductEditValidationResult,
  SupplierPayload,
} from "./types";

export const applyBasePriceToProduct = (product: ProductPricingRow, basePrice: number | null): ProductPricingRow => {
  if (typeof basePrice !== "number" || !Number.isFinite(basePrice) || basePrice <= 0) {
    return product;
  }

  return {
    ...product,
    baseSupplyPrice: basePrice,
  };
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

  const nextPctCtv = parseCurrencyInput(form.pctCtv);
  const nextPctKhach = parseCurrencyInput(form.pctKhach);
  const nextPctPromo = parseCurrencyInput(form.pctPromo);
  const nextPctStuRaw = parseCurrencyInput(form.pctStu);
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

  if (nextPctPromo !== null && nextPctPromo < 0) {
    return {
      ok: false,
      error: "Giá Khuyến mãi không được nhỏ hơn 0.",
    };
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

const normalizeSupplierPayloads = (
  suppliers: CreateSupplierEntry[]
): SupplierPayload[] =>
  suppliers
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
  const pctCtvValue = parseCurrencyInput(form.pctCtv);
  const pctKhachValue = parseCurrencyInput(form.pctKhach);
  const pctPromoValue = parseCurrencyInput(form.pctPromo);
  const pctStuRaw = parseCurrencyInput(form.pctStu);
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

  if (pctPromoValue !== null && pctPromoValue < 0) {
    return {
      ok: false,
      error: "Giá Khuyến mãi không được nhỏ hơn 0.",
    };
  }

  const normalizedSuppliers = normalizeSupplierPayloads(suppliers);
  if (normalizedSuppliers.length === 0) {
    return {
      ok: false,
      error: "Vui lòng chọn hoặc nhập ít nhất một Nhà Cung Cấp và giá nhập.",
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
