import React, { useRef, useState } from "react";
import {
  deleteProductImage,
  fetchProductImages,
  uploadProductImage,
} from "../../../../../lib/productDescApi";
import { EditFormState } from "./types";

type EditProductSidebarLabels = {
  productId: string;
  productName: string;
  packageName: string;
};

type ImageItem = {
  fileName: string;
  url: string;
};

type ImagePickerModalProps = {
  open: boolean;
  images: ImageItem[];
  selectedImage: ImageItem | null;
  loading: boolean;
  uploading: boolean;
  deleting: boolean;
  error: string | null;
  uploadError: string | null;
  onClose: () => void;
  onSelect: (item: ImageItem) => void;
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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-[#0b1220] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <h3 className="text-lg font-semibold text-white">Chọn hình ảnh</h3>
        </div>
        <div className="p-4 space-y-4">
          {loading ? (
            <p className="text-sm text-white/70">Đang tải hình ảnh...</p>
          ) : images.length === 0 ? (
            <p className="text-sm text-white/70">Chưa có hình ảnh nào.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {images.map((item) => {
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
                    <div className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-black/30">
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
  );
};

type EditProductSidebarProps = {
  form: EditFormState;
  labels: EditProductSidebarLabels;
  onProductIdChange: (value: string) => void;
  onProductNameChange: (value: string) => void;
  onPackageNameChange: (value: string) => void;
  onImageUrlChange: (value: string) => void;
};

export const EditProductSidebar: React.FC<EditProductSidebarProps> = ({
  form,
  labels,
  onProductIdChange,
  onProductNameChange,
  onPackageNameChange,
  onImageUrlChange,
}) => (
  <SidebarContent
    form={form}
    labels={labels}
    onProductIdChange={onProductIdChange}
    onProductNameChange={onProductNameChange}
    onPackageNameChange={onPackageNameChange}
    onImageUrlChange={onImageUrlChange}
  />
);

const SidebarContent: React.FC<EditProductSidebarProps> = ({
  form,
  labels,
  onProductIdChange,
  onProductNameChange,
  onPackageNameChange,
  onImageUrlChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imagesError, setImagesError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadImages = async (preferred?: ImageItem | null) => {
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
      if (!nextSelected && form.imageUrl) {
        nextSelected = items.find((item) => item.url === form.imageUrl) || null;
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
    setPickerOpen(false);
  };

  const handleDeleteSelected = async () => {
    if (!selectedImage || deleting) return;
    setDeleting(true);
    setImagesError(null);
    try {
      await deleteProductImage(selectedImage.fileName);
      if (form.imageUrl === selectedImage.url) {
        onImageUrlChange("");
      }
      await loadImages(null);
    } catch (err) {
      setImagesError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4 lg:col-span-2">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="relative aspect-[4/5] min-h-[300px] overflow-hidden rounded-xl border border-white/10 bg-black/20">
          {form.imageUrl ? (
            <img
              src={form.imageUrl}
              alt="Product preview"
              className="h-full w-full object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="h-full w-full" />
          )}
          <button
            type="button"
            className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-white/70 bg-black/40 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur-sm hover:border-white hover:bg-black/50 disabled:opacity-60"
            onClick={handleOpenPicker}
          >
            Upload
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
        <div>
          <label className="block text-xs uppercase tracking-wide text-white/70 mb-1">
            {labels.productId}
          </label>
          <input
            type="text"
            value={form.productId}
            onChange={(e) => onProductIdChange(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wide text-white/70 mb-1">
            {labels.productName}
          </label>
          <input
            type="text"
            value={form.productName}
            onChange={(e) => onProductNameChange(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wide text-white/70 mb-1">
            {labels.packageName}
          </label>
          <input
            type="text"
            value={form.packageName}
            onChange={(e) => onPackageNameChange(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
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
