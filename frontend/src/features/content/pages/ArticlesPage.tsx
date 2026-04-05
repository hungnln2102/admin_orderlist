import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  NewspaperIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import GradientButton from "@/components/ui/GradientButton";
import Pagination from "@/components/ui/Pagination";
import type { Article } from "../types";
import { fetchArticles, fetchArticle, deleteArticle } from "../api/contentApi";
import { ArticlePreviewModal } from "../components/ArticlePreviewModal";

const PAGE_SIZE = 10;

export default function ArticlesPage() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewArticle, setPreviewArticle] = useState<Article | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const loadArticles = useCallback(async (page: number, q: string) => {
    setLoading(true);
    try {
      const data = await fetchArticles({ page, limit: PAGE_SIZE, search: q || undefined });
      setArticles(data.items);
      setTotal(data.total);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadArticles(currentPage, search);
  }, [currentPage, search, loadArticles]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const handleDelete = useCallback(
    async (id: number) => {
      if (!window.confirm("Bạn có chắc muốn xóa bài viết này?")) return;
      try {
        await deleteArticle(id);
        loadArticles(currentPage, search);
      } catch {
        alert("Xóa thất bại.");
      }
    },
    [currentPage, search, loadArticles]
  );

  const openPreview = useCallback(async (id: number) => {
    setPreviewOpen(true);
    setPreviewArticle(null);
    setPreviewError(null);
    setPreviewLoading(true);
    try {
      const full = await fetchArticle(id);
      setPreviewArticle(full);
    } catch {
      setPreviewError("Không tải được nội dung bài viết.");
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const closePreview = useCallback(() => {
    setPreviewOpen(false);
    setPreviewArticle(null);
    setPreviewError(null);
  }, []);

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("vi-VN");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
            <NewspaperIcon className="h-7 w-7 text-sky-400" />
            Danh sách bài viết
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Quản lý toàn bộ bài viết trên website tin tức.
          </p>
        </div>
        <GradientButton icon={PencilSquareIcon} onClick={() => navigate("/content/create")}>
          Viết bài mới
        </GradientButton>
      </div>

      <div className="relative max-w-sm">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Tìm theo tiêu đề hoặc danh mục..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none backdrop-blur-md focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3">Tiêu đề</th>
              <th className="px-5 py-3">Danh mục</th>
              <th className="px-5 py-3">Ngày đăng</th>
              <th className="px-5 py-3">Trạng thái</th>
              <th className="px-5 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                  Đang tải...
                </td>
              </tr>
            ) : articles.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                  Chưa có bài viết nào.
                </td>
              </tr>
            ) : (
              articles.map((article) => (
                <tr
                  key={article.id}
                  className="border-b border-white/5 transition-colors hover:bg-white/[0.03]"
                >
                  <td className="max-w-xs truncate px-5 py-3 font-medium text-white">
                    {article.title}
                  </td>
                  <td className="px-5 py-3">
                    {article.category ? (
                      <span className="rounded-full bg-sky-500/15 px-2.5 py-1 text-xs font-semibold text-sky-300">
                        {article.category}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-400">
                    {formatDate(article.published_at || article.created_at)}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        article.status === "published"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      {article.status === "published" ? "Đã đăng" : "Nháp"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        title="Xem trước trong admin"
                        onClick={() => void openPreview(article.id)}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Sửa"
                        onClick={() => navigate(`/content/edit/${article.id}`)}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-sky-400"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Xóa"
                        onClick={() => handleDelete(article.id)}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-rose-400"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      <ArticlePreviewModal
        open={previewOpen}
        article={previewArticle}
        loading={previewLoading}
        error={previewError}
        onClose={closePreview}
      />
    </div>
  );
}
