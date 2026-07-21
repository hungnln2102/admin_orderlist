import { useState, useEffect } from "react";
import { apiFetch, apiPost, apiPut, apiDelete } from "@/shared/api/client";
import toast from "react-hot-toast";
import ConfirmModal from "@/components/modals/ConfirmModal/ConfirmModal";

interface ProductName {
  id: number;
  name: string;
  product_id: number | null;
  slot?: number | null;
  match?: string | null;
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
                <th className="p-4 font-semibold w-12 text-center">ID</th>
                <th className="p-4 font-semibold min-w-[200px]">Tên Dịch Vụ Kho</th>
                <th className="p-4 font-semibold min-w-[200px]">Sản Phẩm Liên Kết</th>
                <th className="p-4 font-semibold w-24 text-center">Slot</th>
                <th className="p-4 font-semibold w-40">Match (Loại)</th>
                <th className="p-4 font-semibold w-28 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {editingId === "new" && draft && (
                <tr className="bg-blue-900/10">
                  <td className="p-4 text-center text-white/50 font-medium">Mới</td>
                  <td className="p-4">
                    <input
                      type="text"
                      value={draft.name || ""}
                      onChange={e => setDraft({ ...draft, name: e.target.value })}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 h-9 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
                      placeholder="Nhập tên..."
                      autoFocus
                    />
                  </td>
                  <td className="p-4">
                    <div className="relative">
                      <select
                        value={draft.product_id || ""}
                        onChange={e => setDraft({ ...draft, product_id: e.target.value ? Number(e.target.value) : null })}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 h-9 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner appearance-none cursor-pointer"
                      >
                        <option value="" className="bg-[#0f1219]">-- Không liên kết --</option>
                        {productOptions.map(o => (
                          <option key={o.value} value={o.value} className="bg-[#0f1219]">{o.label}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="p-4">
                    <input
                      type="number"
                      min="1"
                      value={draft.slot || ""}
                      onChange={e => setDraft({ ...draft, slot: e.target.value ? Number(e.target.value) : null })}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-2 h-9 text-sm font-semibold text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner text-center"
                    />
                  </td>
                  <td className="p-4">
                    <select
                      value={draft.match || "information_order"}
                      onChange={e => setDraft({ ...draft, match: e.target.value })}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 h-9 text-sm font-medium text-indigo-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner appearance-none cursor-pointer"
                    >
                      <option value="information_order" className="bg-[#0f1219]">Info Order</option>
                      <option value="slot" className="bg-[#0f1219]">Slot</option>
                    </select>
                  </td>
                  <td className="p-4 text-right space-x-2 whitespace-nowrap">
                    <button onClick={saveEdit} className="inline-flex items-center justify-center rounded bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/30 transition-all">Lưu</button>
                    <button onClick={cancelEdit} className="inline-flex items-center justify-center rounded bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/70 hover:bg-white/20 transition-all">Hủy</button>
                  </td>
                </tr>
              )}

              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-white/40">Đang tải...</td>
                </tr>
              ) : items.length === 0 && editingId !== "new" ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-white/40">Chưa có danh mục nào</td>
                </tr>
              ) : (
                items.map(item => {
                  const isEditing = editingId === item.id;
                  
                  return (
                    <tr key={item.id} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="p-4 text-center text-white/30 font-mono text-xs">{item.id}</td>
                      <td className="p-4">
                        {isEditing && draft ? (
                          <input
                            type="text"
                            value={draft.name || ""}
                            onChange={e => setDraft({ ...draft, name: e.target.value })}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 h-9 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
                          />
                        ) : (
                          <span className="text-white/90 font-medium">{item.name}</span>
                        )}
                      </td>
                      <td className="p-4">
                        {isEditing && draft ? (
                          <div className="relative">
                            <select
                              value={draft.product_id || ""}
                              onChange={e => setDraft({ ...draft, product_id: e.target.value ? Number(e.target.value) : null })}
                              className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 h-9 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner appearance-none cursor-pointer"
                            >
                              <option value="" className="bg-[#0f1219]">-- Không liên kết --</option>
                              {productOptions.map(o => (
                                <option key={o.value} value={o.value} className="bg-[#0f1219]">{o.label}</option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <span className={item.product_id ? "text-indigo-300 font-medium" : "text-white/20 italic"}>
                            {item.product_id 
                              ? productOptions.find(o => Number(o.value) === item.product_id)?.label || `ID: ${item.product_id}`
                              : "Không liên kết"}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        {isEditing && draft ? (
                          <input
                            type="number"
                            min="1"
                            value={draft.slot || ""}
                            onChange={e => setDraft({ ...draft, slot: e.target.value ? Number(e.target.value) : null })}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-2 h-9 text-sm font-semibold text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner text-center"
                          />
                        ) : (
                          <div className="flex justify-center">
                            <span className="text-emerald-400 font-mono font-medium">{item.slot ?? 1}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        {isEditing && draft ? (
                          <select
                            value={draft.match || "information_order"}
                            onChange={e => setDraft({ ...draft, match: e.target.value })}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 h-9 text-sm font-medium text-indigo-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner appearance-none cursor-pointer"
                          >
                            <option value="information_order" className="bg-[#0f1219]">Info Order</option>
                            <option value="slot" className="bg-[#0f1219]">Slot</option>
                          </select>
                        ) : (
                          <span className="text-purple-300 font-medium text-sm">
                            {item.match === "slot" ? "Slot" : "Information Order"}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right space-x-2 whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={saveEdit} disabled={loading} className="inline-flex items-center justify-center rounded bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/30 transition-all">Lưu</button>
                            <button onClick={cancelEdit} disabled={loading} className="inline-flex items-center justify-center rounded bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/70 hover:bg-white/20 transition-all">Hủy</button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEdit(item)} disabled={loading} className="inline-flex items-center justify-center rounded bg-indigo-500/20 px-2.5 py-1 text-xs font-semibold text-indigo-400 hover:bg-indigo-500/30 transition-all">Sửa</button>
                            <button onClick={() => setDeleteId(item.id)} disabled={loading} className="inline-flex items-center justify-center rounded bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-all">Xóa</button>
                          </div>
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
