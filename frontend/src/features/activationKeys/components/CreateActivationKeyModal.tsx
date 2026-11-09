import React, { useState } from "react";
import { X, KeyRound, Sparkles, Loader2, Info } from "lucide-react";
import { CatalogProductOption, CreateActivationKeyPayload } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateActivationKeyPayload) => Promise<void>;
  products: CatalogProductOption[];
}

export const CreateActivationKeyModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSubmit,
  products,
}) => {
  const [formData, setFormData] = useState<CreateActivationKeyPayload>({
    prefix: "GPT",
    product_name_id: products[0]?.id || 0,
    quantity: 1,
    id_order: "",
    customer_info: "",
    expired_at: "",
    note: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_name_id) {
      setError("Vui lòng chọn Sản phẩm / Dịch vụ áp dụng!");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit({
        ...formData,
        quantity: Math.max(1, Math.min(100, Number(formData.quantity) || 1)),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Không thể tạo mã kích hoạt.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleProductSelect = (id: number) => {
    const selected = products.find((p) => p.id === id);
    let autoPrefix = "GPT";
    if (selected) {
      const n = selected.name.toUpperCase();
      if (n.includes("GPT") || n.includes("CHAT")) autoPrefix = "GPT";
      else if (n.includes("NETFLIX")) autoPrefix = "NFLX";
      else if (n.includes("ADOBE")) autoPrefix = "ADBE";
      else if (n.includes("CLAUDE")) autoPrefix = "CLD";
      else autoPrefix = n.substring(0, 4).replace(/[^A-Z0-9]/g, "") || "KEY";
    }

    setFormData((prev) => ({
      ...prev,
      product_name_id: id,
      prefix: autoPrefix,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800/80 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Tạo Mã Kích Hoạt Mới</h3>
              <p className="text-xs text-slate-400">Sinh mã key cho khách tự nhận slot kho</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Chọn Sản phẩm */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Sản Phẩm Áp Dụng <span className="text-rose-400">*</span>
            </label>
            <select
              value={formData.product_name_id}
              onChange={(e) => handleProductSelect(Number(e.target.value))}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value={0} disabled>-- Chọn sản phẩm kho --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Tiền tố mã (Prefix) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Tiền Tố (Prefix)
              </label>
              <input
                type="text"
                value={formData.prefix}
                onChange={(e) =>
                  setFormData({ ...formData, prefix: e.target.value.toUpperCase() })
                }
                placeholder="VD: GPT, NFLX..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 font-mono uppercase focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            {/* Số lượng mã sinh ra */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Số Lượng Key
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Mã Đơn Hàng (Nếu có) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Mã Đơn Hàng (Tùy chọn)
              </label>
              <input
                type="text"
                value={formData.id_order}
                onChange={(e) => setFormData({ ...formData, id_order: e.target.value })}
                placeholder="VD: ORD-1002"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            {/* Thông tin Khách Hàng */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Khách Hàng (Tùy chọn)
              </label>
              <input
                type="text"
                value={formData.customer_info}
                onChange={(e) => setFormData({ ...formData, customer_info: e.target.value })}
                placeholder="Tên / SĐT / Zalo"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          {/* Ghi chú */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Ghi Chú
            </label>
            <input
              type="text"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="Ghi chú nội bộ..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Preview Format */}
          <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-800/30 text-xs text-cyan-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Định dạng mẫu:
            </span>
            <span className="font-mono font-bold text-white">
              {formData.prefix || "KEY"}-A8F291-C4092E
            </span>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-cyan-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang sinh key...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Tạo {formData.quantity || 1} Mã Key</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

