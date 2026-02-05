import React, { useRef, useState } from "react";
import { PhotoIcon } from "@heroicons/react/24/outline";
import {
  fetchProductImages,
  uploadProductImage,
  deleteProductImage,
  ProductImageItem,
} from "../../../../../lib/productImagesApi";

interface ImageUploadProps {
  imageUrl?: string;
  onImageChange: (url: string) => void;
  onImageRemove: () => void;
}

// Image Picker Modal Component
interface ImagePickerModalProps {
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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <h3 className="text-lg font-semibold text-white">Chọn hình ảnh sản phẩm</h3>
        </div>
        <div className="p-4 space-y-4">
          {loading ? (
            <p className="text-sm text-white/70">Đang tải hình ảnh...</p>
          ) : images.length === 0 ? (
            <p className="text-sm text-white/70">Chưa có hình ảnh nào.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto">
              {images.map((item) => {
                const isSelected = selectedImage?.fileName === item.fileName;
                return (
                  <button
                    key={item.fileName}
                    type="button"
                    className={`rounded-xl border p-2 text-left transition ${
                      isSelected
                        ? "border-indigo-400 ring-2 ring-indigo-400/40"
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
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
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
  );
};

// Main ImageUpload Component
const ImageUpload: React.FC<ImageUploadProps> = ({
  imageUrl,
  onImageChange,
  onImageRemove,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Image Picker State
  const [pickerOpen, setPickerOpen] = useState(false);
  const [images, setImages] = useState<ProductImageItem[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imagesError, setImagesError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<ProductImageItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load images from server
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

  // Open picker modal
  const handleOpenPicker = () => {
    setPickerOpen(true);
    setImagesError(null);
    setUploadError(null);
    void loadImages();
  };

  // Local file upload handlers
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

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Server upload handler
  const handleServerUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const result = await uploadProductImage(file);
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
      await deleteProductImage(selectedImage.fileName);
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
    <div className="relative h-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleServerUpload}
        className="hidden"
      />
      
      {imageUrl ? (
        <div className="relative h-full rounded-2xl overflow-hidden border border-white/15 bg-slate-950/40 group">
          <img
            src={imageUrl}
            alt="Product preview"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleOpenPicker}
              className="px-4 py-2 rounded-lg bg-indigo-500 text-white font-semibold hover:bg-indigo-600 transition-colors"
            >
              Chọn từ Server
            </button>
            <button
              type="button"
              onClick={onImageRemove}
              className="px-4 py-2 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
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
          className={`h-full rounded-2xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center gap-4 p-6 ${
            isDragging
              ? "border-indigo-400 bg-indigo-500/20"
              : "border-white/20 bg-slate-950/40 hover:border-indigo-400/60 hover:bg-slate-900/60"
          }`}
        >
          <PhotoIcon className="h-16 w-16 text-slate-400" />
          <div className="text-center">
            <p className="text-sm font-semibold text-white mb-1">
              Chọn hình ảnh sản phẩm
            </p>
            <p className="text-xs text-slate-400">
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
