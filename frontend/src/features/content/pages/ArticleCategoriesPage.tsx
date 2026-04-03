import { useState, useCallback, useEffect } from "react";
import {
  FolderIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import GradientButton from "@/components/ui/GradientButton";
import type { ArticleCategory } from "../types";
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../api/contentApi";

const fieldClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none backdrop-blur-md focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30";

export default function ArticleCategoriesPage() {
  const [categories, setCategories] = useState<ArticleCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCategories(await fetchCategories());
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return;
    try {
      await createCategory({ name: newName.trim() });
      setNewName("");
      setShowCreate(false);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Lỗi tạo danh mục.");
    }
  }, [newName, load]);

  const handleDelete = useCallback(async (id: number) => {
    if (!window.confirm("Xóa danh mục này?")) return;
    try {
      await deleteCategory(id);
      load();
    } catch {
      alert("Xóa thất bại.");
    }
  }, [load]);

  const startEdit = (cat: ArticleCategory) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  const saveEdit = useCallback(async () => {
    if (!editName.trim() || editingId === null) return;
    try {
      await updateCategory(editingId, { name: editName.trim() });
      setEditingId(null);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Lỗi cập nhật.");
    }
  }, [editName, editingId, load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
            <FolderIcon className="h-7 w-7 text-sky-400" />
            Danh mục bài viết
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Quản lý các danh mục phân loại bài viết trên trang tin tức.
          </p>
        </div>
        <GradientButton icon={PlusIcon} onClick={() => setShowCreate(true)}>
          Thêm danh mục
        </GradientButton>
      </div>

      {showCreate && (
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md">
          <input
            type="text"
            placeholder="Tên danh mục mới..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className={`${fieldClass} max-w-xs`}
            autoFocus
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={!newName.trim()}
            className="rounded-lg bg-emerald-500/20 p-2 text-emerald-400 transition-colors hover:bg-emerald-500/30 disabled:opacity-40"
          >
            <CheckIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => { setShowCreate(false); setNewName(""); }}
            className="rounded-lg bg-white/5 p-2 text-slate-400 transition-colors hover:bg-white/10"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3">Tên danh mục</th>
              <th className="px-5 py-3">Slug</th>
              <th className="px-5 py-3">Số bài viết</th>
              <th className="px-5 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-slate-500">Đang tải...</td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-slate-500">Chưa có danh mục nào.</td>
              </tr>
            ) : (
              categories.map((cat) => (
                <tr
                  key={cat.id}
                  className="border-b border-white/5 transition-colors hover:bg-white/[0.03]"
                >
                  <td className="px-5 py-3 font-medium text-white">
                    {editingId === cat.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                          className={`${fieldClass} max-w-[200px]`}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={saveEdit}
                          className="rounded-lg bg-emerald-500/20 p-1.5 text-emerald-400"
                        >
                          <CheckIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-lg bg-white/5 p-1.5 text-slate-400"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      cat.name
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-400">{cat.slug}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-sky-500/15 px-2.5 py-1 text-xs font-semibold text-sky-300">
                      {cat.article_count}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        title="Sửa"
                        onClick={() => startEdit(cat)}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-sky-400"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Xóa"
                        onClick={() => handleDelete(cat.id)}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-rose-400"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
