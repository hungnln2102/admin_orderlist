import React, { useMemo, useState } from "react";
import { ProductInfoHeader } from "./components/ProductInfoHeader";
import { ViewModeToggle } from "./components/ViewModeToggle";
import { ProductView } from "./views/ProductView";
import { CategoryView } from "./views/CategoryView";
import { CreateCategoryModal } from "./components/CreateCategoryModal";
import { EditCategoryModal } from "./components/EditCategoryModal";
import { EditProductModal } from "./components/EditProductModal";
import { useCategoryCreate } from "./hooks/useCategoryCreate";
import { useCategoryEdit } from "./hooks/useCategoryEdit";
import { useCategoryOptions } from "./hooks/useCategoryOptions";
import { useProductEdit } from "./hooks/useProductEdit";
import { useProductInfo } from "./hooks/useProductInfo";
import { getCategoryColor } from "./utils/categoryColors";
import { buildCategoryRows } from "./utils/buildCategoryRows";
import { PAGE_SIZE } from "./utils/productInfoHelpers";
import "./ProductInfo.css";

/**
 * ProductInfo Component (Refactored)
 * Manages product and category information
 * Reduced from 208 lines to ~90 lines by extracting views and components
 */
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

  const [viewMode, setViewMode] = useState<"products" | "categories">("products");

  const {
    categoryOptions,
    loading: categoryLoading,
    error: categoryError,
    reload: loadCategories,
  } = useCategoryOptions();

  const {
    editingProduct,
    editSaving,
    openEditForm,
    closeEditForm,
    handleSaveEdit,
    clearEditingProduct,
  } = useProductEdit({ setProductDescs, setError });

  const {
    editingCategoryGroup,
    categoryPackageName,
    setCategoryPackageName,
    categoryImageUrl,
    setCategoryImageUrl,
    selectedCategoryIds,
    categorySaving,
    categorySaveError,
    openCategoryEdit,
    closeCategoryEdit,
    handleToggleCategory,
    handleSaveCategory,
  } = useCategoryEdit({
    categoryOptions,
    reloadProducts: reload,
    onOpenEdit: clearEditingProduct,
  });

  const {
    createCategoryOpen,
    newCategoryName,
    setNewCategoryName,
    newCategoryColor,
    setNewCategoryColor,
    creatingCategory,
    createCategoryError,
    openCreateCategory,
    closeCreateCategory,
    handleCreateCategory,
  } = useCategoryCreate({ reloadCategories: loadCategories });

  const categoryRows = useMemo(
    () => buildCategoryRows(mergedProducts),
    [mergedProducts]
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
        onAddCategoryClick={openCreateCategory}
      />

      {error && (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />

      {viewMode === "products" ? (
        <ProductView
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
      ) : (
        <CategoryView
          categoryRows={categoryRows}
          loading={loading}
          onEditCategory={openCategoryEdit}
          getCategoryColor={getCategoryColor}
        />
      )}

      {createCategoryOpen && (
        <CreateCategoryModal
          open={createCategoryOpen}
          name={newCategoryName}
          color={newCategoryColor}
          saving={creatingCategory}
          error={createCategoryError}
          onNameChange={setNewCategoryName}
          onColorChange={setNewCategoryColor}
          onClose={closeCreateCategory}
          onSave={handleCreateCategory}
        />
      )}

      {editingCategoryGroup && (
        <EditCategoryModal
          open={Boolean(editingCategoryGroup)}
          packageName={categoryPackageName}
          imageUrl={categoryImageUrl}
          categoryOptions={categoryOptions}
          selectedCategoryIds={selectedCategoryIds}
          saving={categorySaving || categoryLoading}
          error={categorySaveError || categoryError}
          onPackageNameChange={setCategoryPackageName}
          onImageUrlChange={setCategoryImageUrl}
          onToggleCategory={handleToggleCategory}
          onClose={closeCategoryEdit}
          onSave={handleSaveCategory}
        />
      )}

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
