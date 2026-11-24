import React, { useState, useEffect, useMemo } from "react";
import { CustomSelect, ToggleSwitch } from "@/shared/components";
import {
  Edit2,
  X,
  Check,
  ExternalLink,
  Link2,
  Loader2,
  Package,
  Tag,
  AlertCircle,
} from "lucide-react";
import { useNotification } from "@/shared/context/NotificationContext";
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
    syncSlotsTag?: boolean;
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
  const notify = useNotification();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [loginUrl, setLoginUrl] = useState("");
  const [productId, setProductId] = useState<number | null>(null);
  const [syncSlotsTag, setSyncSlotsTag] = useState(false);
  const [error, setError] = useState("");

  // Quản lý tag đang chọn để sửa / xóa
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
      setSyncSlotsTag(false);
      setError("");
      setDeletedTags(new Set());
      setRenamedTags(new Map());
      setTagActionMessage("");
    }
  }, [item, open]);

  // Danh sách tag có sẵn của sản phẩm
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

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [item, renamedTags, deletedTags]);

  const isRenameMode = Boolean(
    selectedPillTag &&
      category.trim() !== "" &&
      category.trim().toLowerCase() !== selectedPillTag.toLowerCase()
  );

  // Xóa tag khỏi dịch vụ kho (Dùng popup xác nhận dự án)
  const handleDeleteTagDirect = (tagToDelete: string) => {
    if (!item) return;

    notify.confirm({
      title: "Xác Nhận Xóa Vĩnh Viễn Tag",
      message: `Master có chắc chắn muốn XÓA VĨNH VIỄN tag "${tagToDelete}" khỏi dịch vụ kho này không?`,
      confirmText: "Xóa Vĩnh Viễn",
      cancelText: "Hủy Bỏ",
      danger: true,
      onConfirm: async () => {
        setIsTagActionLoading(true);
        setTagActionMessage("");
        setError("");

        try {
          const res = await fetch("/api/warehouse/catalog/tags", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              catalogId: item.id,
              tag: tagToDelete,
            }),
          });
          const result = await res.json();
          if (!res.ok) {
            throw new Error(result.error || result.message || "Lỗi khi xóa tag");
          }

          setDeletedTags((prev) => new Set(prev).add(tagToDelete));
          notify.success(`Đã xóa vĩnh viễn tag "${tagToDelete}" khỏi dịch vụ kho này!`, "Xóa Thành Công");
          setTagActionMessage(`Đã xóa vĩnh viễn tag "${tagToDelete}" khỏi dịch vụ kho này!`);
          if (category.trim().toLowerCase() === tagToDelete.toLowerCase()) {
            setCategory("");
          }
          if (selectedPillTag?.toLowerCase() === tagToDelete.toLowerCase()) {
            setSelectedPillTag(null);
          }
          onTagChanged?.();
        } catch (err: any) {
          setError(err?.message || "Không thể xóa tag.");
          notify.error(err?.message || "Không thể xóa tag.", "Lỗi");
        } finally {
          setIsTagActionLoading(false);
        }
      },
    });
  };

  // Đổi tên tag trong dịch vụ kho
  const handleConfirmRename = async () => {
    if (!selectedPillTag || !isRenameMode || isTagActionLoading) return;
    if (!item) return;
    const oldName = selectedPillTag;
    const newTagName = category.trim();

    setIsTagActionLoading(true);
    setTagActionMessage("");
    setError("");

    try {
      const res = await fetch("/api/warehouse/catalog/tags/rename", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catalogId: item.id,
          oldTag: oldName,
          newTag: newTagName,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || result.message || "Lỗi khi đổi tên tag");
      }

      setRenamedTags((prev) => new Map(prev).set(oldName, newTagName));
      setTagActionMessage(`Đã đổi tên tag từ "${oldName}" thành "${newTagName}" thành công!`);
      setSelectedPillTag(newTagName);
      setCategory(newTagName);
      onTagChanged?.();
    } catch (err: any) {
      setError(err?.message || "Không thể đổi tên tag.");
    } finally {
      setIsTagActionLoading(false);
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
      syncSlotsTag,
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl p-5 sm:p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 text-slate-200">
        <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
              <Edit2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Chỉnh Sửa Dịch Vụ & Cấu Hình Link
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Dịch vụ: <span className="text-purple-300 font-semibold">{item.name}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {tagActionMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{tagActionMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          {/* Tên dịch vụ */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tên Dịch Vụ / Gói (*)
            </label>
            <input
              type="text"
              placeholder="Ví dụ: GoogleOne 5000gb, Netflix, Canva..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 transition-colors text-xs sm:text-sm font-medium"
            />
          </div>

          {/* Sản phẩm hệ thống liên kết */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sản Phẩm Hệ Thống Liên Kết (Tùy chọn)</span>
            </label>
            <CustomSelect
              value={productId ? String(productId) : ""}
              accent="purple"
              className="bg-slate-950/80"
              onChange={(val) => setProductId(val ? Number(val) : null)}
              options={[
                { value: "", label: "-- Không liên kết (Dịch vụ tự do) --" },
                ...systemProducts.map((p) => ({
                  value: String(p.id),
                  label: p.name,
                })),
              ]}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              💡 Liên kết dịch vụ kho này với loại sản phẩm bán hàng trong hệ thống (VD: Adobe, Google One).
            </p>
          </div>

          {/* Tag Phân Loại / Biến Thể */}
          <div className="rounded-2xl border border-purple-500/25 bg-slate-950/60 p-4 space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-purple-400" />
                <span>Tag phân loại kho mặc định</span>
              </label>
              {category.trim() ? (
                <span className="text-[11px] text-purple-300 font-mono font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30">
                  [{category.trim()}]
                </span>
              ) : (
                <span className="text-[11px] text-slate-500 italic">Chưa gán tag</span>
              )}
            </div>

            {/* Ô nhập Tag có nút Xóa để trống (Clear) */}
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Nhập tag mới hoặc chọn từ danh sách bên dưới (để trống nếu không gắn tag)"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setTagActionMessage("");
                }}
                className="w-full pl-3.5 pr-20 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 font-mono text-xs sm:text-sm transition-colors"
              />
              {category.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setCategory("");
                    setSelectedPillTag(null);
                    setTagActionMessage("");
                  }}
                  className="absolute right-2 px-2 py-1 rounded-lg text-[10px] text-slate-400 hover:text-rose-300 hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Xóa trống tag này"
                >
                  Xóa trống
                </button>
              )}
            </div>

            {/* Banner gợi ý Đổi tên tag trong dịch vụ kho nếu Master sửa khác tag đang chọn */}
            {isRenameMode && (
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs animate-in fade-in">
                <span className="text-[11px] leading-tight">
                  Đổi tên tag <strong>"{selectedPillTag}"</strong> thành <strong>"{category.trim()}"</strong> trên toàn hệ thống?
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleConfirmRename}
                    disabled={isTagActionLoading}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm"
                  >
                    {isTagActionLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                    <span>Đổi tên</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategory(selectedPillTag || "")}
                    className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                    title="Khôi phục tên cũ"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Danh sách Tag có sẵn với nút XÓA TRỰC TIẾP (✕) trên từng Tag */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-semibold text-slate-300">Tag có sẵn của sản phẩm này:</span>
                <span className="text-[10px] text-purple-400 font-mono">
                  (bấm để chọn • bấm ✕ để xóa vĩnh viễn)
                </span>
              </div>

              {productTags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                  {productTags.map((t) => {
                    const isSelected = category.trim().toLowerCase() === t.toLowerCase();
                    return (
                      <div
                        key={t}
                        className={`inline-flex items-center rounded-lg border text-xs font-medium transition-all ${
                          isSelected
                            ? "bg-purple-600/30 border-purple-500/80 text-purple-200 shadow-sm"
                            : "bg-slate-800/90 border-slate-700/80 text-slate-300 hover:bg-slate-700 hover:text-white"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setCategory(t);
                            setSelectedPillTag(t);
                            setTagActionMessage("");
                          }}
                          className="px-2.5 py-1 cursor-pointer font-mono text-[11px]"
                          title={`Bấm để chọn tag "${t}"`}
                        >
                          {t}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTagDirect(t);
                          }}
                          disabled={isTagActionLoading}
                          className="p-1 pr-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-r-lg transition-colors cursor-pointer border-l border-white/10"
                          title={`Xóa vĩnh viễn tag "${t}" khỏi toàn bộ kho hàng`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic py-1">
                  Chưa có tag nào trong kho. Master có thể tự do nhập tag mới ở ô phía trên.
                </p>
              )}
            </div>

            {/* Công tắc: Đồng bộ tag cho toàn bộ tài khoản kho hiện có */}
            <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-3 text-xs">
              <div className="flex-1">
                <span className="font-semibold text-slate-200 block">
                  Đồng bộ tag này cho toàn bộ {item.totalAccounts || 0} tài khoản kho hiện có
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                  {category.trim()
                    ? `Tất cả các tài khoản của "${item.name}" sẽ được cập nhật sang tag "[${category.trim()}]".`
                    : `Gỡ bỏ toàn bộ tag của các tài khoản "${item.name}" về trạng thái không có tag.`}
                </p>
              </div>
              <ToggleSwitch
                checked={syncSlotsTag}
                onChange={setSyncSlotsTag}
                variant="purple"
                size="sm"
              />
            </div>

            {/* Live Preview Badge */}
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
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
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 font-mono text-xs transition-colors"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              💡 Link này dùng để mở Cloud Browser hoặc điều hướng đăng nhập riêng cho từng dịch vụ thay vì mặc định.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer active:scale-95"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
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
