import { useFormInfo } from "./hooks/useFormInfo";
import { FormTabs } from "./components/FormTabs";
import { FormListSection } from "./components/FormListSection";
import { InputListSection } from "./components/InputListSection";
import { FormDetailModal } from "./components/FormDetailModal";
import CreateInputModal from "./CreateInputModal";
import CreateFormModal from "./CreateFormModal";
import EditFormModal from "./EditFormModal";

export default function FormInfo() {
  const {
    activeTab,
    setActiveTab,
    items,
    loading,
    error,
    inputItems,
    inputLoading,
    inputError,
    viewOpen,
    viewData,
    viewLoading,
    viewError,
    createInputOpen,
    createFormOpen,
    editFormOpen,
    editingItem,
    handleView,
    handleCloseView,
    handleEdit,
    handleDelete,
    handleCreateForm,
    handleCreateFormClose,
    handleCreateFormSuccess,
    handleEditFormClose,
    handleEditFormSuccess,
    handleCreateInput,
    handleCreateInputClose,
    handleCreateInputSuccess,
  } = useFormInfo();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Form <span className="text-indigo-400">thông tin</span>
          </h1>
          <p className="text-sm font-medium text-white/50 tracking-wide">
            Quản lý danh sách form và mô tả
          </p>
        </div>
      </div>

      <FormTabs activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "form" && (
        <FormListSection
          items={items}
          loading={loading}
          error={error}
          onCreateForm={handleCreateForm}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {activeTab === "input" && (
        <InputListSection
          items={inputItems}
          loading={inputLoading}
          error={inputError}
          onCreateInput={handleCreateInput}
        />
      )}

      <FormDetailModal
        open={viewOpen}
        data={viewData}
        loading={viewLoading}
        error={viewError}
        onClose={handleCloseView}
      />

      <CreateInputModal
        isOpen={createInputOpen}
        onClose={handleCreateInputClose}
        onSuccess={handleCreateInputSuccess}
      />

      <CreateFormModal
        isOpen={createFormOpen}
        onClose={handleCreateFormClose}
        onSuccess={handleCreateFormSuccess}
        inputItems={inputItems}
      />

      <EditFormModal
        isOpen={editFormOpen}
        onClose={handleEditFormClose}
        onSuccess={handleEditFormSuccess}
        inputItems={inputItems}
        editingItem={editingItem}
      />
    </div>
  );
}
