import type {
  CreateProductFormState,
  DeleteProductState,
  ProductEditFormState,
  ProductPricingRow,
} from "../../types";
import { formatVndDisplay } from "../../priceFormatters";

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
