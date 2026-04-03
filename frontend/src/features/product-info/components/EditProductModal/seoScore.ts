export type SeoCheckItem = {
  label: string;
  detail: string;
  ready: boolean;
  weight: number;
};

export type SeoLevel = "critical" | "warning" | "good" | "excellent";

export type SeoEvaluation = {
  source: "website-render";
  passThreshold: number;
  checks: SeoCheckItem[];
  score: number;
  level: SeoLevel;
  readyCount: number;
  heading: string;
  slug: string;
  shortDescription: string;
  descriptionPlainText: string;
  rulesPlainText: string;
  titlePreview: string;
  metaPreview: string;
  imageAlt: string;
};

export const EMPTY_SEO_EVALUATION: SeoEvaluation = {
  source: "website-render",
  passThreshold: 93,
  checks: [],
  score: 0,
  level: "critical",
  readyCount: 0,
  heading: "",
  slug: "",
  shortDescription: "",
  descriptionPlainText: "",
  rulesPlainText: "",
  titlePreview: "Mavryk Premium",
  metaPreview: "",
  imageAlt: "",
};
