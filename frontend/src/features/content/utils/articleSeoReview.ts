export type SeoLevel = "good" | "warn" | "bad";

export type SeoCheckItem = {
  id: string;
  label: string;
  level: SeoLevel;
  detail: string;
};

function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

function slugLooksOk(slug: string): boolean {
  const s = slug.trim();
  if (!s) return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(s);
}

/** Từ đầu tiên có độ dài >= 3 trong tiêu đề (bỏ stop words tiếng Việt/Anh đơn giản) */
function titleKeywords(title: string): string[] {
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

export function buildArticleSeoChecks(input: {
  title: string;
  slug: string;
  summary: string;
  contentHtml: string;
  imageUrl: string;
}): { items: SeoCheckItem[]; overall: SeoLevel; scoreLabel: string } {
  const title = input.title.trim();
  const slug = input.slug.trim();
  const summary = input.summary.trim();
  const plain = stripHtml(input.contentHtml);
  const words = countWords(plain);
  const titleLen = title.length;

  const items: SeoCheckItem[] = [];

  // Tiêu đề
  if (!title) {
    items.push({
      id: "title",
      label: "Tiêu đề SEO",
      level: "bad",
      detail: "Chưa có tiêu đề.",
    });
  } else if (titleLen < 25) {
    items.push({
      id: "title",
      label: "Tiêu đề SEO",
      level: "warn",
      detail: `Tiêu đề hơi ngắn (${titleLen} ký tự). Nên khoảng 30–60 ký tự để hiển thị đủ trên Google.`,
    });
  } else if (titleLen > 70) {
    items.push({
      id: "title",
      label: "Tiêu đề SEO",
      level: "warn",
      detail: `Tiêu đề dài (${titleLen} ký tự), có thể bị cắt trên kết quả tìm kiếm. Ưu tiên dưới ~60 ký tự.`,
    });
  } else {
    items.push({
      id: "title",
      label: "Tiêu đề SEO",
      level: "good",
      detail: `Độ dài tiêu đề ổn (${titleLen} ký tự).`,
    });
  }

  // Slug
  if (!slug) {
    items.push({
      id: "slug",
      label: "Slug (URL)",
      level: "bad",
      detail: "Slug trống — nên có URL thân thiện.",
    });
  } else if (!slugLooksOk(slug)) {
    items.push({
      id: "slug",
      label: "Slug (URL)",
      level: "warn",
      detail: "Slug nên chỉ gồm chữ thường, số và dấu gạch ngang.",
    });
  } else if (slug.length > 80) {
    items.push({
      id: "slug",
      level: "warn",
      label: "Slug (URL)",
      detail: "Slug khá dài — có thể rút gọn cho dễ nhớ.",
    });
  } else {
    items.push({
      id: "slug",
      label: "Slug (URL)",
      level: "good",
      detail: "Định dạng slug hợp lý.",
    });
  }

  // Tóm tắt = meta description
  if (!summary) {
    items.push({
      id: "summary",
      label: "Tóm tắt (meta)",
      level: "warn",
      detail: "Chưa có tóm tắt — Google thường dùng đoạn này làm mô tả trong kết quả tìm kiếm.",
    });
  } else {
    const sl = summary.length;
    if (sl < 100) {
      items.push({
        id: "summary",
        label: "Tóm tắt (meta)",
        level: "warn",
        detail: `Tóm tắt ngắn (${sl} ký tự). Nên khoảng 120–160 ký tự cho snippet.`,
      });
    } else if (sl > 180) {
      items.push({
        id: "summary",
        label: "Tóm tắt (meta)",
        level: "warn",
        detail: `Tóm tắt dài (${sl} ký tự), có thể bị cắt. Gợi ý 120–160 ký tự.`,
      });
    } else {
      items.push({
        id: "summary",
        label: "Tóm tắt (meta)",
        level: "good",
        detail: `Độ dài tóm tắt phù hợp meta (${sl} ký tự).`,
      });
    }
  }

  // Nội dung
  if (!plain) {
    items.push({
      id: "body",
      label: "Nội dung bài viết",
      level: "bad",
      detail: "Chưa có nội dung văn bản.",
    });
  } else if (words < 200) {
    items.push({
      id: "body",
      label: "Nội dung bài viết",
      level: "warn",
      detail: `Nội dung còn mỏng (~${words} từ). Bài dài hơn thường xếp hạng tốt hơn (gợi ý từ 300+ từ).`,
    });
  } else {
    items.push({
      id: "body",
      label: "Nội dung bài viết",
      level: "good",
      detail: `Khoảng ${words} từ — đủ chiều sâu cho bài viết.`,
    });
  }

  // Heading — chỉ "đạt" khi thực sự có ít nhất một H2 hoặc H3
  const h2 = (input.contentHtml.match(/<h2\b/gi) || []).length;
  const h3 = (input.contentHtml.match(/<h3\b/gi) || []).length;
  const headingCount = h2 + h3;
  if (headingCount === 0 && !plain.length) {
    items.push({
      id: "headings",
      label: "Cấu trúc heading",
      level: "warn",
      detail: "Chưa có nội dung — khi soạn bài nên thêm H2/H3 để chia mục.",
    });
  } else if (headingCount === 0) {
    items.push({
      id: "headings",
      label: "Cấu trúc heading",
      level: "warn",
      detail: "Chưa dùng tiêu đề H2/H3 — nên chia mục để dễ đọc và SEO.",
    });
  } else {
    items.push({
      id: "headings",
      label: "Cấu trúc heading",
      level: "good",
      detail: `Có ${h2} tiêu đề cấp 2 và ${h3} tiêu đề cấp 3.`,
    });
  }

  // Từ khóa từ tiêu đề trong nội dung
  const kws = titleKeywords(title);
  if (kws.length && plain.length > 50) {
    const lower = plain
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d");
    const missing = kws.filter((k) => !lower.includes(k));
    if (missing.length === kws.length) {
      items.push({
        id: "keywords",
        label: "Từ khóa trong nội dung",
        level: "warn",
        detail: "Các từ chính trong tiêu đề chưa xuất hiện rõ trong đoạn đầu nội dung — nên lặp lại tự nhiên.",
      });
    } else if (missing.length > 0) {
      items.push({
        id: "keywords",
        label: "Từ khóa trong nội dung",
        level: "warn",
        detail: `Một số cụm từ từ tiêu đề chưa có trong bài: ${missing.slice(0, 3).join(", ")}.`,
      });
    } else {
      items.push({
        id: "keywords",
        label: "Từ khóa trong nội dung",
        level: "good",
        detail: "Nội dung có liên quan tới các từ chính trong tiêu đề.",
      });
    }
  } else {
    items.push({
      id: "keywords",
      label: "Từ khóa trong nội dung",
      level: "warn",
      detail: "Thêm tiêu đề và nội dung để đánh giá mức độ khớp từ khóa.",
    });
  }

  // Ảnh trong nội dung — alt
  const imgTags = input.contentHtml.match(/<img[^>]*>/gi) || [];
  const imgsNoAlt = imgTags.filter((tag) => !/\salt\s*=/i.test(tag));
  if (imgTags.length && imgsNoAlt.length > 0) {
    items.push({
      id: "img-alt",
      label: "Ảnh trong bài",
      level: "warn",
      detail: `${imgsNoAlt.length} ảnh chưa có thuộc tính alt — nên mô tả ngắn cho SEO và accessibility.`,
    });
  } else if (imgTags.length) {
    items.push({
      id: "img-alt",
      label: "Ảnh trong bài",
      level: "good",
      detail: "Ảnh trong nội dung đã có alt.",
    });
  }

  // Ảnh đại diện
  if (!input.imageUrl?.trim()) {
    items.push({
      id: "cover",
      label: "Ảnh đại diện",
      level: "warn",
      detail: "Chưa có ảnh đại diện — nên thêm cho chia sẻ mạng xã hội và kết quả tìm kiếm.",
    });
  } else {
    items.push({
      id: "cover",
      label: "Ảnh đại diện",
      level: "good",
      detail: "Đã có ảnh đại diện.",
    });
  }

  const bad = items.filter((i) => i.level === "bad").length;
  const warn = items.filter((i) => i.level === "warn").length;

  /**
   * Điểm 0–100: chỉ tiêu chí "đạt" mới được cộng trọn 1 phần.
   * Cảnh báo và lỗi = 0 điểm cho tiêu chí đó (cảnh báo vẫn hiện trong list để bạn sửa).
   */
  const raw =
    items.length === 0
      ? 0
      : items.reduce((sum, i) => (i.level === "good" ? sum + 1 : sum), 0) / items.length;
  const score = Math.round(raw * 100);

  let overall: SeoLevel = "good";
  let scoreLabel = "Tốt — có thể đăng";
  if (bad > 0) {
    overall = "bad";
    scoreLabel = "Cần xử lý trước khi đăng";
  } else if (warn >= 3) {
    overall = "warn";
    scoreLabel = "Nên cải thiện thêm";
  } else if (warn > 0) {
    overall = "warn";
    scoreLabel = "Khá ổn — một vài gợi ý";
  }

  return { items, overall, scoreLabel, score };
}
