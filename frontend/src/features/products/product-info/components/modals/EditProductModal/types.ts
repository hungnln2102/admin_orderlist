import { MergedProduct } from "../../utils/productInfoHelpers";

export type EditFormState = {
  productId: string;
  productName: string;
  packageName: string;
  /** id bản ghi product.desc_variant — lưu vào variant.id_desc khi bấm Lưu. */
  descVariantId: number | null;
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
