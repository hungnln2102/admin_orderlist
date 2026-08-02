export type SupplierPayload = {
  sourceId?: number;
  sourceName?: string;
  price: number | null;
  numberBank?: string;
  binBank?: string;
};

export type ProductEditValidationResult =
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

export type CreateProductValidationResult =
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
