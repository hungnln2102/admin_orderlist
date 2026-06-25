import React, { useState, useEffect } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { CategoryItem } from "@/lib/categoryApi";
import { useCategoryManagement } from "../hooks/useCategoryManagement";
import { CategoryTagCard } from "./CategoryTagCard";
import { CategoryTagForm } from "./CategoryTagForm";

interface CategoryTagManagerProps {
  onCategoriesChange?: () => void;
}

const CategoryTagManager: React.FC<CategoryTagManagerProps> = ({ onCategoriesChange }) => {
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
      // Error is handled by the hook
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
      // Error is handled by the hook
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await remove(id);
      setDeleteConfirmId(null);
      onCategoriesChange?.();
    } catch {
      // Error is handled by the hook
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

export default CategoryTagManager;
