import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { uploadArticleImage } from "@/features/content/api/contentMediaApi";

export type ArticleImageInsertModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (url: string) => void;
};

export function ArticleImageInsertModal({ isOpen, onClose, onInsert }: ArticleImageInsertModalProps) {
  const [urlValue, setUrlValue] = useState("https://");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setUrlValue("https://");
    setUploadError(null);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const finishWithUrl = useCallback(
    (url: string) => {
      const trimmed = url.trim();
      if (!trimmed) return;
      onInsert(trimmed);
      onClose();
    },
    [onInsert, onClose]
  );

  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploadError(null);
      setUploading(true);
      try {
        const { url } = await uploadArticleImage(file);
        finishWithUrl(url);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Upload thất bại.");
      } finally {
        setUploading(false);
        e.target.value = "";
      }
    },
    [finishWithUrl]
  );

  const handleUrlSubmit = (ev: FormEvent) => {
    ev.preventDefault();
    finishWithUrl(urlValue);
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 backdrop-blur-sm px-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="article-image-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-white/15 bg-gradient-to-br from-slate-900/95 via-indigo-950/90 to-slate-950/95 p-6 shadow-[0_24px_70px_-20px_rgba(0,0,0,0.95)]"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 id="article-image-modal-title" className="text-lg font-semibold text-white">
            Chèn ảnh
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Đóng"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-300/90">
          Tải ảnh lên server — hệ thống tự nén (WebP, giữ màu tốt). Hoặc dán URL ảnh trực tiếp nếu cần.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/webp"
          className="sr-only"
          onChange={handleFileChange}
          disabled={uploading}
        />

        <div className="mb-5 flex flex-col gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="w-full rounded-xl border border-sky-500/40 bg-sky-600/90 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-900/30 transition-colors hover:bg-sky-500 disabled:opacity-50"
          >
            {uploading ? "Đang tải và nén ảnh…" : "Chọn ảnh từ máy"}
          </button>
          {uploadError ? (
            <p className="text-sm text-rose-300" role="alert">
              {uploadError}
            </p>
          ) : null}
        </div>

        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Hoặc URL</p>
        <form onSubmit={handleUrlSubmit} noValidate>
          <input
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="https://..."
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            disabled={uploading}
            className="mb-5 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none ring-sky-500/30 focus:border-sky-500/50 focus:ring-2 disabled:opacity-50"
          />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/15 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="rounded-xl bg-slate-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-500 disabled:opacity-50"
            >
              Chèn từ URL
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}
