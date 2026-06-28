import React from "react";
import { PhotoIcon } from "@heroicons/react/24/outline";

type ImageUploadSurfaceProps = {
  imageUrl?: string;
  previewUrl: string;
  previewLoadError: boolean;
  isDragging: boolean;
  onOpenPicker: () => void;
  onRemove: () => void;
  onPreviewError: () => void;
  onDrop: (event: React.DragEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: () => void;
};

export const ImageUploadSurface: React.FC<ImageUploadSurfaceProps> = ({
  imageUrl,
  previewUrl,
  previewLoadError,
  isDragging,
  onOpenPicker,
  onRemove,
  onPreviewError,
  onDrop,
  onDragOver,
  onDragLeave,
}) => {
  if (imageUrl && !previewLoadError) {
    return (
      <div className="product-edit-image__preview group relative h-full overflow-hidden rounded-[28px] border">
        <img
          src={previewUrl}
          alt="Product preview"
          className="h-full w-full object-cover"
          onError={onPreviewError}
        />

        <div className="product-edit-image__preview-overlay absolute inset-0 flex items-end justify-center gap-3 p-5">
          <button
            type="button"
            onClick={onOpenPicker}
            className="product-edit-image__action product-edit-image__action--primary"
          >
            Chọn từ server
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="product-edit-image__action product-edit-image__action--danger"
          >
            Xóa
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onOpenPicker}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={`product-edit-image__empty flex h-full cursor-pointer flex-col items-center justify-center gap-4 rounded-[28px] border p-6 text-center transition-all ${
        isDragging ? "product-edit-image__empty--dragging" : ""
      }`}
    >
      <PhotoIcon className="product-edit-image__icon h-16 w-16" />
      <div>
        <p className="product-edit-image__title mb-2 text-sm font-semibold text-white">
          {imageUrl && previewLoadError
            ? "Không tải được ảnh — nhấp để chọn ảnh khác"
            : "Chọn hình ảnh sản phẩm"}
        </p>
        <p className="product-edit-image__hint text-xs">
          Nhấp để chọn từ server hoặc kéo thả file
        </p>
      </div>
    </div>
  );
};
