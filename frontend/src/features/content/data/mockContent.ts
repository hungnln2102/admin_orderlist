import type { Article, ArticleCategory, Banner } from "../types";

export const MOCK_ARTICLES: Article[] = [
  {
    id: "1",
    slug: "huong-dan-adobe-creative-cloud-cho-nguoi-moi",
    title: "Hướng dẫn Adobe Creative Cloud cho người mới bắt đầu",
    category: "Hướng dẫn",
    summary: "Tổng hợp các bước đăng nhập, đổi mật khẩu, đăng xuất tài khoản.",
    publishedAt: "2026-03-28",
    status: "published",
  },
  {
    id: "2",
    slug: "quy-trinh-xu-ly-don-va-ho-tro-sau-mua",
    title: "Cách Mavryk Premium Store xử lý đơn và hỗ trợ sau mua",
    category: "Nội bộ",
    summary: "Tóm tắt cách cửa hàng tiếp nhận đơn, gửi key, hỗ trợ kích hoạt.",
    publishedAt: "2026-03-24",
    status: "published",
  },
];

export const MOCK_CATEGORIES: ArticleCategory[] = [
  { id: "1", name: "Hướng dẫn", slug: "huong-dan", articleCount: 2 },
  { id: "2", name: "Nội bộ", slug: "noi-bo", articleCount: 2 },
  { id: "3", name: "Danh mục", slug: "danh-muc", articleCount: 2 },
  { id: "4", name: "Bán chạy", slug: "ban-chay", articleCount: 2 },
  { id: "5", name: "Sản phẩm mới", slug: "san-pham-moi", articleCount: 2 },
  { id: "6", name: "Khuyến mãi", slug: "khuyen-mai", articleCount: 2 },
];

export const MOCK_BANNERS: Banner[] = [
  {
    id: "1",
    title: "Banner khuyến mãi mùa hè",
    imageUrl: "/assets/images/logo-512",
    linkUrl: "/promotions",
    order: 1,
    active: true,
  },
  {
    id: "2",
    title: "Hỗ trợ 24/7",
    imageUrl: "/assets/images/logo-512",
    linkUrl: "/about",
    order: 2,
    active: true,
  },
];

export const ARTICLES_PAGE_SIZE = 10;
