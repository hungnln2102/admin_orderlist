import React, { useEffect, useMemo, useState } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { ProductImageItem } from "@/lib/productImagesApi";

type ProductImagePickerModalProps = {
  open: boolean;
  images: ProductImageItem[];
  selectedImage: ProductImageItem | null;
  loading: boolean;
  uploading: boolean;
  deleting: boolean;
  error: string | null;
  uploadError: string | null;
  onClose: () => void;
  onSelect: (item: ProductImageItem) => void;
  onUseSelected: () => void;
  onUploadClick: () => void;
  onDeleteSelected: () => void;
};

export const ProductImagePickerModal: React.FC<ProductImagePickerModalProps> = ({
  open,
  images,
  selectedImage,
  loading,
  uploading,
  deleting,
  error,
  uploadError,
  onClose,
  onSelect,
  onUseSelected,
  onUploadClick,
  onDeleteSelected,
}) => {
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
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 px-4 py-6">
        <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-[#0b1220] shadow-2xl">
          <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <h3 className="text-lg font-semibold text-white shrink-0">
              Chá»n hÃ¬nh áº£nh sáº£n pháº©m
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
                placeholder="Lá»c theo tÃªn file..."
                className="w-full rounded-lg border border-white/15 bg-black/30 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/40 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>
          <div className="p-4 space-y-4">
            {loading ? (
              <p className="text-sm text-white/70">Äang táº£i hÃ¬nh áº£nh...</p>
            ) : images.length === 0 ? (
              <p className="text-sm text-white/70">ChÆ°a cÃ³ hÃ¬nh áº£nh nÃ o.</p>
            ) : filteredImages.length === 0 ? (
              <p className="text-sm text-white/70">
                KhÃ´ng cÃ³ áº£nh khá»›p &quot;{nameFilter.trim()}&quot;. Thá»­ tá»« khÃ³a khÃ¡c.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto">
                {filteredImages.map((item) => {
                  const isSelected = selectedImage?.fileName === item.fileName;
                  return (
                    <button
                      key={item.fileName}
                      type="button"
                      className={`rounded-xl border p-2 text-left transition ${
                        isSelected
                          ? "border-blue-400 ring-2 ring-blue-400/40"
                          : "border-white/10 hover:border-white/30"
                      }`}
                      onClick={() => onSelect(item)}
                    >
                      <div className="aspect-square w-full overflow-hidden rounded-lg bg-black/30">
                        <img
                          src={item.url}
                          alt={item.fileName}
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <p className="mt-2 truncate text-xs text-white/70">
                        {item.fileName}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            {(error || uploadError) && (
              <div className="space-y-1">
                {error && <p className="text-xs text-rose-300">{error}</p>}
                {uploadError && (
                  <p className="text-xs text-rose-300">{uploadError}</p>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-white/40 bg-transparent px-4 py-2 text-sm font-semibold text-white/90 hover:border-white hover:text-white disabled:opacity-60"
                  onClick={onUploadClick}
                  disabled={uploading}
                >
                  {uploading ? "Äang táº£i..." : "Táº£i hÃ¬nh má»›i"}
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-rose-400/60 bg-transparent px-4 py-2 text-sm font-semibold text-rose-200 hover:border-rose-300 hover:text-rose-100 disabled:opacity-60"
                  onClick={onDeleteSelected}
                  disabled={!selectedImage || deleting}
                >
                  {deleting ? "Äang xÃ³a..." : "XoÃ¡ hÃ¬nh Ä‘Ã£ chá»n"}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-semibold text-white/70 hover:text-white"
                  onClick={onClose}
                >
                  Há»§y
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  onClick={onUseSelected}
                  disabled={!selectedImage}
                >
                  Sá»­ dá»¥ng hÃ¬nh Ä‘Ã£ chá»n
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
