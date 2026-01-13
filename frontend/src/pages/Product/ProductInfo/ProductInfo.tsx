import React, { useMemo, useState } from "react";
import { CategoryTable } from "./components/CategoryTable";
import { CreateCategoryModal } from "./components/CreateCategoryModal";
import { EditCategoryModal } from "./components/EditCategoryModal";
import { EditProductModal } from "./components/EditProductModal";
import { ProductInfoHeader } from "./components/ProductInfoHeader";
import { ProductTable } from "./components/ProductTable";
import { useCategoryCreate } from "./hooks/useCategoryCreate";
import { useCategoryEdit } from "./hooks/useCategoryEdit";
import { useCategoryOptions } from "./hooks/useCategoryOptions";
import { useProductEdit } from "./hooks/useProductEdit";
import { useProductInfo } from "./hooks/useProductInfo";
import { getCategoryColor } from "./utils/categoryColors";
import { buildCategoryRows } from "./utils/buildCategoryRows";
import { PAGE_SIZE } from "./utils/productInfoHelpers";
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

  const [viewMode, setViewMode] = useState<"products" | "categories">(
    "products"
  );
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
        onAddClick={reload}
        onAddCategoryClick={openCreateCategory}
      />

      {error && (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setViewMode("products")}
          aria-pressed={viewMode === "products"}
          className={`rounded-2xl border px-5 py-4 text-left transition-all ${
            viewMode === "products"
              ? "border-blue-400/50 bg-blue-500/15 shadow-lg shadow-blue-500/10"
              : "border-white/10 bg-white/5 hover:bg-white/10"
          }`}
        >
          <p className="text-lg font-semibold text-white">Sản phẩm</p>
          <p className="mt-1 text-xs text-white/60">
            Hiển thị thông tin sản phẩm
          </p>
        </button>
        <button
          type="button"
          onClick={() => setViewMode("categories")}
          aria-pressed={viewMode === "categories"}
          className={`rounded-2xl border px-5 py-4 text-left transition-all ${
            viewMode === "categories"
              ? "border-blue-400/50 bg-blue-500/15 shadow-lg shadow-blue-500/10"
              : "border-white/10 bg-white/5 hover:bg-white/10"
          }`}
        >
          <p className="text-lg font-semibold text-white">Danh mục</p>
          <p className="mt-1 text-xs text-white/60">
            Danh sách sản phẩm theo danh mục
          </p>
        </button>
      </div>

      {viewMode === "products" ? (
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
      ) : (
        <CategoryTable
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
          categoryOptions={categoryOptions}
          selectedCategoryIds={selectedCategoryIds}
          saving={categorySaving || categoryLoading}
          error={categorySaveError || categoryError}
          onPackageNameChange={setCategoryPackageName}
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
