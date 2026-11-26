import React, { lazy, Suspense, useRef } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileEdit,
  FileText,
  RefreshCw,
  Search,
  Tag,
  X,
} from "lucide-react";
import { CustomSelect, GlassCard, TablePagination } from "@/shared/components";
import { formatDateDisplay } from "@/shared/utils/format";
import { PRODUCT_CATEGORIES } from "@/features/pricing/types";
import { EDITORIAL_STATUS_LABEL, editorialPlainText } from "../editorialContent";
import { useVariantDescriptions } from "../hooks/useVariantDescriptions";
import type { EditorialStatusFilter, VariantStatusFilter } from "../types";
import { VariantThumbnail } from "./VariantThumbnail";

const VariantEditorialWorkspace = lazy(() =>
  import("./VariantEditorialWorkspace").then((module) => ({ default: module.VariantEditorialWorkspace }))
);

const STATUS_TABS: { id: VariantStatusFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "active", label: "Đang bán" },
  { id: "inactive", label: "Ngừng bán" },
];

const editorialOptions = [
  { value: "all", label: "Mọi trạng thái biên tập" },
  { value: "unstarted", label: "Chưa biên tập" },
  ...Object.entries(EDITORIAL_STATUS_LABEL).map(([value, label]) => ({ value, label })),
];

