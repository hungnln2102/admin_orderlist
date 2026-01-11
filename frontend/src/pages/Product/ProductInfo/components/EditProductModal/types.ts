import { MergedProduct } from "../../utils/productInfoHelpers";

export type EditFormState = {
  productId: string;
  productName: string;
  rules: string;
  rulesHtml: string;
  description: string;
  descriptionHtml: string;
  imageUrl: string;
};

export type SavePayload = EditFormState;

export type EditProductModalProps = {
  product: MergedProduct | null;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: SavePayload) => void;
};

export type EditorContext = "rules" | "description";
