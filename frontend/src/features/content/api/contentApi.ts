import { apiFetch } from "@/lib/api";
import type { Article, ArticleCategory, Banner } from "../types";

const json = (res: Response) => res.json();

const throwIfErr = async (res: Response) => {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `HTTP ${res.status}`);
  }
};

// ── Article Categories ──────────────────────────────────────

export async function fetchCategories(): Promise<ArticleCategory[]> {
  const res = await apiFetch("/api/content/categories");
  await throwIfErr(res);
  return json(res);
}

export async function createCategory(data: { name: string; slug?: string; description?: string }): Promise<ArticleCategory> {
  const res = await apiFetch("/api/content/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  await throwIfErr(res);
  return json(res);
}

export async function updateCategory(id: number | string, data: { name: string; slug?: string; description?: string }): Promise<ArticleCategory> {
  const res = await apiFetch(`/api/content/categories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  await throwIfErr(res);
  return json(res);
}

export async function deleteCategory(id: number | string): Promise<void> {
  const res = await apiFetch(`/api/content/categories/${id}`, { method: "DELETE" });
  await throwIfErr(res);
}

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
  const res = await apiFetch(`/api/content/articles${q ? `?${q}` : ""}`);
  await throwIfErr(res);
  return json(res);
}

export async function fetchArticle(id: number | string): Promise<Article> {
  const res = await apiFetch(`/api/content/articles/${id}`);
  await throwIfErr(res);
  return json(res);
}

export type ArticleSavePayload = {
  title: string;
  slug?: string;
  summary?: string;
  content?: string;
  image_url?: string;
  category_id?: number | null;
  status?: "draft" | "published";
};

export async function createArticle(data: ArticleSavePayload): Promise<Article> {
  const res = await apiFetch("/api/content/articles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  await throwIfErr(res);
  return json(res);
}

export async function updateArticle(id: number | string, data: ArticleSavePayload): Promise<Article> {
  const res = await apiFetch(`/api/content/articles/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  await throwIfErr(res);
  return json(res);
}

export async function deleteArticle(id: number | string): Promise<void> {
  const res = await apiFetch(`/api/content/articles/${id}`, { method: "DELETE" });
  await throwIfErr(res);
}

// ── Banners ─────────────────────────────────────────────────

export async function fetchBanners(): Promise<Banner[]> {
  const res = await apiFetch("/api/content/banners");
  await throwIfErr(res);
  return json(res);
}

export async function createBanner(data: { image_url: string }): Promise<Banner> {
  const res = await apiFetch("/api/content/banners", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  await throwIfErr(res);
  return json(res);
}

export async function updateBanner(id: number | string, data: { image_url?: string }): Promise<Banner> {
  const res = await apiFetch(`/api/content/banners/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  await throwIfErr(res);
  return json(res);
}

export async function toggleBanner(id: number | string): Promise<Banner> {
  const res = await apiFetch(`/api/content/banners/${id}/toggle`, { method: "PATCH" });
  await throwIfErr(res);
  return json(res);
}

export async function reorderBanners(ids: number[]): Promise<Banner[]> {
  const res = await apiFetch("/api/content/banners/reorder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  await throwIfErr(res);
  return json(res);
}

export async function deleteBanner(id: number | string): Promise<void> {
  const res = await apiFetch(`/api/content/banners/${id}`, { method: "DELETE" });
  await throwIfErr(res);
}
