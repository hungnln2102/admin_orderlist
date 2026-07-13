import React, { useState, useEffect } from "react";
import { PlusIcon, CheckIcon, PencilIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { CategoryItem } from "@/lib/categoryApi";
import { useCategoryManagement } from "../../hooks/useCategoryManagement";
import ColorPicker from "@/components/ui/ColorPicker";
import { getCategoryVisualStyle } from "../../utils/categoryColors";

// --- CategoryTagForm ---
type CategoryTagFormProps = {
  name: string;
  color: string;
  colorLabel: string;
  saving: boolean;
  submitLabel: string;
  savingLabel: string;
  namePlaceholder?: string;
  autoFocus?: boolean;
  onNameChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
};

const CategoryTagForm: React.FC<CategoryTagFormProps> = ({
  name,
  color,
  colorLabel,
  saving,
  submitLabel,
  savingLabel,
  namePlaceholder,
  autoFocus = false,
  onNameChange,
  onColorChange,
  onCancel,
  onSubmit,
}) => (
  <div className="rounded-2xl border border-indigo-400/50 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 p-6 space-y-4 shadow-lg sm:col-span-2">
    <div>
      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-2 block">
        Tên Danh Mục
      </label>
      <input
        type="text"
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
        placeholder={namePlaceholder}
        className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white placeholder:text-slate-400 shadow-inner focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
        autoFocus={autoFocus}
      />
    </div>

    <ColorPicker label={colorLabel} value={color} onChange={onColorChange} />

    <div className="flex items-center justify-end gap-3 pt-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="px-5 py-2.5 text-sm font-semibold text-slate-300 hover:text-white transition-colors disabled:opacity-50"
      >
        Hủy
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={!name.trim() || saving}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50"
      >
        <CheckIcon className="h-4 w-4" />
        {saving ? savingLabel : submitLabel}
      </button>
    </div>
  </div>
);

// --- CategoryTagCard ---
type CategoryTagCardProps = {
  category: CategoryItem;
  isDeleting: boolean;
  editDisabled: boolean;
  deleteDisabled: boolean;
  deleting: boolean;
  onEdit: (category: CategoryItem) => void;
  onRequestDelete: (id: number) => void;
  onCancelDelete: () => void;
  onConfirmDelete: (id: number) => void;
};

const CategoryTagCard: React.FC<CategoryTagCardProps> = ({
  category,
  isDeleting,
  editDisabled,
  deleteDisabled,
  deleting,
  onEdit,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}) => (
  <div className="group rounded-2xl border border-white/15 bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 p-5 shadow-sm backdrop-blur-sm hover:border-white/25 transition-all">
    <div className="flex items-start gap-4">
      <div
        className="h-14 w-14 rounded-xl border-2 border-white/20 flex-shrink-0 shadow-md"
        style={getCategoryVisualStyle(category.color)}
      />

      <div className="flex-1 min-w-0">
        <h4 className="text-base font-semibold text-white truncate">
          {category.name}
        </h4>
        <p className="text-xs text-slate-400 mt-1 font-mono break-all line-clamp-3">
          {category.color || "#facc15"}
        </p>
      </div>

      {isDeleting ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancelDelete}
            disabled={deleting}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            title="Hủy"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onConfirmDelete(category.id)}
            disabled={deleting}
            className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors disabled:opacity-50"
            title="Xác nhận xóa"
          >
            <CheckIcon className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onEdit(category)}
            disabled={editDisabled}
            className="p-2 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/20 transition-colors disabled:opacity-50"
            title="Sửa"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onRequestDelete(category.id)}
            disabled={deleteDisabled}
            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
            title="Xóa"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  </div>
);

// --- CategoryTags (Main) ---
interface CategoryTagsProps {
  onCategoriesChange?: () => void;
}

export const CategoryTags: React.FC<CategoryTagsProps> = ({ onCategoriesChange }) => {
  const { categories, loading, error, creating, updating, deleting, reload, create, update, remove } = useCategoryManagement();
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#facc15");
  
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#facc15");
  
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  useEffect(() => {
    reload();
  }, [reload]);

  const handleStartEdit = (category: CategoryItem) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditColor(category.color || "#facc15");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditColor("#facc15");
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      await update(editingId, { name: editName.trim(), color: editColor });
      setEditingId(null);
      setEditName("");
      setEditColor("#facc15");
      onCategoriesChange?.();
    } catch {
      // Error handled by hook
    }
  };

  const handleStartAdd = () => {
    setIsAdding(true);
    setNewName("");
    setNewColor("#facc15");
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewName("");
    setNewColor("#facc15");
  };

  const handleSaveAdd = async () => {
    if (!newName.trim()) return;
    try {
      await create({ name: newName.trim(), color: newColor });
      setIsAdding(false);
      setNewName("");
      setNewColor("#facc15");
      onCategoriesChange?.();
    } catch {
      // Error handled by hook
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await remove(id);
      setDeleteConfirmId(null);
      onCategoriesChange?.();
    } catch {
      // Error handled by hook
    }
  };

  if (loading && categories.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-indigo-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm text-slate-400">Đang tải danh mục...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">Quản Lý Danh Mục</h3>
          <p className="text-sm text-slate-400 mt-1">Thêm, sửa, hoặc xóa các danh mục sản phẩm</p>
        </div>
        <button
          type="button"
          onClick={handleStartAdd}
          disabled={isAdding || creating}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:from-indigo-600 hover:to-purple-700 hover:shadow-xl disabled:opacity-50"
        >
          <PlusIcon className="h-4 w-4" />
          Thêm Danh Mục
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-200 flex items-start gap-3">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Add New Category Form */}
      {isAdding && (
        <CategoryTagForm
          name={newName}
          color={newColor}
          colorLabel="Màu Sắc"
          saving={creating}
          submitLabel="Tạo"
          savingLabel="Đang tạo..."
          namePlaceholder="Nhập tên danh mục..."
          autoFocus
          onNameChange={setNewName}
          onColorChange={setNewColor}
          onCancel={handleCancelAdd}
          onSubmit={handleSaveAdd}
        />
      )}

      {/* Categories Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {categories.map((category) => {
          const isEditing = editingId === category.id;
          const isDeleting = deleteConfirmId === category.id;

          if (isEditing) {
            return (
              <CategoryTagForm
                key={category.id}
                name={editName}
                color={editColor}
                colorLabel="Màu Sắc"
                saving={updating}
                submitLabel="Lưu"
                savingLabel="Đang lưu..."
                onNameChange={setEditName}
                onColorChange={setEditColor}
                onCancel={handleCancelEdit}
                onSubmit={handleSaveEdit}
              />
            );
          }

          return (
            <CategoryTagCard
              key={category.id}
              category={category}
              isDeleting={isDeleting}
              editDisabled={editingId !== null || updating}
              deleteDisabled={editingId !== null || deleting}
              deleting={deleting}
              onEdit={handleStartEdit}
              onRequestDelete={setDeleteConfirmId}
              onCancelDelete={() => setDeleteConfirmId(null)}
              onConfirmDelete={handleDelete}
            />
          );
        })}

        {categories.length === 0 && !loading && (
          <div className="sm:col-span-2 text-center py-12">
            <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <p className="text-sm text-slate-400 font-medium">Chưa có danh mục nào</p>
            <p className="text-xs text-slate-500 mt-1">Nhấn "Thêm Danh Mục" để tạo danh mục mới</p>
          </div>
        )}
      </div>
    </div>
  );
};
