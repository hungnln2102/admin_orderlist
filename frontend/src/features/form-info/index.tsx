import { useFormInfo } from "./hooks/useFormInfo";
import { FormTabs } from "./components/FormTabs";
import { FormListSection } from "./components/FormListSection";
import { InputListSection } from "./components/InputListSection";
import { FormDetailModal } from "./components/FormDetailModal";
import { GenericFormModal } from "@/shared/components/GenericModal/GenericFormModal";
import { createInput } from "@/lib/formsApi";
import DynamicFormModal from "./DynamicFormModal";

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

      <GenericFormModal
        isOpen={createInputOpen}
        onClose={handleCreateInputClose}
        title="Tạo input"
        submitText="Tạo input"
        loadingText="Đang tạo..."
        fields={[
          {
            name: "name",
            label: "Tên input",
            type: "text",
            required: true,
            placeholder: "Nhập tên input...",
          },
          {
            name: "type",
            label: "Kiểu dữ liệu",
            type: "select",
            required: true,
            options: [
              { value: "text", label: "Text" },
              { value: "password", label: "Password" },
              { value: "email", label: "Email" },
              { value: "number", label: "Number" },
              { value: "tel", label: "Tel" },
              { value: "url", label: "URL" },
              { value: "date", label: "Date" },
              { value: "datetime-local", label: "Date Time Local" },
              { value: "search", label: "Search" },
              { value: "textarea", label: "Textarea" },
            ]
          }
        ]}
        initialData={{ type: "text" }}
        onSubmit={async (data) => {
          const created = await createInput({
            name: data.name,
            type: data.type || "text",
          });
          handleCreateInputSuccess(created);
        }}
      />

      {(createFormOpen || editFormOpen) && (
        <DynamicFormModal
          mode={editFormOpen ? "edit" : "create"}
          isOpen={true}
          onClose={editFormOpen ? handleEditFormClose : handleCreateFormClose}
          onSuccess={editFormOpen ? handleEditFormSuccess : handleCreateFormSuccess}
          inputItems={inputItems}
          editingItem={editFormOpen ? editingItem : undefined}
        />
      )}
    </div>
  );
}
