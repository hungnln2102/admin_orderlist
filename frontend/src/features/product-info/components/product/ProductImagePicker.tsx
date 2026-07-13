import React, { useEffect, useRef, useState } from "react";
import { PhotoIcon } from "@heroicons/react/24/outline";
import type { ImageItem as ProductImageItem } from "@/shared/api/coreImageApi";
import { fetchImages, uploadImage, deleteImage } from "@/shared/api/coreImageApi";

const deleteProductImage = (fileName: string) => deleteImage("/api/product-images", fileName);
const fetchProductImages = () => fetchImages("/api/product-images");
const uploadProductImage = (file: File) => uploadImage(file, "/api/product-images/upload");
import { SharedImagePickerModal } from "@/shared/components/ImagePicker/SharedImagePickerModal";

/** Tránh cache trình duyệt khi URL không đổi sau upload/ghi đè file cùng đường dẫn. */
function withPreviewToken(url: string, token: number): string {
  if (!url || !token) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}_pv=${token}`;
}

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

      <SharedImagePickerModal
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
