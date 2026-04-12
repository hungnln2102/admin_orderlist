import { apiFetch } from "@/lib/api";

export interface ArticleImageItem {
  fileName: string;
  url: string;
}

export interface ArticleImageListResponse {
  items: ArticleImageItem[];
  count: number;
}

export async function fetchArticleImages(): Promise<ArticleImageListResponse> {
  const res = await apiFetch("/api/content/article-images");
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    items?: ArticleImageItem[];
    count?: number;
  };
  if (!res.ok) {
    throw new Error(data.error || "Không tải được danh sách ảnh.");
  }
  const items = Array.isArray(data.items) ? data.items : [];
  return {
    items,
    count: typeof data.count === "number" ? data.count : items.length,
  };
}

export async function uploadArticleImage(file: File): Promise<{ url: string; fileName: string }> {
  const fd = new FormData();
  fd.append("image", file);
  const res = await apiFetch("/api/content/article-image", {
    method: "POST",
    body: fd,
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; url?: string; fileName?: string };
  if (!res.ok) {
    throw new Error(data.error || "Upload ảnh thất bại.");
  }
  if (!data.url) {
    throw new Error("Phản hồi server không hợp lệ.");
  }
  return { url: data.url, fileName: data.fileName || "" };
}
