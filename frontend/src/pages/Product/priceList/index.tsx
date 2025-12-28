import React from "react";
import "./Pricing.css";
import PricingFilters from "./components/PricingFilters";
import PricingStats from "./components/PricingStats";
import ProductTable from "./components/ProductTable";
import CreateProductModal from "./components/modals/CreateProductModal";
import DeleteProductModal from "./components/modals/DeleteProductModal";
import { usePricingData } from "./hooks/usePricingData";
import { parseRatioInput } from "./utils";

function Pricing() {
  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    totalRows,
    currentPage,
    setCurrentPage,
    rowsPerPage,
    setRowsPerPage,
    pricingStats,
    filteredPricing,
    isLoading,
    error,
    isRefreshing,
    expandedProductId,
    supplyPriceMap,
    statusOverrides,
    updatedTimestampMap,
    editingSupplyRows,
    supplyPriceDrafts,
    savingSupplyRows,
    supplyRowErrors,
    newSupplyRows,
    editingProductId,
    productEditForm,
    productEditError,
    isSavingProductEdit,
    deleteProductState,
    isCreateModalOpen,
    createForm,
    createSuppliers,
    createError,
    isSubmittingCreate,
    supplierOptions,
    isLoadingSuppliers,
    bankOptions,
    isLoadingBanks,
    handleRefreshAll,
    handleToggleProductDetails,
    handleStartProductEdit,
    handleProductEditChange,
    handleCancelProductEdit,
    handleSubmitProductEdit,
    handleRequestDeleteProduct,
    confirmDeleteProduct,
    closeDeleteProductModal,
    handleStartEditingSupply,
    handleSupplyInputChange,
    handleCancelSupplyEditing,
    handleConfirmSupplyEditing,
    handleStartAddSupplierRow,
    handleNewSupplierInputChange,
    handleCancelAddSupplierRow,
    handleConfirmAddSupplierRow,
    handleDeleteSupplyRow,
    handleToggleStatus,
    handleOpenCreateModal,
    handleCloseCreateModal,
    handleCreateFormChange,
    handleSupplierChange,
    handleSupplierSelectChange,
    handleSupplierPriceInput,
    handleEnableCustomSupplier,
    handleAddSupplierRow,
    handleRemoveSupplierRow,
    handleSubmitCreateProduct,
    fetchSupplyPricesForProduct,
  } = usePricingData();

  return (
    <>
      <DeleteProductModal
        product={deleteProductState.product}
        loading={deleteProductState.loading}
        error={deleteProductState.error}
        onClose={closeDeleteProductModal}
        onConfirm={confirmDeleteProduct}
      />
      <CreateProductModal
        isOpen={isCreateModalOpen}
        createForm={createForm}
        createSuppliers={createSuppliers}
        supplierOptions={supplierOptions}
        bankOptions={bankOptions}
        isLoadingSuppliers={isLoadingSuppliers}
        isLoadingBanks={isLoadingBanks}
        createError={createError}
        isSubmitting={isSubmittingCreate}
        onClose={handleCloseCreateModal}
        onFormChange={handleCreateFormChange}
        onSupplierChange={handleSupplierChange}
        onSupplierSelectChange={handleSupplierSelectChange}
        onSupplierPriceInput={handleSupplierPriceInput}
        onEnableCustomSupplier={handleEnableCustomSupplier}
        onAddSupplier={handleAddSupplierRow}
        onRemoveSupplier={handleRemoveSupplierRow}
        onSubmit={handleSubmitCreateProduct}
        parseRatioInput={parseRatioInput}
      />
      <div className="space-y-6">
        <PricingStats
          stats={pricingStats}
          onAddProduct={handleOpenCreateModal}
        />
        <PricingFilters
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          isLoading={isLoading}
          isRefreshing={isRefreshing}
          error={error}
          onSearchChange={setSearchTerm}
          onStatusChange={setStatusFilter}
          onRefresh={handleRefreshAll}
        />
        <ProductTable
          items={filteredPricing}
          isLoading={isLoading}
          error={error}
          totalRows={totalRows}
          currentPage={currentPage}
          rowsPerPage={rowsPerPage}
          onPageChange={setCurrentPage}
          onRowsPerPageChange={(rows) => {
            setRowsPerPage(rows);
            setCurrentPage(1);
          }}
          expandedProductId={expandedProductId}
          supplyPriceMap={supplyPriceMap}
          statusOverrides={statusOverrides}
          updatedTimestampMap={updatedTimestampMap}
          supplierOptions={supplierOptions}
          isLoadingSuppliers={isLoadingSuppliers}
          editingSupplyRows={editingSupplyRows}
          supplyPriceDrafts={supplyPriceDrafts}
          savingSupplyRows={savingSupplyRows}
          supplyRowErrors={supplyRowErrors}
          newSupplyRows={newSupplyRows}
          editingProductId={editingProductId}
          productEditForm={productEditForm}
          productEditError={productEditError}
          isSavingProductEdit={isSavingProductEdit}
          deleteProductState={deleteProductState}
          onToggleProductDetails={handleToggleProductDetails}
          onStartProductEdit={handleStartProductEdit}
          onProductEditChange={handleProductEditChange}
          onCancelProductEdit={handleCancelProductEdit}
          onSubmitProductEdit={handleSubmitProductEdit}
          onRequestDeleteProduct={handleRequestDeleteProduct}
          onStartEditingSupply={handleStartEditingSupply}
          onSupplyInputChange={handleSupplyInputChange}
          onCancelSupplyEditing={handleCancelSupplyEditing}
          onConfirmSupplyEditing={handleConfirmSupplyEditing}
          onStartAddSupplierRow={handleStartAddSupplierRow}
          onNewSupplierInputChange={handleNewSupplierInputChange}
          onCancelAddSupplierRow={handleCancelAddSupplierRow}
          onConfirmAddSupplierRow={handleConfirmAddSupplierRow}
          onDeleteSupplyRow={handleDeleteSupplyRow}
          onToggleStatus={handleToggleStatus}
          fetchSupplyPricesForProduct={fetchSupplyPricesForProduct}
        />
      </div>
    </>
  );
}

export default Pricing;
