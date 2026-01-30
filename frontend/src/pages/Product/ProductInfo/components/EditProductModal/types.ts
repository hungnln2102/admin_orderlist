import { MergedProduct } from "../../utils/productInfoHelpers";

export type EditFormState = {
  productId: string;
  productName: string;
  packageName: string;
  rules: string;
  rulesHtml: string;
  description: string;
  descriptionHtml: string;
  imageUrl: string;
  priceId: number | null;
};

export type SavePayload = EditFormState;

export type EditProductModalProps = {
  product: MergedProduct | null;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: SavePayload) => void;
};

export type EditorContext = "rules" | "description";
