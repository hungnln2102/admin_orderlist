export function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

export function slugLooksOk(slug: string): boolean {
  const s = slug.trim();
  if (!s) return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(s);
}

/** Từ đầu tiên có độ dài >= 3 trong tiêu đề (bỏ stop words tiếng Việt/Anh đơn giản) */
export function titleKeywords(title: string): string[] {
  const stop = new Set([
    "và", "của", "cho", "với", "là", "có", "để", "trong", "một", "các", "the", "a", "an", "for", "to", "of",
  ]);
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/gi, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !stop.has(w))
    .slice(0, 5);
}

