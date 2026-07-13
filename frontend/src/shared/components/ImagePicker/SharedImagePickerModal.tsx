import React, { useEffect, useMemo, useState } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

export interface ImageItem {
  fileName: string;
  url: string;
}

export type SharedImagePickerModalProps<T extends ImageItem> = {
  open: boolean;
  images: T[];
  selectedImage: T | null;
  loading: boolean;
  uploading: boolean;
  deleting: boolean;
  error: string | null;
  uploadError: string | null;
  title?: string;
  onClose: () => void;
  onSelect: (item: T) => void;
  onUseSelected: () => void;
  onUploadClick: () => void;
  onDeleteSelected: () => void;
};

export function SharedImagePickerModal<T extends ImageItem>({
  open,
  images,
  selectedImage,
  loading,
  uploading,
  deleting,
  error,
  uploadError,
  title = "Chọn hình ảnh",
  onClose,
  onSelect,
  onUseSelected,
  onUploadClick,
  onDeleteSelected,
}: SharedImagePickerModalProps<T>) {
  const [nameFilter, setNameFilter] = useState("");

  useEffect(() => {
    if (open) setNameFilter("");
  }, [open]);

  const filteredImages = useMemo(() => {
    const q = nameFilter.trim().toLowerCase();
    if (!q) return images;
    return images.filter((item) => item.fileName.toLowerCase().includes(q));
  }, [images, nameFilter]);

  if (!open) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-6 animate-in fade-in duration-200">
        <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-[#0b1220] shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <h3 className="text-lg font-semibold text-white shrink-0">
              {title}
            </h3>
            <div className="relative w-full sm:max-w-xs">
              <MagnifyingGlassIcon
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
                aria-hidden
              />
              <input
                type="search"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                placeholder="Lọc theo tên file..."
                className="w-full rounded-lg border border-white/15 bg-black/30 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/40 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>
          <div className="p-5 space-y-5">
            {loading ? (
              <p className="text-sm text-white/70">Đang tải hình ảnh...</p>
            ) : images.length === 0 ? (
              <p className="text-sm text-white/70">Chưa có hình ảnh nào.</p>
            ) : filteredImages.length === 0 ? (
              <p className="text-sm text-white/70">
                Không có ảnh khớp &quot;{nameFilter.trim()}&quot;. Thử từ khóa khác.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[45vh] overflow-y-auto custom-scrollbar pr-2">
                {filteredImages.map((item) => {
                  const isSelected = selectedImage?.fileName === item.fileName;
                  return (
                    <button
                      key={item.fileName}
                      type="button"
                      className={`rounded-xl border p-2 text-left transition ${
                        isSelected
                          ? "border-indigo-400 ring-2 ring-indigo-400/40 bg-indigo-500/10"
                          : "border-white/10 hover:border-white/30 hover:bg-white/5"
                      }`}
                      onClick={() => onSelect(item)}
                    >
                      <div className="aspect-square w-full overflow-hidden rounded-lg bg-black/40 flex items-center justify-center p-1">
                        <img
                          src={item.url}
                          alt={item.fileName}
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <p className="mt-2 truncate text-[11px] font-medium text-white/70 text-center">
                        {item.fileName}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            {(error || uploadError) && (
              <div className="space-y-1 rounded-lg border border-rose-500/30 bg-rose-950/40 px-3 py-2">
                {error && <p className="text-sm text-rose-200">{error}</p>}
                {uploadError && (
                  <p className="text-sm text-rose-200">{uploadError}</p>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-xl border border-white/20 bg-transparent px-4 py-2.5 text-sm font-semibold text-white/90 hover:border-white hover:bg-white/5 hover:text-white disabled:opacity-50 transition-colors"
                  onClick={onUploadClick}
                  disabled={uploading}
                >
                  {uploading ? "Đang tải..." : "Tải hình mới"}
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-rose-500/50 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-300 hover:border-rose-400 hover:bg-rose-500/20 hover:text-rose-100 disabled:opacity-50 transition-colors"
                  onClick={onDeleteSelected}
                  disabled={!selectedImage || deleting}
                >
                  {deleting ? "Đang xoá..." : "Xoá hình đã chọn"}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                  onClick={onClose}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  onClick={onUseSelected}
                  disabled={!selectedImage}
                >
                  Sử dụng hình này
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
