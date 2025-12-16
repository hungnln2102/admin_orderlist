import React, { useCallback, useState } from "react";
import { saveProductDescription } from "../../../lib/productDescApi";
import { normalizeErrorMessage } from "../../../lib/textUtils";
import { ProductInfoHeader } from "./components/ProductInfoHeader";
import { ProductTable } from "./components/ProductTable";
import {
  EditProductModal,
  SavePayload,
} from "./components/EditProductModal";
import { useProductInfo } from "./hooks/useProductInfo";
import {
  MergedProduct,
  PAGE_SIZE,
  stripDurationSuffix,
} from "./utils/productInfoHelpers";
import "./ProductInfo.css";

const ProductInfo: React.FC = () => {
  const {
    data: {
      mergedProducts,
      pagedProducts,
      loading,
      error,
      currentPage,
      expandedId,
      searchTerm,
    },
    actions: {
      handleSearchChange,
      setCurrentPage,
      setExpandedId,
      reload,
      setProductDescs,
      setError,
    },
  } = useProductInfo();

  const [editingProduct, setEditingProduct] = useState<MergedProduct | null>(
    null
  );
  const [editSaving, setEditSaving] = useState(false);

  const openEditForm = (item: MergedProduct) => {
    setEditingProduct(item);
  };

  const closeEditForm = () => {
    setEditingProduct(null);
    setEditSaving(false);
  };

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
            stripDurationSuffix(form.productName || editingProduct.productName || "") ||
            editingProduct.productName,
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
            (p) => stripDurationSuffix(p.productId || "").toLowerCase() === targetKey
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
            {
              fallback: "Không thể lưu thông tin sản phẩm.",
            }
          )
        );
      } finally {
        setEditSaving(false);
      }
    },
    [editingProduct, setProductDescs, setError]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-white">Thông Tin Sản Phẩm</h1>
        <p className="text-sm text-white/70">
          Đồng bộ với bảng product_desc trong database.
        </p>
      </div>

      <ProductInfoHeader
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onAddClick={reload}
      />

      {error && (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <ProductTable
        products={pagedProducts}
        mergedTotal={mergedProducts.length}
        loading={loading}
        currentPage={currentPage}
        pageSize={PAGE_SIZE}
        onPageChange={setCurrentPage}
        expandedId={expandedId}
        onToggleExpand={setExpandedId}
        onEdit={openEditForm}
      />

      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          saving={editSaving}
          onClose={closeEditForm}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
};

export default ProductInfo;
