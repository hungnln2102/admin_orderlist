import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PencilSquareIcon, ArrowLeftIcon, PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";
import GradientButton from "@/components/ui/GradientButton";
import { ArticleRichEditor } from "../components/ArticleRichEditor";
import { ArticleImageInsertModal } from "../components/ArticleImageInsertModal";
import { ArticleSeoReview } from "../components/ArticleSeoReview";
import { slugifyLatin } from "../utils/slugify";
import { createArticle, fetchArticle, fetchCategories, updateArticle } from "../api/contentApi";
import type { ArticleCategory } from "../types";

export default function CreateArticlePage() {
  const { id: editIdParam } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const editId =
    editIdParam != null && editIdParam !== "" && Number.isFinite(Number(editIdParam))
      ? Number(editIdParam)
      : null;
  const invalidEditId =
    editIdParam != null && editIdParam !== "" && editId == null;
  const isEditMode = editId != null;

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [saving, setSaving] = useState(false);
  const [loadingArticle, setLoadingArticle] = useState(isEditMode);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [coverModalOpen, setCoverModalOpen] = useState(false);
  const [categories, setCategories] = useState<ArticleCategory[]>([]);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEditMode || editId == null) {
      setLoadingArticle(false);
      return;
    }
    let cancelled = false;
    setLoadingArticle(true);
    setLoadError(null);
    fetchArticle(editId)
      .then((a) => {
        if (cancelled) return;
        setTitle(a.title || "");
        setSlug(a.slug || "");
        setSummary(a.summary || "");
        setContent(a.content || "");
        setImageUrl(a.image_url || "");
        setStatus(a.status === "published" ? "published" : "draft");
        setCategoryId(a.category_id ?? "");
      })
      .catch((e) => {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Không tải được bài viết.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingArticle(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isEditMode, editId]);

  const handleTitleChange = useCallback((nextTitle: string) => {
    setTitle(nextTitle);
    setSlug((prevSlug) => {
      if (!prevSlug) return slugifyLatin(nextTitle);
      if (prevSlug === slugifyLatin(title)) return slugifyLatin(nextTitle);
      return prevSlug;
    });
  }, [title]);

  const goBackToList = () => {
    navigate("/content/articles");
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        slug: slug || undefined,
        summary: summary.trim(),
        content,
        image_url: imageUrl.trim(),
        category_id: categoryId || null,
        status,
      };
      if (isEditMode && editId != null) {
        await updateArticle(editId, payload);
      } else {
        await createArticle(payload);
      }
      navigate("/content/articles");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Lưu bài viết thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const fieldClass =
    "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none backdrop-blur-md focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30";
  const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400";

  if (invalidEditId) {
    return (
      <div className="space-y-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-100">
        <p>Đường dẫn sửa bài không hợp lệ (ID không phải số).</p>
        <button
          type="button"
          onClick={goBackToList}
          className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  if (isEditMode && loadingArticle) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
        Đang tải bài viết...
      </div>
    );
  }

  if (isEditMode && loadError) {
    return (
      <div className="space-y-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-200">
        <p>{loadError}</p>
        <button
          type="button"
          onClick={goBackToList}
          className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goBackToList}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
              <PencilSquareIcon className="h-7 w-7 text-sky-400" />
              {isEditMode ? "Sửa bài viết" : "Viết bài mới"}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {isEditMode ? "Cập nhật nội dung bài đã có." : "Soạn nội dung bài viết cho trang tin tức."}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <GradientButton onClick={() => void handleSave()} disabled={saving || !title.trim()}>
            {saving ? "Đang lưu..." : status === "published" ? "Đăng bài" : "Lưu nháp"}
          </GradientButton>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md">
          <div>
            <label className={labelClass}>Tiêu đề bài viết</label>
            <input
              type="text"
              placeholder="Nhập tiêu đề..."
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>Slug (URL)</label>
            <input
              type="text"
              placeholder="tu-dong-tao-tu-tieu-de"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>Tóm tắt</label>
            <textarea
              placeholder="Mô tả ngắn cho bài viết..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>Nội dung</label>
            <ArticleRichEditor
              value={content}
              onChange={setContent}
              placeholder="Viết nội dung bài viết tại đây..."
            />
          </div>

          <ArticleSeoReview
            title={title}
            slug={slug}
            summary={summary}
            contentHtml={content}
            imageUrl={imageUrl}
          />
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md">
            <h3 className="mb-4 text-sm font-bold text-white">Cài đặt bài viết</h3>

            <div className="space-y-4">
              <div>
                <label className={labelClass}>Danh mục</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}
                  className={fieldClass}
                >
                  <option value="">Chọn danh mục</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Trạng thái</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "draft" | "published")}
                  className={fieldClass}
                >
                  <option value="draft">Nháp</option>
                  <option value="published">Đăng ngay</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md">
            <h3 className="mb-4 text-sm font-bold text-white">Ảnh đại diện</h3>
            {imageUrl ? (
              <div className="group relative">
                <img
                  src={imageUrl}
                  alt="Ảnh đại diện"
                  className="h-40 w-full cursor-pointer rounded-xl border border-white/10 object-cover transition-opacity group-hover:opacity-70"
                  onClick={() => setCoverModalOpen(true)}
                />
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  className="absolute right-2 top-2 rounded-lg bg-black/60 p-1.5 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-black/80"
                  title="Gỡ ảnh"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCoverModalOpen(true)}
                className="flex h-40 w-full cursor-pointer items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.02] transition-colors hover:border-sky-500/40 hover:bg-white/[0.04]"
              >
                <div className="flex flex-col items-center gap-2 text-slate-500">
                  <PhotoIcon className="h-10 w-10" />
                  <span className="text-xs font-medium">Bấm để chọn ảnh</span>
                </div>
              </button>
            )}
          </div>

          <ArticleImageInsertModal
            isOpen={coverModalOpen}
            onClose={() => setCoverModalOpen(false)}
            onInsert={(url) => setImageUrl(url)}
          />
        </div>
      </div>
    </div>
  );
}
