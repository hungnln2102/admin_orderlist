import React, { useEffect, useMemo, useState } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { VariantImageItem } from "@/lib/variantImagesApi";

interface ImagePickerModalProps {
  open: boolean;
  images: VariantImageItem[];
  selectedImage: VariantImageItem | null;
  loading: boolean;
  uploading: boolean;
  deleting: boolean;
  error: string | null;
  uploadError: string | null;
  onClose: () => void;
  onSelect: (item: VariantImageItem) => void;
  onUseSelected: () => void;
  onUploadClick: () => void;
  onDeleteSelected: () => void;
}

export const ImagePickerModal: React.FC<ImagePickerModalProps> = ({
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
      <div className="product-image-picker__overlay fixed inset-0 z-[10000] flex items-center justify-center px-4 py-6">
        <div className="product-image-picker w-full max-w-4xl overflow-hidden rounded-[28px] border">
          <div className="product-image-picker__header flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <h3 className="product-image-picker__title text-lg font-semibold text-white shrink-0">
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

          <div className="product-image-picker__body space-y-4 p-4">
            {loading ? (
              <p className="text-sm text-white/70">Äang táº£i hÃ¬nh áº£nh...</p>
            ) : images.length === 0 ? (
              <p className="text-sm text-white/70">ChÆ°a cÃ³ hÃ¬nh áº£nh nÃ o.</p>
            ) : filteredImages.length === 0 ? (
              <p className="text-sm text-white/70">
                KhÃ´ng cÃ³ áº£nh khá»›p &quot;{nameFilter.trim()}&quot;. Thá»­ tá»« khÃ³a khÃ¡c.
              </p>
            ) : (
              <div className="product-image-picker__grid grid max-h-[400px] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
                {filteredImages.map((item) => {
                  const isSelected = selectedImage?.fileName === item.fileName;

                  return (
                    <button
                      key={item.fileName}
                      type="button"
                      className={`product-image-picker__card rounded-2xl border p-2 text-left transition ${
                        isSelected
                          ? "product-image-picker__card--selected"
                          : "hover:border-white/30"
                      }`}
                      onClick={() => onSelect(item)}
                    >
                      <div className="product-image-picker__thumb w-full overflow-hidden rounded-xl">
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
                {uploadError && <p className="text-xs text-rose-300">{uploadError}</p>}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="product-image-picker__button product-image-picker__button--ghost"
                  onClick={onUploadClick}
                  disabled={uploading}
                >
                  {uploading ? "Äang táº£i..." : "Táº£i hÃ¬nh má»›i"}
                </button>
                <button
                  type="button"
                  className="product-image-picker__button product-image-picker__button--danger"
                  onClick={onDeleteSelected}
                  disabled={!selectedImage || deleting}
                >
                  {deleting ? "Äang xÃ³a..." : "XÃ³a hÃ¬nh Ä‘Ã£ chá»n"}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="product-image-picker__button product-image-picker__button--text"
                  onClick={onClose}
                >
                  Há»§y
                </button>
                <button
                  type="button"
                  className="product-image-picker__button product-image-picker__button--primary"
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
