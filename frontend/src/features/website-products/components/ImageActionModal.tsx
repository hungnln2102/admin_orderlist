import React, { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ImagePlus,
  RefreshCcw,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { BaseModal } from "@/shared/components";
import { ALLOWED_IMAGE_MIME_TYPES } from "../websiteProductsApi";
import { formatFileSize, getImageExtension } from "../utils";
import type { ImageAction } from "../types";

interface ImageActionModalProps {
  action: ImageAction | null;
  selectedFile: File | null;
  requiredImageType?: string;
  currentImagePreviewUrl?: string;
  saving: boolean;
  onSelectFile: (file: File | null) => void;
  onClose: () => void;
  onSubmit: () => void;
}

/**
 * Modal thống nhất cho 3 thao tác: Tải ảnh lên, Thay ảnh (so sánh 2 cột) và Xóa ảnh.
 */
export const ImageActionModal: React.FC<ImageActionModalProps> = ({
  action,
  selectedFile,
  requiredImageType,
  currentImagePreviewUrl,
  saving,
  onSelectFile,
  onClose,
  onSubmit,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedFile) {
      setLocalPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setLocalPreviewUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  if (!action) return null;

  const isDelete = action.type === "delete";
  const isReplace = action.type === "replace";
  const actionTitle = isDelete ? "Xóa ảnh sản phẩm" : isReplace ? "Thay ảnh sản phẩm" : "Tải ảnh lên thư viện";
  const submitLabel = isDelete ? "Xóa ảnh" : isReplace ? "Cập nhật ảnh" : "Tải ảnh lên";

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || (!isDelete && !selectedFile)) return;
    onSubmit();
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!saving) setDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (saving) return;
    const dropped = event.dataTransfer.files?.[0] ?? null;
    if (dropped) {
      onSelectFile(dropped);
    }
  };

  const iconNode = isDelete ? (
    <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/35 text-rose-400">
      <AlertTriangle className="w-5 h-5" />
    </div>
  ) : isReplace ? (
    <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/35 text-cyan-400">
      <RefreshCcw className="w-5 h-5" />
    </div>
  ) : (
    <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/35 text-cyan-400">
      <ImagePlus className="w-5 h-5" />
    </div>
  );

  const dropzone = (
    <div className="space-y-2.5">
      <input
        ref={fileInputRef}
        id="website-image-file"
        type="file"
        accept={requiredImageType ?? ALLOWED_IMAGE_MIME_TYPES.join(",")}
        disabled={saving}
        aria-describedby="website-image-file-hint"
        onChange={(event) => {
          onSelectFile(event.target.files?.[0] ?? null);
          // Reset input để có thể chọn lại cùng một tệp nếu cần
          event.target.value = "";
        }}
        className="sr-only"
      />

      <div
        role="button"
        tabIndex={saving ? -1 : 0}
        onClick={() => !saving && fileInputRef.current?.click()}
        onKeyDown={(event) => {
          if (!saving && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex min-h-[200px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition-all cursor-pointer ${
          dragging
            ? "border-cyan-400 bg-cyan-500/10"
            : selectedFile
              ? "border-cyan-500/40 bg-slate-950/90"
              : "border-slate-700/90 bg-slate-950/60 hover:border-cyan-500/50 hover:bg-slate-950/90"
        } ${saving ? "opacity-60 pointer-events-none" : ""}`}
      >
        {localPreviewUrl && selectedFile ? (
          <div className="w-full space-y-3">
            <div className="mx-auto flex h-36 w-full items-center justify-center rounded-xl bg-slate-900/70 p-2">
              <img
                src={localPreviewUrl}
                alt={selectedFile.name}
                className="h-full max-w-full object-contain rounded-lg"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-left text-xs">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-100">{selectedFile.name}</p>
                <p className="font-mono text-[11px] text-slate-400 tabular-nums">
                  {formatFileSize(selectedFile.size)} • {selectedFile.type.replace("image/", "").toUpperCase()}
                </p>
              </div>
              <span className="rounded-lg border border-cyan-500/35 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-200 shrink-0">
                Đổi tệp
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-cyan-400">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-100">
                Kéo thả ảnh vào đây hoặc{" "}
                <span className="text-cyan-400 underline underline-offset-2">chọn từ máy</span>
              </p>
              <p id="website-image-file-hint" className="text-xs text-slate-400">
                {isReplace
                  ? `Bắt buộc cùng định dạng ${getImageExtension(action.image.key).toUpperCase()} • Tối đa 5 MiB.`
                  : "Hỗ trợ định dạng JPEG, PNG hoặc WebP • Tối đa 5 MiB."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <BaseModal
      isOpen
      size={isDelete ? "md" : isReplace ? "3xl" : "xl"}
      title={actionTitle}
      subtitle={
        action.type === "upload"
          ? "Ảnh sẽ được lưu trữ lên CDN và tạo đường dẫn công khai tự động"
          : action.image.key
      }
      icon={iconNode}
      borderClassName={isDelete ? "border-rose-500/35" : "border-slate-800"}
      onClose={onClose}
      closeOnEsc={!saving}
      hideCloseButton={saving}
      footer={
        <>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="rounded-xl border border-slate-700/80 bg-slate-900 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Hủy
          </button>
          <button
            form="website-image-action"
            type="submit"
            disabled={saving || (!isDelete && !selectedFile)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold shadow-md active:scale-[0.98] transition-all disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer ${
              isDelete
                ? "bg-rose-600 text-white hover:bg-rose-500 shadow-rose-950/40"
                : "bg-gradient-to-r from-cyan-500 to-indigo-500 text-white hover:brightness-110 shadow-cyan-950/40"
            }`}
          >
            {isDelete ? (
              <Trash2 className="h-4 w-4" />
            ) : isReplace ? (
              <RefreshCcw className="h-4 w-4" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            <span>{saving ? "Đang xử lý..." : submitLabel}</span>
          </button>
        </>
      }
    >
      <form id="website-image-action" onSubmit={handleFormSubmit} className="space-y-4">
        {isDelete ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3.5 rounded-2xl border border-slate-800 bg-slate-950/80 p-3.5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 p-1.5">
                <img
                  src={currentImagePreviewUrl ?? action.image.url}
                  alt={action.image.key}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-sm font-bold text-white">{action.image.key}</p>
                <p className="font-mono text-xs text-slate-400 tabular-nums">
                  {formatFileSize(action.image.size)} • {getImageExtension(action.image.key).toUpperCase()}
                </p>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-slate-300">
              Bạn có chắc chắn muốn xóa vĩnh viễn ảnh này khỏi thư viện không? Nếu ảnh đang được sản phẩm hoặc biến thể tham chiếu, hệ thống sẽ tự động chặn xóa để đảm bảo an toàn.
            </p>
          </div>
        ) : isReplace ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 px-3.5 py-2.5 text-xs text-cyan-200/90 leading-relaxed">
              Tên tệp và URL công khai được giữ nguyên để không làm gãy liên kết trên website. Ảnh thay thế phải giữ đúng định dạng{" "}
              <strong className="font-mono font-bold text-cyan-200">
                {getImageExtension(action.image.key).toUpperCase()}
              </strong>
              .
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-11 gap-4 items-center">
              {/* Ảnh hiện tại */}
              <div className="lg:col-span-5 space-y-2">
                <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Ảnh hiện tại
                </span>
                <div className="flex min-h-[200px] flex-col justify-between rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <div className="flex h-36 items-center justify-center">
                    <img
                      src={currentImagePreviewUrl ?? action.image.url}
                      alt={action.image.key}
                      className="h-full max-w-full object-contain rounded-lg"
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2.5 text-xs">
                    <span className="truncate font-medium text-slate-300 pr-2">
                      {action.image.key}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400 shrink-0 tabular-nums">
                      {formatFileSize(action.image.size)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="hidden lg:flex lg:col-span-1 justify-center text-slate-500">
                <ArrowRight className="h-5 w-5" />
              </div>

              {/* Ảnh mới */}
              <div className="lg:col-span-5 space-y-2">
                <span className="block text-[11px] font-bold uppercase tracking-wide text-cyan-300">
                  Ảnh mới thay thế
                </span>
                {dropzone}
              </div>
            </div>
          </div>
        ) : (
          dropzone
        )}
      </form>
    </BaseModal>
  );
};
