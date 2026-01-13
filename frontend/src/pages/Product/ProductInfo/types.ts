import { MergedProduct } from "./utils/productInfoHelpers";

export type CategoryRow = {
  key: string;
  packageName: string;
  categories: MergedProduct["categories"];
  items: MergedProduct[];
};
