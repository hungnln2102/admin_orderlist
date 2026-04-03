import { MergedProduct } from "./utils/productInfoHelpers";

export type CategoryRow = {
  key: string;
  packageName: string;
  imageUrl?: string | null;
  categories: MergedProduct["categories"];
  items: MergedProduct[];
};
