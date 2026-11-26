import React from "react";
import {
  Calendar,
  ExternalLink,
  HardDrive,
  Image as ImageIcon,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import { BaseModal, CopyButton } from "@/shared/components";
import { formatDateDisplay } from "@/shared/utils/format";
import { formatFileSize, getImageExtension } from "../utils";
import type { ProductImage } from "../types";

interface ImagePreviewModalProps {
  image: ProductImage | null;
  previewUrl: string;
  onClose: () => void;
  onReplace: (image: ProductImage) => void;
  onDelete: (image: ProductImage) => void;
}

/**
 * Lightbox xem phóng to ảnh sản phẩm cùng thông tin chi tiết và thao tác nhanh.
 */
export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  image,
  previewUrl,
  onClose,
  onReplace,
  onDelete,
}) => {
  if (!image) return null;

  const ext = getImageExtension(image.key).toUpperCase();

  return (
    <BaseModal
      isOpen
      size="3xl"
      title={image.key}
      subtitle="Xem chi tiết ảnh trong thư viện sản phẩm"
      icon={
        <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
          <ImageIcon className="w-5 h-5" />
        </div>
      }
      onClose={onClose}
      closeOnBackdrop
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onReplace(image);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-500/50 hover:text-cyan-200 transition-colors cursor-pointer"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Thay ảnh
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onDelete(image);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/35 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Xóa ảnh
            </button>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={image.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/15 px-3.5 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/25 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Mở ảnh gốc
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:border-slate-500 transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Khung trình chiếu ảnh */}
        <div className="relative flex min-h-[260px] max-h-[52vh] items-center justify-center rounded-2xl border border-slate-800 bg-[radial-gradient(circle_at_center,rgba(30,41,59,0.55)_0%,rgba(2,6,23,0.95)_75%)] p-6 overflow-hidden">
          <img
            src={previewUrl}
            alt={image.key}
            className="max-h-[46vh] max-w-full rounded-xl object-contain shadow-2xl shadow-black/60"
          />
          {ext && (
            <span className="absolute top-3 left-3 rounded-lg border border-slate-700/80 bg-slate-950/85 px-2.5 py-1 font-mono text-[11px] font-bold text-cyan-300 backdrop-blur-md">
              {ext}
            </span>
          )}
        </div>

        {/* Thanh thông số & URL */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-3.5 py-2.5">
            <span className="inline-flex items-center gap-1.5 text-slate-400">
              <HardDrive className="h-3.5 w-3.5 text-slate-500" />
              Dung lượng tệp
            </span>
            <span className="font-mono font-semibold text-slate-200 tabular-nums">
              {formatFileSize(image.size)}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-3.5 py-2.5">
            <span className="inline-flex items-center gap-1.5 text-slate-400">
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              Cập nhật gần nhất
            </span>
            <span className="font-mono font-semibold text-slate-200 tabular-nums">
              {formatDateDisplay(image.lastModified)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2">
          <a
            href={image.url}
            target="_blank"
            rel="noreferrer"
            className="min-w-0 flex-1 truncate font-mono text-xs text-cyan-300 hover:underline"
          >
            {image.url}
          </a>
          <CopyButton
            text={image.url}
            itemKey={`lightbox-${image.key}`}
            label="Sao chép URL"
            variant="outline"
            size="sm"
          />
        </div>
      </div>
    </BaseModal>
  );
};
