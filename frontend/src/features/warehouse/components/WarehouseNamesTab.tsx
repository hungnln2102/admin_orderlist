import { useState, useEffect } from "react";
import { apiFetch, apiPost, apiPut, apiDelete } from "@/shared/api/client";
import toast from "react-hot-toast";
import ConfirmModal from "@/components/modals/ConfirmModal/ConfirmModal";

interface ProductName {
  id: number;
  name: string;
  product_id: number | null;
  created_at: string;
  updated_at: string;
}

interface WarehouseNamesTabProps {
  productOptions: { value: string; label: string }[];
  onUpdate: () => void;
}

export default function WarehouseNamesTab({ productOptions, onUpdate }: WarehouseNamesTabProps) {
  const [items, setItems] = useState<ProductName[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<Partial<ProductName> | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/warehouse/product-names");
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (e) {
      toast.error("Lỗi khi tải danh sách tên dịch vụ");
    } finally {
      setLoading(false);
    }
  };

  const startCreate = () => {
    setEditingId("new");
    setDraft({ name: "", product_id: null });
  };

  const startEdit = (item: ProductName) => {
    setEditingId(item.id);
    setDraft({ ...item });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const saveEdit = async () => {
    if (!draft || !draft.name?.trim()) {
      toast.error("Tên không được để trống");
      return;
    }
    
    setLoading(true);
    try {
      if (editingId === "new") {
        const res = await apiPost<ProductName>("/api/warehouse/product-names", draft);
        setItems(prev => [res, ...prev]);
        toast.success("Thêm thành công");
      } else {
        const res = await apiPut<ProductName>(`/api/warehouse/product-names/${editingId}`, draft);
        setItems(prev => prev.map(it => it.id === editingId ? { ...it, ...res } : it));
        toast.success("Cập nhật thành công");
      }
      cancelEdit();
      onUpdate();
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi lưu");
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await apiDelete(`/api/warehouse/product-names/${deleteId}`);
      setItems(prev => prev.filter(it => it.id !== deleteId));
      toast.success("Đã xoá thành công");
      onUpdate();
    } catch (e: any) {
      toast.error(e.message || "Không thể xoá");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white/90">Danh mục Tên Dịch Vụ</h3>
        <button
          onClick={startCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/20"
        >
          + Thêm Mới
        </button>
      </div>

      <div className="bg-[#1a1f2e] rounded-xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5 text-xs uppercase tracking-wider text-white/40">
                <th className="p-4 font-semibold w-16">ID</th>
                <th className="p-4 font-semibold">Tên Dịch Vụ Kho</th>
                <th className="p-4 font-semibold">Sản Phẩm Liên Kết (Product)</th>
                <th className="p-4 font-semibold w-32 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {editingId === "new" && draft && (
                <tr className="bg-blue-900/10">
                  <td className="p-4 text-white/50">Mới</td>
                  <td className="p-4">
                    <input
                      type="text"
                      value={draft.name || ""}
                      onChange={e => setDraft({ ...draft, name: e.target.value })}
                      className="w-full bg-[#0f1219] border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      placeholder="Nhập tên..."
                      autoFocus
                    />
                  </td>
                  <td className="p-4">
                    <select
                      value={draft.product_id || ""}
                      onChange={e => setDraft({ ...draft, product_id: e.target.value ? Number(e.target.value) : null })}
                      className="w-full bg-[#0f1219] border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">-- Không liên kết --</option>
                      {draft?.product_id && !productOptions.some(o => Number(o.value) === draft.product_id) && (
                        <option value={draft.product_id} className="hidden">ID: {draft.product_id} (Dữ liệu cũ)</option>
                      )}
                      {productOptions.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button onClick={saveEdit} className="text-green-400 hover:text-green-300 font-medium px-2">Lưu</button>
                    <button onClick={cancelEdit} className="text-white/40 hover:text-white/70 px-2">Hủy</button>
                  </td>
                </tr>
              )}

              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-white/40">Đang tải...</td>
                </tr>
              ) : items.length === 0 && editingId !== "new" ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-white/40">Chưa có danh mục nào</td>
                </tr>
              ) : (
                items.map(item => {
                  const isEditing = editingId === item.id;
                  
                  return (
                    <tr key={item.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="p-4 text-white/50">{item.id}</td>
                      <td className="p-4">
                        {isEditing && draft ? (
                          <input
                            type="text"
                            value={draft.name || ""}
                            onChange={e => setDraft({ ...draft, name: e.target.value })}
                            className="w-full bg-[#0f1219] border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                          />
                        ) : (
                          <span className="text-white/90 font-medium">{item.name}</span>
                        )}
                      </td>
                      <td className="p-4">
                        {isEditing && draft ? (
                          <select
                            value={draft.product_id || ""}
                            onChange={e => setDraft({ ...draft, product_id: e.target.value ? Number(e.target.value) : null })}
                            className="w-full bg-[#0f1219] border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                          >
                            <option value="">-- Không liên kết --</option>
                            {draft?.product_id && !productOptions.some(o => Number(o.value) === draft.product_id) && (
                              <option value={draft.product_id} className="hidden">ID: {draft.product_id} (Dữ liệu cũ)</option>
                            )}
                            {productOptions.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={item.product_id ? "text-blue-400" : "text-white/30"}>
                            {item.product_id 
                              ? productOptions.find(o => Number(o.value) === item.product_id)?.label || `ID: ${item.product_id}`
                              : "Không liên kết"}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        {isEditing ? (
                          <>
                            <button onClick={saveEdit} disabled={loading} className="text-green-400 hover:text-green-300 font-medium px-2">Lưu</button>
                            <button onClick={cancelEdit} disabled={loading} className="text-white/40 hover:text-white/70 px-2">Hủy</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(item)} disabled={loading} className="text-blue-400 hover:text-blue-300 p-1">Sửa</button>
                            <button onClick={() => setDeleteId(item.id)} disabled={loading} className="text-red-400 hover:text-red-300 p-1">Xóa</button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteId !== null}
        onClose={() => { if (!isDeleting) setDeleteId(null); }}
        onConfirm={confirmDelete}
        title="Xóa danh mục?"
        message="Hành động này không thể hoàn tác. Nếu danh mục đang được sử dụng trong kho hàng, hệ thống sẽ báo lỗi."
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        isSubmitting={isDeleting}
      />
    </div>
  );
}
