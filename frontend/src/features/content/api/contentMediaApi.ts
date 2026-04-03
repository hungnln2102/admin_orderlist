import { apiFetch } from "@/lib/api";

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
