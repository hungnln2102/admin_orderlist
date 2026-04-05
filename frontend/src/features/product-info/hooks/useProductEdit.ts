import { useCallback, useState } from "react";
import {
  ProductDescription,
  saveProductDescription,
} from "@/lib/productDescApi";
import { updateProductPrice } from "@/lib/productPricesApi";
import { normalizeErrorMessage } from "@/lib/textUtils";
import { SavePayload } from "../components/EditProductModal";
import {
  MergedProduct,
  normalizeProductKey,
} from "../utils/productInfoHelpers";

type UseProductEditParams = {
  setProductDescs: React.Dispatch<React.SetStateAction<ProductDescription[]>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  reloadProducts: () => Promise<void>;
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
  reloadProducts,
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

      const pid = form.productId.trim() || editingProduct.productId || "";
      const descId =
        form.descVariantId != null &&
        Number.isFinite(form.descVariantId) &&
        form.descVariantId > 0
          ? form.descVariantId
          : null;

      try {
        let saved: ProductDescription | null = null;
        if (descId != null && pid) {
          saved = await saveProductDescription({
            productId: pid,
            descVariantId: descId,
          });
        }

        const priceId = form.priceId ?? editingProduct.priceId;
        if (priceId && Number.isFinite(priceId)) {
          await updateProductPrice(priceId, {
            packageName: form.packageName.trim() || null,
            packageProduct: form.productName.trim() || null,
            variantImageUrl: form.imageUrl.trim() || null,
          });
        }

        if (saved) {
          const rulesHtml =
            saved.rulesHtml || saved.rules || "";
          const descriptionHtml =
            saved.descriptionHtml || saved.description || "";
          const updated: MergedProduct = {
            ...editingProduct,
            id: saved.id || editingProduct.id,
            descVariantId: saved.descVariantId ?? descId,
            productId: saved.productId,
            productName:
              form.productName ||
              editingProduct.productName ||
              null,
            packageName: form.packageName || editingProduct.packageName,
            rules: saved.rules || "",
            rulesHtml,
            description: saved.description || "",
            descriptionHtml,
            shortDescription:
              saved.shortDescription ?? editingProduct.shortDescription ?? null,
            imageUrl: saved.imageUrl || form.imageUrl || null,
          };

          setProductDescs((prev) => {
            const targetKey = normalizeProductKey(
              saved.productId || editingProduct.productId || ""
            );
            const idx = prev.findIndex(
              (p) => normalizeProductKey(p.productId || "") === targetKey
            );
            if (idx === -1) {
              return [
                ...prev,
                {
                  id: saved.id || editingProduct.id,
                  descVariantId: saved.descVariantId ?? descId,
                  productId: saved.productId,
                  productName: updated.productName || null,
                  rules: saved.rules || "",
                  rulesHtml,
                  description: saved.description || "",
                  descriptionHtml,
                  shortDescription: saved.shortDescription ?? null,
                  imageUrl: saved.imageUrl || null,
                },
              ];
            }
            const next = [...prev];
            next[idx] = {
              ...next[idx],
              id: saved.id || next[idx].id,
              descVariantId: saved.descVariantId ?? descId,
              productId: saved.productId,
              productName: updated.productName || next[idx].productName || null,
              rules: saved.rules || "",
              rulesHtml,
              description: saved.description || "",
              descriptionHtml,
              shortDescription: saved.shortDescription ?? null,
              imageUrl: saved.imageUrl || null,
            };
            return next;
          });
        }

        setEditingProduct(null);

        await reloadProducts();
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
    [editingProduct, setProductDescs, setError, reloadProducts]
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
