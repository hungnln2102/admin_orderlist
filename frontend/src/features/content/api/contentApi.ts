import { apiGet, apiPost, apiPatch, apiDelete } from "@/shared/api/client";
import type { Article, ArticleCategory, Banner, BannerPayload } from "../types";

// ── Article Categories ──────────────────────────────────────

export const fetchCategories = (): Promise<ArticleCategory[]> =>
  apiGet<ArticleCategory[]>("/api/content/categories");

export const createCategory = (data: { name: string; slug?: string; description?: string }): Promise<ArticleCategory> =>
  apiPost<ArticleCategory>("/api/content/categories", data);

export const updateCategory = (id: number | string, data: { name: string; slug?: string; description?: string }): Promise<ArticleCategory> =>
  apiPatch<ArticleCategory>(`/api/content/categories/${id}`, data);

export const deleteCategory = (id: number | string): Promise<void> =>
  apiDelete(`/api/content/categories/${id}`);

// ── Articles ────────────────────────────────────────────────

export type ArticlesListResponse = {
  items: Article[];
  total: number;
  page: number;
  limit: number;
};

export async function fetchArticles(params?: {
  search?: string;
  status?: string;
  category_id?: number;
  page?: number;
  limit?: number;
}): Promise<ArticlesListResponse> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.status) qs.set("status", params.status);
  if (params?.category_id) qs.set("category_id", String(params.category_id));
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  const q = qs.toString();
  return apiGet<ArticlesListResponse>(`/api/content/articles${q ? `?${q}` : ""}`);
}

export const fetchArticle = (id: number | string): Promise<Article> =>
  apiGet<Article>(`/api/content/articles/${id}`);

export type ArticleSavePayload = {
  title: string;
  slug?: string;
  summary?: string;
  content?: string;
  image_url?: string;
  category_id?: number | null;
  status?: "draft" | "published";
};

export const createArticle = (data: ArticleSavePayload): Promise<Article> =>
  apiPost<Article>("/api/content/articles", data);

export const updateArticle = (id: number | string, data: ArticleSavePayload): Promise<Article> =>
  apiPatch<Article>(`/api/content/articles/${id}`, data);

export const deleteArticle = (id: number | string): Promise<void> =>
  apiDelete(`/api/content/articles/${id}`);

// ── Banners ─────────────────────────────────────────────────

export const fetchBanners = (): Promise<Banner[]> =>
  apiGet<Banner[]>("/api/content/banners");

export const createBanner = (data: BannerPayload): Promise<Banner> =>
  apiPost<Banner>("/api/content/banners", data);

export const updateBanner = (id: number | string, data: Partial<BannerPayload>): Promise<Banner> =>
  apiPatch<Banner>(`/api/content/banners/${id}`, data);

export const toggleBanner = (id: number | string): Promise<Banner> =>
  apiPatch<Banner>(`/api/content/banners/${id}/toggle`);

export const reorderBanners = (ids: number[]): Promise<Banner[]> =>
  apiPost<Banner[]>("/api/content/banners/reorder", { ids });

export const deleteBanner = (id: number | string): Promise<void> =>
  apiDelete(`/api/content/banners/${id}`);
