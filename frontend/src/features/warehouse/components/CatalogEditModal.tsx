import React, { useState, useEffect, useMemo } from "react";
import { Edit2, X, Check, ExternalLink, Link2, Loader2, Package, Tag } from "lucide-react";
import { ServiceNameCategoryItem, SystemProduct } from "../types";

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
  onTagChanged?: () => void;
}

export const CatalogEditModal: React.FC<CatalogEditModalProps> = ({
  open,
  item,
  systemProducts = [],
  isSubmitting = false,
  onClose,
  onSubmit,
  onTagChanged,
}) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [loginUrl, setLoginUrl] = useState("");
  const [productId, setProductId] = useState<number | null>(null);
  const [error, setError] = useState("");

  // Quản lý tag đang chọn để sửa / xóa theo chỉ đạo của Master
  const [selectedPillTag, setSelectedPillTag] = useState<string | null>(null);
  const [deletedTags, setDeletedTags] = useState<Set<string>>(new Set());
  const [renamedTags, setRenamedTags] = useState<Map<string, string>>(new Map());
  const [isTagActionLoading, setIsTagActionLoading] = useState(false);
  const [tagActionMessage, setTagActionMessage] = useState("");

  useEffect(() => {
    if (item) {
      setName(item.name || "");
      const initCat = item.category || "";
      setCategory(initCat);
      setSelectedPillTag(initCat.trim() ? initCat.trim() : null);
      setLoginUrl(item.loginUrl || "");
      setProductId(item.productId !== undefined ? item.productId : null);
      setError("");
      setDeletedTags(new Set());
      setRenamedTags(new Map());
      setTagActionMessage("");
    }
  }, [item, open]);

  // Chỉ lấy các tag đang lưu có sẵn của chính sản phẩm đó
  const productTags = useMemo(() => {
    const set = new Set<string>();

    const addTag = (t: string | undefined | null) => {
      if (!t || !t.trim()) return;
      let val = t.trim();
      if (renamedTags.has(val)) {
        val = renamedTags.get(val)!;
      }
      if (!deletedTags.has(val) && !deletedTags.has(t.trim())) {
        set.add(val);
      }
    };

    // 1. Tag từ availableTags của dịch vụ này
    (item?.availableTags || []).forEach(addTag);

    // 2. Tag từ các slot tài khoản thuộc dịch vụ này
    (item?.variants || []).forEach((v) => {
      if (v.tag && v.tag !== "Chưa gắn tag") {
        addTag(v.tag);
      }
    });

    // 3. Tag từ sản phẩm hệ thống được liên kết
    const activeProductId = productId !== null ? productId : item?.productId;
    if (activeProductId) {
      const sp = systemProducts.find((p) => p.id === activeProductId);
      (sp?.tags || []).forEach(addTag);
    }

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [item, productId, systemProducts, renamedTags, deletedTags]);

  const isDeleteMode = Boolean(selectedPillTag && category.trim() === "");
  const isRenameMode = Boolean(
    selectedPillTag &&
      category.trim() !== "" &&
      category.trim().toLowerCase() !== selectedPillTag.toLowerCase()
  );
  const isTagActionActive = isDeleteMode || isRenameMode;

  const handleConfirmTagAction = async () => {
    if (!selectedPillTag || isTagActionLoading) return;
    const activeProductId = productId !== null ? productId : item?.productId;

    setIsTagActionLoading(true);
    setTagActionMessage("");
    setError("");

    try {
      if (isDeleteMode) {
        // Master xóa hết text và bấm xác nhận (Tick) -> XÓA TAG
        const res = await fetch("/api/warehouse/catalog/tags", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: activeProductId,
            tag: selectedPillTag,
          }),
        });
        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.error || result.message || "Lỗi khi xóa tag");
        }

        const deleted = selectedPillTag;
        setDeletedTags((prev) => new Set(prev).add(deleted));
        setTagActionMessage(`Đã xóa vĩnh viễn tag "${deleted}" thành công!`);
        setSelectedPillTag(null);
        setCategory("");
        onTagChanged?.();
      } else if (isRenameMode) {
        // Master sửa chữ và bấm xác nhận (Tick) -> ĐỔI TÊN TAG
        const oldName = selectedPillTag;
        const newTagName = category.trim();
        const res = await fetch("/api/warehouse/catalog/tags/rename", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: activeProductId,
            oldTag: oldName,
            newTag: newTagName,
          }),
        });
        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.error || result.message || "Lỗi khi đổi tên tag");
        }

        setRenamedTags((prev) => new Map(prev).set(oldName, newTagName));
        setTagActionMessage(`Đã đổi tên tag thành "${newTagName}" thành công!`);
        setSelectedPillTag(newTagName);
        setCategory(newTagName);
        onTagChanged?.();
      }
    } catch (err: any) {
      setError(err?.message || "Không thể thực hiện thao tác với tag.");
    } finally {
      setIsTagActionLoading(false);
    }
  };

  const handleCancelTagAction = () => {
    if (selectedPillTag) {
      setCategory(selectedPillTag);
      setTagActionMessage("");
    }
  };

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

            {/* Ô input với 2 nút Tick (✓) và X (✕) theo chỉ đạo của Master */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Nhập hoặc chọn tag của sản phẩm này (VD: 5Tb, 1PC Cố Định...)"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setTagActionMessage("");
                  }}
                  className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none font-mono text-xs sm:text-sm transition-colors [&::-webkit-calendar-picker-indicator]:hidden ${
                    isDeleteMode
                      ? "border-rose-500/80 focus:border-rose-400 shadow-sm shadow-rose-500/20"
                      : isRenameMode
                      ? "border-emerald-500/80 focus:border-emerald-400 shadow-sm shadow-emerald-500/20"
                      : "border-slate-700 focus:border-purple-500"
                  }`}
                />
              </div>

              {/* 2 nút nhỏ bên phải: Tick (✓) và X (✕) */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleConfirmTagAction}
                  disabled={isTagActionLoading || !isTagActionActive}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                    isDeleteMode
                      ? "bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-600/30 scale-105"
                      : isRenameMode
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-600/30 scale-105"
                      : "bg-slate-800/40 text-slate-600 border-slate-800 cursor-not-allowed opacity-40"
                  }`}
                  title={
                    isDeleteMode
                      ? `Xác nhận: XÓA VĨNH VIỄN tag "${selectedPillTag}" khỏi hệ thống`
                      : isRenameMode
                      ? `Xác nhận: ĐỔI TÊN tag "${selectedPillTag}" ➔ "${category.trim()}"`
                      : "Xác nhận (Tick)"
                  }
                >
                  {isTagActionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCancelTagAction}
                  disabled={!isTagActionActive}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                    isTagActionActive
                      ? "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white"
                      : "bg-slate-800/40 text-slate-600 border-slate-800 cursor-not-allowed opacity-40"
                  }`}
                  title="Hủy bỏ, khôi phục lại tag cũ"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Danh sách Tag đang lưu có sẵn của sản phẩm đó */}
            {productTags.length > 0 ? (
              <div className="mt-2.5 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  <span>Tag có sẵn của sản phẩm này:</span>
                  <span className="text-[10px] text-purple-400/80 font-normal lowercase">
                    (bấm để điền & sửa đổi tùy ý)
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar p-1.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
                  {productTags.map((t) => {
                    const isSelected = selectedPillTag?.toLowerCase().trim() === t.toLowerCase().trim();
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setCategory(t);
                          setSelectedPillTag(t);
                          setTagActionMessage("");
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                          isSelected
                            ? "bg-purple-600 text-white font-bold border border-purple-400 shadow-sm shadow-purple-600/30 scale-105"
                            : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60"
                        }`}
                        title="Bấm để đưa tag này vào ô nhập để dùng, sửa hoặc xóa"
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="mt-1.5 text-[11px] text-slate-500 italic">
                Sản phẩm này chưa có tag nào lưu sẵn. Master có thể tự do nhập tag mới ở ô trên.
              </p>
            )}

            {/* Live Preview Badge */}
            <div className="mt-2.5 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">Xem trước hiển thị:</span>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span>{name || "Tên dịch vụ"}</span>
                {category.trim() && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-white/10 text-white border border-white/10">
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
