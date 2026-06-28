import React, { useEffect, useRef, useState } from "react";
import type { VariantImageItem } from "@/lib/variantImagesApi";
import {
  deleteVariantImage,
  fetchVariantImages,
  uploadVariantImage,
} from "@/lib/variantImagesApi";
import { ImagePickerModal } from "./ImagePickerModal";
import { ImageUploadSurface } from "./ImageUploadSurface";

function withPreviewToken(url: string, token: number): string {
  if (!url || !token) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}_pv=${token}`;
}

interface ImageUploadProps {
  imageUrl?: string;
  onImageChange: (url: string) => void;
  onImageRemove: () => void;
}

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
  const [previewToken, setPreviewToken] = useState(() => Date.now());
  const [previewLoadError, setPreviewLoadError] = useState(false);

  const bumpPreview = () => {
    setPreviewToken(Date.now());
    setPreviewLoadError(false);
  };

  useEffect(() => {
    setPreviewLoadError(false);
  }, [imageUrl]);

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
    onImageChange(selectedImage.url);
    bumpPreview();
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
        bumpPreview();
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

      <ImageUploadSurface
        imageUrl={imageUrl}
        previewUrl={withPreviewToken(imageUrl || "", previewToken)}
        previewLoadError={previewLoadError}
        isDragging={isDragging}
        onOpenPicker={handleOpenPicker}
        onRemove={onImageRemove}
        onPreviewError={() => setPreviewLoadError(true)}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      />

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
