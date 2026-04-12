import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import {
  fetchArticleImages,
  uploadArticleImage,
  type ArticleImageItem,
} from "@/features/content/api/contentMediaApi";

export type ArticleImageInsertModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (url: string) => void;
};

export function ArticleImageInsertModal({ isOpen, onClose, onInsert }: ArticleImageInsertModalProps) {
  const [urlValue, setUrlValue] = useState("https://");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<ArticleImageItem[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ArticleImageItem | null>(null);
  const [nameFilter, setNameFilter] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const loadImages = useCallback(async (preferred?: ArticleImageItem | null) => {
    setListLoading(true);
    setListError(null);
    try {
      const data = await fetchArticleImages();
      const items = data.items;
      setImages(items);
      let next = preferred ?? null;
      if (next) {
        next = items.find((i) => i.fileName === next.fileName || i.url === next.url) ?? null;
      }
      setSelected(next);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Không tải được danh sách ảnh.");
      setImages([]);
      setSelected(null);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setUrlValue("https://");
    setUploadError(null);
    setUploading(false);
    setListError(null);
    setNameFilter("");
    setSelected(null);
    if (fileRef.current) fileRef.current.value = "";
    void loadImages();
  }, [isOpen, loadImages]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const filteredImages = useMemo(() => {
    const q = nameFilter.trim().toLowerCase();
    if (!q) return images;
    return images.filter((item) => item.fileName.toLowerCase().includes(q));
  }, [images, nameFilter]);

  const finishWithUrl = useCallback(
    (url: string) => {
      const trimmed = url.trim();
      if (!trimmed) return;
      onInsert(trimmed);
      onClose();
    },
    [onInsert, onClose]
  );

  const handleInsertSelected = () => {
    if (!selected) return;
    finishWithUrl(selected.url);
  };

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
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4 py-6"
        role="presentation"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="article-image-modal-title"
          onClick={(e) => e.stopPropagation()}
          className="flex max-h-[min(90vh,820px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b1220] shadow-2xl"
        >
          <div className="border-b border-white/10 px-5 py-3">
            <div className="flex items-center justify-between gap-3">
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
            <div className="relative mt-3 w-full sm:max-w-md">
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

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            <p className="text-sm text-white/70">
              Chọn ảnh đã có trên server, tải ảnh mới (WebP, giữ màu tốt), hoặc dán URL ngoài nếu cần.
            </p>

            {listLoading ? (
              <p className="text-sm text-white/70">Đang tải thư viện ảnh...</p>
            ) : images.length === 0 ? (
              <p className="text-sm text-white/70">Chưa có ảnh nào trong thư mục. Tải ảnh mới bên dưới.</p>
            ) : filteredImages.length === 0 ? (
              <p className="text-sm text-white/70">
                Không có ảnh khớp &quot;{nameFilter.trim()}&quot;. Thử từ khóa khác.
              </p>
            ) : (
              <div className="grid max-h-[min(52vh,420px)] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
                {filteredImages.map((item) => {
                  const isSelected = selected?.fileName === item.fileName;
                  return (
                    <button
                      key={item.fileName}
                      type="button"
                      className={`rounded-xl border p-2 text-left transition ${
                        isSelected
                          ? "border-blue-400 ring-2 ring-blue-400/40"
                          : "border-white/10 hover:border-white/30"
                      }`}
                      onClick={() => setSelected(item)}
                      onDoubleClick={() => finishWithUrl(item.url)}
                    >
                      <div className="aspect-square w-full overflow-hidden rounded-lg bg-black/30">
                        <img
                          src={item.url}
                          alt={item.fileName}
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <p className="mt-2 truncate text-xs text-white/70">{item.fileName}</p>
                    </button>
                  );
                })}
              </div>
            )}

            {listError ? (
              <p className="text-xs text-rose-300" role="alert">
                {listError}
              </p>
            ) : null}
            {uploadError ? (
              <p className="text-xs text-rose-300" role="alert">
                {uploadError}
              </p>
            ) : null}

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/webp"
              className="sr-only"
              onChange={handleFileChange}
              disabled={uploading}
            />

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="rounded-lg border border-white/40 bg-transparent px-4 py-2 text-sm font-semibold text-white/90 hover:border-white hover:text-white disabled:opacity-60"
              >
                {uploading ? "Đang tải..." : "Tải ảnh mới"}
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-semibold text-white/70 hover:text-white"
                  onClick={onClose}
                  disabled={uploading}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  onClick={handleInsertSelected}
                  disabled={!selected || uploading}
                >
                  Chèn ảnh đã chọn
                </button>
              </div>
            </div>

            <p className="text-xs font-medium uppercase tracking-wide text-white/40">Hoặc URL</p>
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
                className="mb-3 w-full rounded-lg border border-white/15 bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 disabled:opacity-50"
              />
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="submit"
                  disabled={uploading}
                  className="rounded-lg bg-slate-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-500 disabled:opacity-50"
                >
                  Chèn từ URL
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
