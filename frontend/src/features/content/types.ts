export type Article = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  content: string;
  image_url: string;
  category_id: number | null;
  category: string;
  status: "published" | "draft";
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ArticleCategory = {
  id: number;
  name: string;
  slug: string;
  description: string;
  sort_order: number;
  article_count: number;
  created_at: string;
  updated_at: string;
};

export type Banner = {
  id: number;
  image_url: string;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};
