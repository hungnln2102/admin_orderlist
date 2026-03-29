import React from "react";
import ConfirmModal from "../../../components/modals/ConfirmModal/ConfirmModal";
import { CreatePackageModal } from "./components/Modals/CreatePackageModal";
import { PackageFormModal } from "./components/Modals/PackageFormModal";
import { PackageViewModal } from "./components/Modals/PackageViewModal";
import { usePackageProductPage } from "./hooks/usePackageProductPage";
import {
  PackageStatsSection,
  PackageSummarySection,
  SelectedPackageSection,
} from "./sections";

const PackageProduct: React.FC = () => {
  const {
    data: {
      filteredRows,
      sortedRows,
      selectedPackage,
      selectedTemplate,
      packageSummaries,
      showCapacityColumn,
      tableColumnCount,
      loading,
      usedProductIds,
      productHasStorage,
      slotCards,
    },
    filters: { searchTerm, statusFilter },
    modalState: {
      createModalOpen,
      createInitialProductId,
      createInitialName,
      createInitialFields,
      createModalMode,
      addModalOpen,
      editModalOpen,
      editContext,
      viewModalOpen,
      viewRow,
    },
    actions: {
      setSearchTerm,
      setStatusFilter,
      setCreateModalOpen,
      handleCategorySelect,
      handleCreateButtonClick,
      handleEditTemplateFields,
      handleAddButtonClick,
      openEditModal,
      openViewModal,
      closeAddModal,
      closeEditModal,
      closeViewModal,
      handleCreateTemplate,
      handleAddSubmit,
      handleEditSubmit,
    },
    deleteActions: {
      deleteMode,
      deleteProcessing,
      packagesMarkedForDeletion,
      deleteRowTarget,
      deleteRowProcessing,
      deleteRowError,
      handleStartDeleteMode,
      resetDeleteSelection,
      togglePackageMarked,
      handleConfirmDeletePackages,
      handleDeleteRow,
      closeDeleteRowModal,
      confirmDeleteRow,
    },
  } = usePackageProductPage();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-white">Quản lý Gói Sản phẩm</h1>
        <p className="text-sm text-white/50">Quản lý các loại gói sản phẩm và các gói con.</p>
      </div>

      <PackageStatsSection slotCards={slotCards} />

      <PackageSummarySection
        packageSummaries={packageSummaries}
        selectedPackage={selectedPackage}
        deleteMode={deleteMode}
        deleteProcessing={deleteProcessing}
        packagesMarkedForDeletion={packagesMarkedForDeletion}
        onCreateButtonClick={handleCreateButtonClick}
        onCategorySelect={handleCategorySelect}
        onEditTemplateFields={handleEditTemplateFields}
        onTogglePackageMarked={togglePackageMarked}
        selectedInlineSection={
          <SelectedPackageSection
            selectedPackage={selectedPackage}
            mobileInline
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            filteredRowsCount={filteredRows.length}
            rows={sortedRows}
            loading={loading}
            showCapacityColumn={showCapacityColumn}
            tableColumnCount={tableColumnCount}
            deleteMode={deleteMode}
            deleteProcessing={deleteProcessing}
            onSearchTermChange={setSearchTerm}
            onStatusFilterChange={setStatusFilter}
            onStartDeleteMode={handleStartDeleteMode}
            onConfirmDeletePackages={handleConfirmDeletePackages}
            onResetDeleteSelection={resetDeleteSelection}
            onAddButtonClick={handleAddButtonClick}
            onEditRow={openEditModal}
            onViewRow={openViewModal}
            onDeleteRow={handleDeleteRow}
          />
        }
      />

      {selectedPackage && (
        <div className="hidden md:block">
          <SelectedPackageSection
            selectedPackage={selectedPackage}
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            filteredRowsCount={filteredRows.length}
            rows={sortedRows}
            loading={loading}
            showCapacityColumn={showCapacityColumn}
            tableColumnCount={tableColumnCount}
            deleteMode={deleteMode}
            deleteProcessing={deleteProcessing}
            onSearchTermChange={setSearchTerm}
            onStatusFilterChange={setStatusFilter}
            onStartDeleteMode={handleStartDeleteMode}
            onConfirmDeletePackages={handleConfirmDeletePackages}
            onResetDeleteSelection={resetDeleteSelection}
            onAddButtonClick={handleAddButtonClick}
            onEditRow={openEditModal}
            onViewRow={openViewModal}
            onDeleteRow={handleDeleteRow}
          />
        </div>
      )}
      <CreatePackageModal
        open={createModalOpen}
        initialProductId={createInitialProductId}
        initialName={createInitialName}
        initialFields={createInitialFields}
        mode={createModalMode}
        usedProductIds={usedProductIds}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateTemplate}
      />
      {selectedTemplate && (
        <PackageFormModal
          mode="add"
          open={addModalOpen}
          template={selectedTemplate}
          hasStorage={productHasStorage}
          onClose={closeAddModal}
          onSubmit={handleAddSubmit}
        />
      )}
      {editModalOpen && editContext && (
        <PackageFormModal
          mode="edit"
          open={editModalOpen}
          template={editContext.template}
          initialValues={editContext.initialValues}
          hasStorage={productHasStorage}
          stockInfo={editContext.stockInfo}
          storageInfo={editContext.storageInfo}
          onClose={closeEditModal}
          onSubmit={handleEditSubmit}
        />
      )}
      <PackageViewModal
        open={viewModalOpen}
        row={viewRow}
        onClose={closeViewModal}
      />
      <ConfirmModal
        isOpen={Boolean(deleteRowTarget)}
        onClose={closeDeleteRowModal}
        onConfirm={confirmDeleteRow}
        title="Xác nhận xóa gói"
        message={`Bạn có chắc muốn xóa gói "${deleteRowTarget?.package}"?`}
        secondaryMessage={deleteRowError || undefined}
        confirmLabel="OK"
        cancelLabel="Hủy"
        isSubmitting={deleteRowProcessing}
      />
    </div>
  );
};

export default PackageProduct;
