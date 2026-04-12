import React, { useEffect, useMemo, useRef, useState } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { MagnifyingGlassIcon, PhotoIcon } from "@heroicons/react/24/outline";
import {
  fetchProductImages,
  uploadProductImage,
  deleteProductImage,
  ProductImageItem,
} from "@/lib/productImagesApi";

/** Tránh cache trình duyệt khi URL không đổi sau upload/ghi đè file cùng đường dẫn. */
function withPreviewToken(url: string, token: number): string {
  if (!url || !token) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}_pv=${token}`;
}

type ImagePickerModalProps = {
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
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-[#0b1220] shadow-2xl">
        <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <h3 className="text-lg font-semibold text-white shrink-0">
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
        <div className="p-4 space-y-4">
          {loading ? (
            <p className="text-sm text-white/70">Đang tải hình ảnh...</p>
          ) : images.length === 0 ? (
            <p className="text-sm text-white/70">Chưa có hình ảnh nào.</p>
          ) : filteredImages.length === 0 ? (
            <p className="text-sm text-white/70">
              Không có ảnh khớp &quot;{nameFilter.trim()}&quot;. Thử từ khóa khác.
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
                {uploading ? "Đang tải..." : "Tải hình mới"}
              </button>
              <button
                type="button"
                className="rounded-lg border border-rose-400/60 bg-transparent px-4 py-2 text-sm font-semibold text-rose-200 hover:border-rose-300 hover:text-rose-100 disabled:opacity-60"
                onClick={onDeleteSelected}
                disabled={!selectedImage || deleting}
              >
                {deleting ? "Đang xóa..." : "Xoá hình đã chọn"}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="px-4 py-2 text-sm font-semibold text-white/70 hover:text-white"
                onClick={onClose}
              >
                Hủy
              </button>
              <button
                type="button"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
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

type ProductImagePickerProps = {
  imageUrl: string | null;
  onImageUrlChange: (url: string) => void;
  /** Gọi sau khi xóa ảnh trên server (DB đã được gán NULL các tham chiếu) — nên reload danh sách sản phẩm. */
  onProductImagesChanged?: () => void;
};

export const ProductImagePicker: React.FC<ProductImagePickerProps> = ({
  imageUrl,
  onImageUrlChange,
  onProductImagesChanged,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [images, setImages] = useState<ProductImageItem[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imagesError, setImagesError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<ProductImageItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [previewToken, setPreviewToken] = useState(() => Date.now());
  const [previewLoadError, setPreviewLoadError] = useState(false);

  const bumpPreview = () => {
    setPreviewToken(Date.now());
    setPreviewLoadError(false);
  };

  useEffect(() => {
    setPreviewLoadError(false);
  }, [imageUrl]);

  const loadImages = async (preferred?: ProductImageItem | null) => {
    setImagesLoading(true);
    setImagesError(null);
    try {
      const data = await fetchProductImages();
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

  const handleClosePicker = () => {
    setPickerOpen(false);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const result = await uploadProductImage(file);
      onImageUrlChange(result.url);
      bumpPreview();
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
    onImageUrlChange(selectedImage.url);
    bumpPreview();
    setPickerOpen(false);
  };

  const handleDeleteSelected = async () => {
    if (!selectedImage || deleting) return;
    setDeleting(true);
    setImagesError(null);
    try {
      await deleteProductImage(selectedImage.fileName);
      if (imageUrl === selectedImage.url) {
        onImageUrlChange("");
        bumpPreview();
      }
      await loadImages(null);
      onProductImagesChanged?.();
    } catch (err) {
      setImagesError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-3">
        Hình ảnh sản phẩm
      </label>
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 shadow-sm backdrop-blur-sm">
        {imageUrl && !previewLoadError ? (
          <img
            key={`${imageUrl}-${previewToken}`}
            src={withPreviewToken(imageUrl, previewToken)}
            alt="Product"
            className="h-full w-full object-contain p-3"
            onError={() => setPreviewLoadError(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center">
            <PhotoIcon className="h-16 w-16 text-white/20" />
            {imageUrl && previewLoadError ? (
              <p className="text-xs text-rose-300/90">
                Không tải được ảnh. Kiểm tra URL hoặc thử ảnh khác.
              </p>
            ) : null}
          </div>
        )}
        <button
          type="button"
          className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity backdrop-blur-sm"
          onClick={handleOpenPicker}
        >
          <span className="rounded-xl border border-white/70 bg-black/60 px-4 py-2.5 text-sm font-semibold text-white shadow-lg backdrop-blur-sm">
            {imageUrl ? "Thay đổi" : "Chọn ảnh"}
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <ImagePickerModal
        open={pickerOpen}
        images={images}
        selectedImage={selectedImage}
        loading={imagesLoading}
        uploading={uploading}
        deleting={deleting}
        error={imagesError}
        uploadError={uploadError}
        onClose={handleClosePicker}
        onSelect={setSelectedImage}
        onUseSelected={handleUseSelected}
        onUploadClick={handleUploadClick}
        onDeleteSelected={handleDeleteSelected}
      />
    </div>
  );
};
