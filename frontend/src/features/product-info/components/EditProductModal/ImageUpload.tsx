import React, { useEffect, useMemo, useRef, useState } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { MagnifyingGlassIcon, PhotoIcon } from "@heroicons/react/24/outline";
import type { VariantImageItem } from "@/lib/variantImagesApi";
import {
  deleteVariantImage,
  fetchVariantImages,
  uploadVariantImage,
} from "@/lib/variantImagesApi";

interface ImageUploadProps {
  imageUrl?: string;
  onImageChange: (url: string) => void;
  onImageRemove: () => void;
}

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

const ImagePickerModal: React.FC<ImagePickerModalProps> = ({
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
            Chọn hình ảnh sản phẩm
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

        <div className="product-image-picker__body space-y-4 p-4">
          {loading ? (
            <p className="text-sm text-white/70">Đang tải hình ảnh...</p>
          ) : images.length === 0 ? (
            <p className="text-sm text-white/70">Chưa có hình ảnh nào.</p>
          ) : filteredImages.length === 0 ? (
            <p className="text-sm text-white/70">
              Không có ảnh khớp &quot;{nameFilter.trim()}&quot;. Thử từ khóa khác.
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
                {uploading ? "Đang tải..." : "Tải hình mới"}
              </button>
              <button
                type="button"
                className="product-image-picker__button product-image-picker__button--danger"
                onClick={onDeleteSelected}
                disabled={!selectedImage || deleting}
              >
                {deleting ? "Đang xóa..." : "Xóa hình đã chọn"}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="product-image-picker__button product-image-picker__button--text"
                onClick={onClose}
              >
                Hủy
              </button>
              <button
                type="button"
                className="product-image-picker__button product-image-picker__button--primary"
                onClick={onUseSelected}
                disabled={!selectedImage}
              >
                Sử dụng hình đã chọn
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};

const ImageUpload: React.FC<ImageUploadProps> = ({
  imageUrl,
  onImageChange,
  onImageRemove,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [images, setImages] = useState<VariantImageItem[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imagesError, setImagesError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<VariantImageItem | null>(
    null
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadImages = async (preferred?: VariantImageItem | null) => {
    setImagesLoading(true);
    setImagesError(null);

    try {
      const data = await fetchVariantImages();
      const items = Array.isArray(data.items) ? data.items : [];
      setImages(items);

      let nextSelected = preferred || selectedImage;
      if (nextSelected) {
        nextSelected =
          items.find(
            (item) =>
              item.fileName === nextSelected?.fileName ||
              item.url === nextSelected?.url
          ) || null;
      }
      if (!nextSelected && imageUrl) {
        nextSelected = items.find((item) => item.url === imageUrl) || null;
      }
      if (!nextSelected && items.length) {
        nextSelected = items[0];
      }

      setSelectedImage(nextSelected);
    } catch (err) {
      setImagesError(err instanceof Error ? err.message : "Failed to load images.");
      setImages([]);
    } finally {
      setImagesLoading(false);
    }
  };

  const handleOpenPicker = () => {
    setPickerOpen(true);
    setImagesError(null);
    setUploadError(null);
    void loadImages();
  };

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          onImageChange(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleServerUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      const result = await uploadVariantImage(file);
      onImageChange(result.url);
      const preferred = result.fileName
        ? { fileName: result.fileName, url: result.url }
        : null;
      setSelectedImage(preferred);
      await loadImages(preferred);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleUseSelected = () => {
    if (!selectedImage) return;
    onImageChange(selectedImage.url);
    setPickerOpen(false);
  };

  const handleDeleteSelected = async () => {
    if (!selectedImage || deleting) return;

    setDeleting(true);
    setImagesError(null);

    try {
      await deleteVariantImage(selectedImage.fileName);
      if (imageUrl === selectedImage.url) {
        onImageRemove();
      }
      await loadImages(null);
    } catch (err) {
      setImagesError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="product-edit-image relative h-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/webp"
        onChange={handleServerUpload}
        className="hidden"
      />

      {imageUrl ? (
        <div className="product-edit-image__preview group relative h-full overflow-hidden rounded-[28px] border">
          <img
            src={imageUrl}
            alt="Product preview"
            className="h-full w-full object-cover"
          />

          <div className="product-edit-image__preview-overlay absolute inset-0 flex items-end justify-center gap-3 p-5">
            <button
              type="button"
              onClick={handleOpenPicker}
              className="product-edit-image__action product-edit-image__action--primary"
            >
              Chọn từ server
            </button>
            <button
              type="button"
              onClick={onImageRemove}
              className="product-edit-image__action product-edit-image__action--danger"
            >
              Xóa
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={handleOpenPicker}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`product-edit-image__empty flex h-full cursor-pointer flex-col items-center justify-center gap-4 rounded-[28px] border p-6 text-center transition-all ${
            isDragging ? "product-edit-image__empty--dragging" : ""
          }`}
        >
          <PhotoIcon className="product-edit-image__icon h-16 w-16" />
          <div>
            <p className="product-edit-image__title mb-2 text-sm font-semibold text-white">
              Chọn hình ảnh sản phẩm
            </p>
            <p className="product-edit-image__hint text-xs">
              Nhấp để chọn từ server hoặc kéo thả file
            </p>
          </div>
        </div>
      )}

      <ImagePickerModal
        open={pickerOpen}
        images={images}
        selectedImage={selectedImage}
        loading={imagesLoading}
        uploading={uploading}
        deleting={deleting}
        error={imagesError}
        uploadError={uploadError}
        onClose={() => setPickerOpen(false)}
        onSelect={setSelectedImage}
        onUseSelected={handleUseSelected}
        onUploadClick={() => fileInputRef.current?.click()}
        onDeleteSelected={handleDeleteSelected}
      />
    </div>
  );
};

export default ImageUpload;
