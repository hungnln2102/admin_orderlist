import { useCallback, useState } from "react";
import {
  ProductDescription,
  saveProductDescription,
} from "../../../../lib/productDescApi";
import { normalizeErrorMessage } from "../../../../lib/textUtils";
import { SavePayload } from "../components/EditProductModal";
import {
  MergedProduct,
  stripDurationSuffix,
} from "../utils/productInfoHelpers";

type UseProductEditParams = {
  setProductDescs: React.Dispatch<React.SetStateAction<ProductDescription[]>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
};

type UseProductEditResult = {
  editingProduct: MergedProduct | null;
  editSaving: boolean;
  openEditForm: (item: MergedProduct) => void;
  closeEditForm: () => void;
  handleSaveEdit: (form: SavePayload) => Promise<void>;
  clearEditingProduct: () => void;
};

export const useProductEdit = ({
  setProductDescs,
  setError,
}: UseProductEditParams): UseProductEditResult => {
  const [editingProduct, setEditingProduct] = useState<MergedProduct | null>(
    null
  );
  const [editSaving, setEditSaving] = useState(false);

  const openEditForm = useCallback((item: MergedProduct) => {
    setEditingProduct(item);
  }, []);

  const closeEditForm = useCallback(() => {
    setEditingProduct(null);
    setEditSaving(false);
  }, []);

  const clearEditingProduct = useCallback(() => {
    setEditingProduct(null);
  }, []);

  const handleSaveEdit = useCallback(
    async (form: SavePayload) => {
      if (!editingProduct) return;
      setEditSaving(true);
      const payload = {
        productId: form.productId.trim() || editingProduct.productId || "",
        rules: form.rulesHtml || form.rules,
        description: form.descriptionHtml || form.description,
        imageUrl: form.imageUrl || null,
      };

      try {
        const saved = await saveProductDescription(payload);
        const rulesHtml =
          saved.rulesHtml || saved.rules || form.rulesHtml || form.rules || "";
        const descriptionHtml =
          saved.descriptionHtml ||
          saved.description ||
          form.descriptionHtml ||
          form.description ||
          "";
        const updated: MergedProduct = {
          ...editingProduct,
          id: saved.id || editingProduct.id,
          productId: saved.productId,
          productName:
            stripDurationSuffix(
              form.productName || editingProduct.productName || ""
            ) || editingProduct.productName,
          rules: saved.rules || "",
          rulesHtml,
          description: saved.description || "",
          descriptionHtml,
          imageUrl: saved.imageUrl || form.imageUrl || null,
        };

        setProductDescs((prev) => {
          const targetKey = stripDurationSuffix(
            saved.productId || editingProduct.productId || ""
          ).toLowerCase();
          const idx = prev.findIndex(
            (p) =>
              stripDurationSuffix(p.productId || "").toLowerCase() === targetKey
          );
          if (idx === -1) {
            return [
              ...prev,
              {
                id: saved.id || editingProduct.id,
                productId: saved.productId,
                productName: updated.productName || null,
                rules: saved.rules || "",
                rulesHtml,
                description: saved.description || "",
                descriptionHtml,
                imageUrl: saved.imageUrl || null,
              },
            ];
          }
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            id: saved.id || next[idx].id,
            productId: saved.productId,
            productName: updated.productName || next[idx].productName || null,
            rules: saved.rules || "",
            rulesHtml,
            description: saved.description || "",
            descriptionHtml,
            imageUrl: saved.imageUrl || null,
          };
          return next;
        });

        setEditingProduct(null);
      } catch (err) {
        setError(
          normalizeErrorMessage(
            err instanceof Error ? err.message : String(err ?? ""),
            { fallback: "Không thể lưu thông tin sản phẩm." }
          )
        );
      } finally {
        setEditSaving(false);
      }
    },
    [editingProduct, setProductDescs, setError]
  );

  return {
    editingProduct,
    editSaving,
    openEditForm,
    closeEditForm,
    handleSaveEdit,
    clearEditingProduct,
  };
};
