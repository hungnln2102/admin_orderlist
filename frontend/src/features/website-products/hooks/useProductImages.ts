import { useCallback, useEffect, useMemo, useState } from "react";
import { useNotification } from "@/shared/context/NotificationContext";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  deleteImage,
  IMAGE_MIME_BY_EXTENSION,
  listImages,
  MAX_IMAGE_SIZE_BYTES,
  saveImage,
} from "../websiteProductsApi";
import { getImageExtension } from "../utils";
import type {
  ImageAction,
  ImageFormatFilter,
  ImageSortOption,
  ProductImage,
} from "../types";

const CACHE_WARNING = " URL công khai có thể vẫn hiển thị bản lưu trong bộ nhớ đệm.";

export function useProductImages() {
  const notify = useNotification();
  const [items, setItems] = useState<ProductImage[]>([]);
  const [previewVersions, setPreviewVersions] = useState<Record<string, number>>({});
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Bộ lọc & Sắp xếp phía client
  const [searchQuery, setSearchQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState<ImageFormatFilter>("all");
  const [sortBy, setSortBy] = useState<ImageSortOption>("newest");

  // Modal hành động & Lightbox xem phóng to
  const [action, setAction] = useState<ImageAction | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState<ProductImage | null>(null);

  const requiredImageType =
    action?.type === "replace"
      ? IMAGE_MIME_BY_EXTENSION[action.image.key.split(".").pop()?.toLowerCase() ?? ""]
      : undefined;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    listImages(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setItems(result.items ?? []);
        }
      })
      .catch((err: Error) => {
        if (!controller.signal.aborted) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [revision]);

  const getDisplayUrl = useCallback(
    (image: ProductImage) => {
      const version = previewVersions[image.key];
      if (!version) return image.url;
      return `${image.url}${image.url.includes("?") ? "&" : "?"}v=${version}`;
    },
    [previewVersions]
  );

  const totalStorageBytes = useMemo(
    () => items.reduce((sum, img) => sum + (Number(img.size) || 0), 0),
    [items]
  );

  const formatCounts = useMemo(() => {
    const counts = { all: items.length, jpg: 0, png: 0, webp: 0 };
    for (const img of items) {
      const ext = getImageExtension(img.key);
      if (ext === "jpg") counts.jpg += 1;
      else if (ext === "png") counts.png += 1;
      else if (ext === "webp") counts.webp += 1;
    }
    return counts;
  }, [items]);

  const filteredItems = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    const list = items.filter((img) => {
      if (formatFilter !== "all" && getImageExtension(img.key) !== formatFilter) {
        return false;
      }
      if (term && !img.key.toLowerCase().includes(term) && !img.url.toLowerCase().includes(term)) {
        return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "name_asc") {
        return a.key.localeCompare(b.key, "vi");
      }
      if (sortBy === "size_desc") {
        return (b.size || 0) - (a.size || 0);
      }
      // newest
      const timeA = a.lastModified ? new Date(a.lastModified).getTime() : 0;
      const timeB = b.lastModified ? new Date(b.lastModified).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;
      return a.key.localeCompare(b.key, "vi");
    });
  }, [items, searchQuery, formatFilter, sortBy]);

  const openAction = useCallback((next: ImageAction) => {
    setSelectedFile(null);
    setAction(next);
  }, []);

  const closeAction = useCallback(() => {
    if (saving) return;
    setAction(null);
    setSelectedFile(null);
  }, [saving]);

  const validateAndSelectFile = useCallback(
    (file: File | null) => {
      if (!file) {
        setSelectedFile(null);
        return;
      }
      if (
        !ALLOWED_IMAGE_MIME_TYPES.includes(
          file.type as (typeof ALLOWED_IMAGE_MIME_TYPES)[number]
        ) ||
        file.size > MAX_IMAGE_SIZE_BYTES
      ) {
        notify.error("Chọn ảnh JPEG, PNG hoặc WebP có dung lượng tối đa 5 MiB.");
        return;
      }
      if (requiredImageType && file.type !== requiredImageType) {
        notify.error("Tệp thay thế phải cùng định dạng với ảnh hiện tại.");
        return;
      }
      setSelectedFile(file);
    },
    [notify, requiredImageType]
  );

  const handleSubmitAction = useCallback(async () => {
    if (!action || saving) return;
    if (action.type !== "delete") {
      if (!selectedFile) return;
      if (
        !ALLOWED_IMAGE_MIME_TYPES.includes(
          selectedFile.type as (typeof ALLOWED_IMAGE_MIME_TYPES)[number]
        ) ||
        selectedFile.size > MAX_IMAGE_SIZE_BYTES
      ) {
        notify.error("Chọn ảnh JPEG, PNG hoặc WebP có dung lượng tối đa 5 MiB.");
        return;
      }
      if (requiredImageType && selectedFile.type !== requiredImageType) {
        notify.error("Tệp thay thế phải cùng định dạng với ảnh hiện tại.");
        return;
      }
    }

    setSaving(true);
    try {
      if (action.type === "delete") {
        const result = await deleteImage(action.image.key);
        setItems((current) =>
          current.filter((item) => item.key !== action.image.key)
        );
        if (previewImage?.key === action.image.key) {
          setPreviewImage(null);
        }
        notify.success(
          `Đã xóa ảnh.${result.cacheStatus === "purged" ? "" : CACHE_WARNING}`
        );
      } else if (selectedFile) {
        const result = await saveImage(
          selectedFile,
          action.type === "replace" ? action.image.key : undefined
        );
        if (action.type === "replace") {
          setItems((current) =>
            current.map((item) => (item.key === result.key ? result : item))
          );
          setPreviewVersions((current) => ({
            ...current,
            [result.key]: Date.now(),
          }));
          notify.success(
            `Đã thay ảnh.${result.cacheStatus === "purged" ? "" : CACHE_WARNING}`
          );
        } else {
          setItems((current) => [result, ...current]);
          notify.success("Đã tải ảnh lên thư viện.");
        }
      }
      setAction(null);
      setSelectedFile(null);
    } catch (err) {
      notify.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [action, saving, selectedFile, requiredImageType, notify, previewImage]);

  const refresh = useCallback(() => {
    setRevision((current) => current + 1);
  }, []);

  return {
    items,
    filteredItems,
    totalStorageBytes,
    formatCounts,
    loading,
    error,
    saving,
    searchQuery,
    setSearchQuery,
    formatFilter,
    setFormatFilter,
    sortBy,
    setSortBy,
    action,
    selectedFile,
    requiredImageType,
    previewImage,
    setPreviewImage,
    getDisplayUrl,
    openAction,
    closeAction,
    validateAndSelectFile,
    handleSubmitAction,
    refresh,
  };
}