export const VariantDescriptionsTab: React.FC<{ onWorkspaceChange: (isOpen: boolean) => void }> = ({ onWorkspaceChange }) => {
  const searchHeading = useRef<HTMLElement>(null);
  const {
    searchInput,
    setSearchInput,
    activeSearch,
    statusFilter,
    setStatusFilter,
    editorialStatus,
    setEditorialStatus,
    category,
    setCategory,
    knownCategories,
    page,
    pageSize,
    totalItems,
    totalPages,
    counts,
    variants,
    loading,
    error,
    editing,
    submitSearchImmediate,
    clearSearch,
    setPage,
    setPageSize,
    refresh,
    openEditor,
    closeEditor,
  } = useVariantDescriptions();

  const countForTab = (tabId: VariantStatusFilter) => {
    if (tabId === "active") return counts.active;
    if (tabId === "inactive") return counts.inactive;
    return counts.total;
  };

  if (editing) {
    return (
      <Suspense fallback={<p role="status" className="text-sm text-slate-400">Đang mở trình soạn thảo…</p>}>
        <VariantEditorialWorkspace
          key={editing.id}
          variant={editing}
          onExit={() => {
            closeEditor();
            onWorkspaceChange(false);
            requestAnimationFrame(() => searchHeading.current?.focus());
          }}
        />
      </Suspense>
    );
  }

  return (
    <section ref={searchHeading} tabIndex={-1} aria-label="Nội dung biến thể" className="space-y-4 outline-none">
      {/* Thanh tìm kiếm & bộ lọc trạng thái */}
      <GlassCard className="!p-4 border-slate-800/80 space-y-3.5">
        <div className="flex flex-col gap-2 sm:flex-row">
          <CustomSelect
            className="w-full sm:max-w-xs"
            ariaLabel="Lọc theo trạng thái biên tập"
            options={editorialOptions}
            value={editorialStatus}
            onChange={(value) => setEditorialStatus(value as EditorialStatusFilter)}
          />
          <CustomSelect
            className="w-full sm:max-w-xs"
            ariaLabel="Lọc theo danh mục"
            options={[
              { value: "", label: "Mọi danh mục" },
              ...[...new Set([...PRODUCT_CATEGORIES, ...knownCategories])].map((value) => ({ value, label: value })),
            ]}
            value={category}
            onChange={setCategory}
          />
        </div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Segmented filter theo trạng thái bán */}
          <div
            role="group"
            aria-label="Lọc theo trạng thái biến thể"
            className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/70 p-1"
          >
            {STATUS_TABS.map((item) => {
              const active = statusFilter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setStatusFilter(item.id)}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? "bg-cyan-500/15 text-cyan-200 border border-cyan-500/35 shadow-sm"
                      : "border border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                  }`}
                >
                  <span>{item.label}</span>
                  <span
                    className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums ${
                      active
                        ? "bg-cyan-500/20 text-cyan-200"
                        : "bg-slate-800/90 text-slate-400"
                    }`}
                  >
                    {countForTab(item.id)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Tìm kiếm + Tải lại */}
          <form
            className="flex flex-1 lg:max-w-md items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              submitSearchImmediate();
            }}
          >
            <div className="relative flex-1 min-w-0">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
              />
              <input
                id="website-variant-search"
                type="text"
                aria-label="Tìm biến thể"
                placeholder="Tìm theo tên hoặc mã biến thể..."
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 pl-9 pr-8 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Xóa từ khóa tìm kiếm"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              title="Tải lại danh sách biến thể"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
              <span className="hidden sm:inline">Tải lại</span>
            </button>
          </form>
        </div>

        {/* Thanh thông tin kết quả lọc */}
        {!loading && !error && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-800/70 text-xs text-slate-400">
            <span>
              Tìm thấy{" "}
              <strong className="font-mono font-bold text-slate-200 tabular-nums">
                {totalItems}
              </strong>{" "}
              biến thể
              {activeSearch && (
                <>
                  {" "}
                  cho từ khóa{" "}
                  <span className="font-semibold text-cyan-300">“{activeSearch}”</span>
                </>
              )}
            </span>
            <span className="text-[11px] text-slate-500">
              Trang {page} / {totalPages}
            </span>
          </div>
        )}
      </GlassCard>

      {/* Danh sách biến thể */}
      <GlassCard className="!p-0 overflow-hidden border-slate-800/80">
        {loading ? (
          <div role="status" aria-label="Đang tải biến thể" className="divide-y divide-slate-800/70">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-4 px-4 sm:px-5 py-4 animate-pulse"
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <div className="h-11 w-11 rounded-xl bg-slate-800/80 shrink-0" />
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="h-4 w-48 max-w-full rounded bg-slate-800/90" />
                    <div className="h-3 w-80 max-w-full rounded bg-slate-800/60" />
                  </div>
                </div>
                <div className="h-8 w-24 rounded-xl bg-slate-800/80 shrink-0" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div
            role="alert"
            className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center"
          >
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-rose-200">Không thể tải danh sách biến thể</p>
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
        ) : variants.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500">
              <FileText className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-200">Không tìm thấy biến thể phù hợp</p>
              <p className="text-xs text-slate-400 max-w-sm">
                {activeSearch || statusFilter !== "all"
                  ? "Thử thay đổi từ khóa tìm kiếm hoặc đặt lại bộ lọc trạng thái."
                  : "Chưa có biến thể sản phẩm nào trong hệ thống."}
              </p>
            </div>
            {(activeSearch || statusFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  clearSearch();
                  setStatusFilter("all");
                }}
                className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3.5 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20 transition-colors cursor-pointer"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        ) : (
          <>
            <ul className="divide-y divide-slate-800/70">
              {variants.map((variant) => {
                const displayName = variant.san_pham || variant.package_product;
                const description = editorialPlainText(variant.description ?? "");
                const hasDescription = Boolean(variant.description?.trim());
                return (
                  <li
                    key={variant.id}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 px-4 sm:px-5 py-3.5 hover:bg-slate-900/55 transition-colors"
                  >
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <VariantThumbnail src={variant.image_url} alt={displayName} />

                      <div className="min-w-0 flex-1 space-y-1.5">
                        {/* Hàng tiêu đề + badges */}
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-sm font-bold text-slate-100 break-words group-hover:text-white transition-colors">
                            {displayName}
                          </h2>

                          {variant.package_product &&
                            variant.package_product !== displayName && (
                              <code className="rounded-md border border-slate-800 bg-slate-950/90 px-1.5 py-0.5 font-mono text-[11px] text-slate-400">
                                {variant.package_product}
                              </code>
                            )}

                          {variant.category && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-slate-800 bg-slate-900/90 px-2 py-0.5 text-[11px] font-medium text-slate-300">
                              <Tag className="h-2.5 w-2.5 text-slate-500" />
                              {variant.category}
                            </span>
                          )}

                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold border ${
                              variant.is_active
                                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                                : "border-slate-700/80 bg-slate-800/60 text-slate-400"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                variant.is_active ? "bg-emerald-400" : "bg-slate-500"
                              }`}
                            />
                            {variant.is_active ? "Đang bán" : "Ngừng bán"}
                          </span>

                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold border ${
                              hasDescription
                                ? "border-cyan-500/25 bg-cyan-500/10 text-cyan-300"
                                : "border-amber-500/25 bg-amber-500/10 text-amber-300"
                            }`}
                          >
                            {hasDescription ? (
                              <>
                                <CheckCircle2 className="h-3 w-3" />
                                Đã có mô tả
                              </>
                            ) : (
                              "Chưa có mô tả"
                            )}
                          </span>
                        </div>

                        {/* Đoạn xem trước mô tả */}
                        <p
                          className={`line-clamp-2 whitespace-pre-wrap break-words text-xs sm:text-[13px] leading-relaxed max-w-3xl ${
                            hasDescription
                              ? "text-slate-300"
                              : "italic text-slate-500"
                          }`}
                        >
                          {hasDescription
                            ? description || "Mô tả có nội dung hình ảnh."
                            : "Biến thể này chưa có nội dung mô tả hiển thị trên website."}
                        </p>
                      </div>
                    </div>

                    {/* Cột phải: Ngày cập nhật + nút Sửa */}
                    <div className="flex flex-wrap items-center gap-2 pl-14 sm:shrink-0 sm:flex-col sm:items-end sm:justify-center sm:pl-0">
                      <button
                        type="button"
                        onClick={() => {
                          openEditor(variant);
                          onWorkspaceChange(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/90 bg-slate-900/90 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-500/50 hover:bg-cyan-500/10 hover:text-cyan-200 active:scale-[0.98] transition-all cursor-pointer"
                      >
                        <FileEdit className="h-3.5 w-3.5" />
                        <span>Biên tập mô tả</span>
                      </button>
                      <span className="text-xs font-medium text-cyan-200">
                        {variant.editorial_status ? EDITORIAL_STATUS_LABEL[variant.editorial_status] : "Chưa biên tập"}
                      </span>

                      <div className="space-y-1 text-[11px] text-slate-400 sm:text-right">
                        {variant.editorial_updated_at && (
                          <p className="flex items-center gap-1 sm:justify-end">
                            <Clock aria-hidden="true" className="h-3 w-3" />
                            Biên tập {formatDateDisplay(variant.editorial_updated_at)}
                          </p>
                        )}
                        {variant.published_at && <p>Xuất bản {formatDateDisplay(variant.published_at)}</p>}
                        {!variant.editorial_updated_at && !variant.published_at && variant.updated_at && (
                          <p>Cập nhật {formatDateDisplay(variant.updated_at)}</p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="px-4 sm:px-5 pb-4">
              <TablePagination
                currentPage={page}
                totalPages={totalPages}
                pageSize={pageSize}
                pageSizeOptions={[10, 15, 20, 50]}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                disabled={loading}
              />
            </div>
          </>
        )}
      </GlassCard>

    </section>
  );
};
