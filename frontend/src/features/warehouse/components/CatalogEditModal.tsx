import React, { useState, useEffect } from "react";
import { Edit2, X, ExternalLink, Link2, Loader2, Package, Tag } from "lucide-react";
import { ServiceNameCategoryItem, SystemProduct } from "../types";

export const DEFAULT_SUGGESTED_TAGS = [
  "5Tb",
  "2Tb",
  "100gb",
  "12 Tháng",
  "6 Tháng",
  "1 Tháng",
  "1PC Cố Định",
  "Full App",
  "Slot Team",
  "Plus Cá Nhân",
  "Gia Đình",
  "Gia Hạn",
  "Chính Chủ",
  "Cấp Sẵn",
];

interface CatalogEditModalProps {
  open: boolean;
  item: ServiceNameCategoryItem | null;
  systemProducts?: SystemProduct[];
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (data: {
    id: number;
    name: string;
    category: string;
    loginUrl: string;
    productId: number | null;
  }) => void;
}

export const CatalogEditModal: React.FC<CatalogEditModalProps> = ({
  open,
  item,
  systemProducts = [],
  isSubmitting = false,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [loginUrl, setLoginUrl] = useState("");
  const [productId, setProductId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (item) {
      setName(item.name || "");
      setCategory(item.category || "");
      setLoginUrl(item.loginUrl || "");
      setProductId(item.productId !== undefined ? item.productId : null);
      setError("");
    }
  }, [item, open]);

  if (!open || !item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Tên dịch vụ không được để trống!");
      return;
    }
    setError("");
    onSubmit({
      id: item.id,
      name: name.trim(),
      category: category.trim(),
      loginUrl: loginUrl.trim(),
      productId: productId ? Number(productId) : null,
    });
  };

  const handleTestLink = () => {
    if (!loginUrl.trim()) return;
    let url = loginUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-4 sm:p-6 space-y-4 animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-purple-400" />
            <span>Chỉnh Sửa Dịch Vụ & Cấu Hình Link</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          {/* Tên dịch vụ */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Tên Dịch Vụ / Gói (*)
            </label>
            <input
              type="text"
              placeholder="Ví dụ: GoogleOne 5000gb, Netflix, Canva..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Sản phẩm hệ thống liên kết */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sản Phẩm Hệ Thống Liên Kết (Tùy chọn)</span>
            </label>
            <select
              value={productId || ""}
              onChange={(e) => setProductId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-purple-500"
            >
              <option value="">-- Không liên kết (Dịch vụ tự do) --</option>
              {systemProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              💡 Liên kết dịch vụ kho này với loại sản phẩm bán hàng trong hệ thống (VD: Google One).
            </p>
          </div>

          {/* Tag Phân Loại / Biến Thể */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-purple-400" />
                <span>Tag Phân Loại / Biến Thể (*)</span>
              </label>
              {category && (
                <span className="text-[11px] text-purple-400 font-mono">
                  Tag: [{category}]
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                list="edit-suggested-tags-list"
                placeholder="Nhập hoặc chọn tag (VD: 5Tb, 2Tb, 1PC Cố Định, Slot Team...)"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 font-mono text-xs sm:text-sm"
              />
              <datalist id="edit-suggested-tags-list">
                {DEFAULT_SUGGESTED_TAGS.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>

            {/* Quick Tag Pills */}
            <div className="mt-2 space-y-1.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                Gợi ý tag có sẵn (Bấm chọn hoặc tự nhập mới):
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar p-1.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
                {DEFAULT_SUGGESTED_TAGS.map((t) => {
                  const isSelected = category.toLowerCase().trim() === t.toLowerCase().trim();
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setCategory(t)}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                        isSelected
                          ? "bg-purple-600 text-white font-bold border border-purple-400 shadow-sm shadow-purple-600/30 scale-105"
                          : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Preview Badge */}
            <div className="mt-2.5 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">Xem trước hiển thị:</span>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span>{name || "Tên dịch vụ"}</span>
                {category.trim() && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-white/10 text-white border border-white/10 lowercase first-letter:uppercase">
                    [{category.trim()}]
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* URL Đăng nhập */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>URL Trang Đăng Nhập / Link Quản Trị</span>
              </label>
              {loginUrl.trim() && (
                <button
                  type="button"
                  onClick={handleTestLink}
                  className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                  title="Mở thử link trên tab mới"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Mở thử</span>
                </button>
              )}
            </div>
            <input
              type="text"
              placeholder="Ví dụ: https://netflix.com/login, https://accounts.google.com..."
              value={loginUrl}
              onChange={(e) => setLoginUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 font-mono text-xs"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              💡 Link này dùng để mở Cloud Browser hoặc điều hướng đăng nhập riêng cho từng dịch vụ thay vì mặc định Adobe.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <span>Lưu Thay Đổi</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
