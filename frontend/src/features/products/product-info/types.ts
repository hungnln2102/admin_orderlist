import { MergedProduct } from "./utils/productInfoHelpers";

export type CategoryRow = {
  key: string;
  /** `product.id` (schema) khi có; nhóm theo id thay vì theo tên. */
  catalogProductId: number | null;
  packageName: string;
  imageUrl?: string | null;
  categories: MergedProduct["categories"];
  items: MergedProduct[];
};
