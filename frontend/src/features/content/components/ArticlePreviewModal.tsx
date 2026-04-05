import { useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type { Article } from "../types";

type ArticlePreviewModalProps = {
  open: boolean;
  article: Article | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
};

export function ArticlePreviewModal({
  open,
  article,
  loading,
  error,
  onClose,
}: ArticlePreviewModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Đóng lớp phủ"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="article-preview-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-400/90">
              Xem trước (demo)
            </p>
            <h2 id="article-preview-title" className="mt-1 truncate text-lg font-bold text-white">
              {loading ? "Đang tải…" : article?.title || "—"}
            </h2>
            {!loading && article ? (
              <p className="mt-1 text-xs text-slate-400">
                {article.category ? `${article.category} · ` : ""}
                /tin-tuc/{article.slug}
                {article.status === "published" ? "" : " · Nháp"}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Đóng"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="py-12 text-center text-slate-500">Đang tải nội dung…</p>
          ) : error ? (
            <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </p>
          ) : article ? (
            <article className="article-preview-demo space-y-4 text-slate-200">
              {article.image_url ? (
                <div className="relative flex w-full items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-slate-800/60 aspect-[16/9]">
                  <img
                    src={article.image_url}
                    alt={article.title ? `Ảnh bìa: ${article.title}` : "Ảnh bìa bài viết"}
                    className="max-h-full max-w-full object-contain object-center"
                  />
                </div>
              ) : null}
              {article.summary ? (
                <p className="text-sm leading-relaxed text-slate-400">{article.summary}</p>
              ) : null}
              <div
                className="article-preview-demo__body max-w-none text-sm leading-relaxed [&_a]:text-sky-400 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_img]:max-w-full [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5"
                dangerouslySetInnerHTML={{ __html: article.content || "" }}
              />
            </article>
          ) : null}
        </div>
      </div>
    </div>
  );
}
