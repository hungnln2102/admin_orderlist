import React from "react";
import {
  AlertTriangle,
  Calendar,
  ExternalLink,
  HardDrive,
  ImagePlus,
  Images,
  Maximize2,
  RefreshCcw,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { CopyButton, CustomSelect, GlassCard } from "@/shared/components";
import { formatDateDisplay } from "@/shared/utils/format";
import { useProductImages } from "../hooks/useProductImages";
import { formatFileSize, getImageExtension } from "../utils";
import type { ImageFormatFilter, ImageSortOption } from "../types";
import { ImageActionModal } from "./ImageActionModal";
import { ImagePreviewModal } from "./ImagePreviewModal";

const FORMAT_FILTERS: { id: ImageFormatFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "jpg", label: "JPG" },
  { id: "png", label: "PNG" },
  { id: "webp", label: "WebP" },
];

const SORT_OPTIONS: { value: ImageSortOption; label: string }[] = [
  { value: "newest", label: "Mới cập nhật" },
  { value: "name_asc", label: "Tên tệp A → Z" },
  { value: "size_desc", label: "Dung lượng lớn nhất" },
];

export const ProductImagesTab: React.FC = () => {
  const {
    items,
    filteredItems,
    totalStorageBytes,
    formatCounts,
    loading,
    error,
    saving,
    searchQuery,
    setSearchQuery,
    formatFilter,
    setFormatFilter,
    sortBy,
    setSortBy,
    action,
    selectedFile,
    requiredImageType,
    previewImage,
    setPreviewImage,
    getDisplayUrl,
    openAction,
    closeAction,
    validateAndSelectFile,
    handleSubmitAction,
    refresh,
  } = useProductImages();

  const hasActiveFilter = Boolean(searchQuery.trim()) || formatFilter !== "all";

  return (
    <section aria-label="Quản lý ảnh" className="space-y-4">
      {/* Thanh công cụ tổng quan + tìm kiếm + lọc + upload */}
      <GlassCard className="!p-4 border-slate-800/80 space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Thông số tổng quan + lọc định dạng */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-1.5 text-xs">
              <span className="inline-flex items-center gap-1.5 text-slate-300">
                <Images className="h-3.5 w-3.5 text-cyan-400" />
                <strong className="font-mono font-bold text-white tabular-nums">
                  {items.length}
                </strong>{" "}
                ảnh
              </span>
              <span className="h-3.5 w-px bg-slate-800" aria-hidden="true" />
              <span className="inline-flex items-center gap-1.5 text-slate-300">
                <HardDrive className="h-3.5 w-3.5 text-indigo-400" />
                <strong className="font-mono font-bold text-white tabular-nums">
                  {formatFileSize(totalStorageBytes)}
                </strong>
              </span>
            </div>

            <div
              role="group"
              aria-label="Lọc theo định dạng ảnh"
              className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/70 p-1"
            >
              {FORMAT_FILTERS.map((fmt) => {
                const active = formatFilter === fmt.id;
                const count = formatCounts[fmt.id];
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFormatFilter(fmt.id)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                      active
                        ? "bg-cyan-500/15 text-cyan-200 border border-cyan-500/35"
                        : "border border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                    }`}
                  >
                    <span>{fmt.label}</span>
                    <span
                      className={`rounded px-1 py-0.2 font-mono text-[10px] font-bold tabular-nums ${
                        active
                          ? "bg-cyan-500/20 text-cyan-200"
                          : "bg-slate-800/90 text-slate-500"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nút thao tác chính */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={loading || saving}
              onClick={refresh}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
              <span>Tải lại</span>
            </button>

            <button
              type="button"
              disabled={loading || Boolean(error)}
              onClick={() => openAction({ type: "upload" })}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-cyan-950/40 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
            >
              <ImagePlus aria-hidden="true" className="h-4 w-4" />
              <span>Tải ảnh lên</span>
            </button>
          </div>
        </div>

        {/* Hàng tìm kiếm & sắp xếp */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2.5 border-t border-slate-800/70">
          <div className="relative flex-1 min-w-0">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
            />
            <input
              id="website-image-search"
              type="text"
              aria-label="Tìm ảnh theo tên tệp"
              placeholder="Tìm nhanh theo tên tệp ảnh (VD: Adobe, Autodesk, Canva...)"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 pl-9 pr-8 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Xóa từ khóa tìm ảnh"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="w-full sm:w-48 shrink-0">
            <CustomSelect
              value={sortBy}
              onChange={(val) => setSortBy(val as ImageSortOption)}
              options={SORT_OPTIONS}
              accent="cyan"
              size="sm"
              ariaLabel="Sắp xếp danh sách ảnh"
            />
          </div>
        </div>
      </GlassCard>

      {/* Nội dung lưới ảnh */}
      {loading ? (
        <div
          role="status"
          aria-label="Đang tải danh sách ảnh"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-slate-800/80 bg-slate-900/60 overflow-hidden animate-pulse"
            >
              <div className="h-44 bg-slate-950/90" />
              <div className="p-3.5 space-y-3">
                <div className="h-4 w-32 rounded bg-slate-800" />
                <div className="h-7 w-full rounded-lg bg-slate-800/70" />
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/70">
                  <div className="h-8 rounded-lg bg-slate-800/80" />
                  <div className="h-8 rounded-lg bg-slate-800/80" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <GlassCard className="!p-10 text-center border-rose-500/25">
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-rose-200">Không thể tải thư viện ảnh</p>
              <p className="text-xs text-slate-400 max-w-md">{error}</p>
            </div>
            <button
              type="button"
              onClick={refresh}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:border-slate-500 transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Thử lại
            </button>
          </div>
        </GlassCard>
      ) : filteredItems.length === 0 ? (
        <GlassCard className="!p-12 text-center border-slate-800/80">
          <div className="flex flex-col items-center gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500">
              <Images className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-200">
                {hasActiveFilter
                  ? "Không có ảnh nào khớp bộ lọc hiện tại"
                  : "Thư viện ảnh sản phẩm đang trống"}
              </p>
              <p className="text-xs text-slate-400 max-w-sm">
                {hasActiveFilter
                  ? "Thử xóa từ khóa tìm kiếm hoặc chọn định dạng khác."
                  : "Hãy tải lên ảnh đầu tiên để sử dụng cho danh mục sản phẩm trên website."}
              </p>
            </div>
            {hasActiveFilter ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setFormatFilter("all");
                }}
                className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3.5 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20 transition-colors cursor-pointer"
              >
                Xóa bộ lọc
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openAction({ type: "upload" })}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:brightness-110 transition-all cursor-pointer"
              >
                <ImagePlus className="h-4 w-4" />
                Tải ảnh lên ngay
              </button>
            )}
          </div>
        </GlassCard>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((image) => {
            const previewUrl = getDisplayUrl(image);
            const ext = getImageExtension(image.key).toUpperCase();

            return (
              <li key={image.key} className="min-w-0">
                <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-800/85 bg-slate-900/75 backdrop-blur-md transition-all duration-200 hover:border-cyan-500/40 hover:shadow-xl hover:shadow-cyan-950/30">
                  {/* Khung hiển thị ảnh */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setPreviewImage(image)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setPreviewImage(image);
                      }
                    }}
                    aria-label={`Xem phóng to ${image.key}`}
                    className="relative flex h-44 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_center,rgba(30,41,59,0.55)_0%,rgba(2,6,23,0.96)_78%)] p-4 cursor-pointer"
                  >
                    <img
                      src={previewUrl}
                      alt={image.key}
                      loading="lazy"
                      className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />

                    {/* Badge định dạng & dung lượng */}
                    {ext && (
                      <span className="absolute top-2.5 left-2.5 rounded-md border border-slate-700/80 bg-slate-950/85 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-300 backdrop-blur-sm">
                        {ext}
                      </span>
                    )}
                    <span className="absolute top-2.5 right-2.5 rounded-md border border-slate-800 bg-slate-950/85 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-300 backdrop-blur-sm tabular-nums">
                      {formatFileSize(image.size)}
                    </span>

                    {/* Lớp phủ thao tác nhanh khi hover */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-end gap-1.5 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-slate-900/90 px-2 py-1 text-[11px] font-semibold text-slate-100 backdrop-blur-md">
                        <Maximize2 className="h-3 w-3 text-cyan-400" />
                        Xem lớn
                      </span>
                    </div>
                  </div>

                  {/* Thông tin & Thao tác */}
                  <div className="flex flex-1 flex-col gap-2.5 p-3.5">
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h2
                          title={image.key}
                          className="truncate text-sm font-bold text-slate-100 group-hover:text-white transition-colors"
                        >
                          {image.key}
                        </h2>
                        <a
                          href={image.url}
                          target="_blank"
                          rel="noreferrer"
                          title="Mở ảnh trong tab mới"
                          className="shrink-0 rounded-md p-1 text-slate-500 hover:bg-slate-800 hover:text-cyan-300 transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono tabular-nums">
                        <Calendar className="h-3 w-3 shrink-0" />
                        <span>{formatDateDisplay(image.lastModified)}</span>
                      </div>
                    </div>

                    {/* URL + CopyButton */}
                    <div className="flex items-center gap-1.5 rounded-xl border border-slate-800/90 bg-slate-950/80 px-2.5 py-1.5">
                      <a
                        href={image.url}
                        target="_blank"
                        rel="noreferrer"
                        title={image.url}
                        className="min-w-0 flex-1 truncate font-mono text-[11px] text-cyan-300/90 hover:text-cyan-200 hover:underline"
                      >
                        {image.url}
                      </a>
                      <CopyButton
                        text={image.url}
                        itemKey={image.key}
                        copiedLabel=""
                        size="xs"
                        variant="subtle"
                        title="Sao chép đường dẫn ảnh"
                      />
                    </div>

                    {/* Nút hành động căn thẳng hàng dưới đáy card */}
                    <div className="mt-auto grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-800/70">
                      <button
                        type="button"
                        onClick={() => openAction({ type: "replace", image })}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700/90 bg-slate-900/90 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:border-cyan-500/50 hover:bg-cyan-500/10 hover:text-cyan-200 active:scale-[0.98] transition-all cursor-pointer"
                      >
                        <RefreshCcw className="h-3.5 w-3.5" />
                        <span>Thay ảnh</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openAction({ type: "delete", image })}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-300 hover:border-rose-500/60 hover:bg-rose-500/20 active:scale-[0.98] transition-all cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Xóa ảnh</span>
                      </button>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      <ImageActionModal
        action={action}
        selectedFile={selectedFile}
        requiredImageType={requiredImageType}
        currentImagePreviewUrl={
          action && action.type !== "upload" ? getDisplayUrl(action.image) : undefined
        }
        saving={saving}
        onSelectFile={validateAndSelectFile}
        onClose={closeAction}
        onSubmit={handleSubmitAction}
      />

      <ImagePreviewModal
        image={previewImage}
        previewUrl={previewImage ? getDisplayUrl(previewImage) : ""}
        onClose={() => setPreviewImage(null)}
        onReplace={(img) => openAction({ type: "replace", image: img })}
        onDelete={(img) => openAction({ type: "delete", image: img })}
      />
    </section>
  );
};
