import React from "react";
import { SeoEvaluation } from "./seoScore";

type SeoPreviewPanelProps = {
  evaluation: SeoEvaluation;
  loading: boolean;
  error: string | null;
};

export const SeoPreviewPanel: React.FC<SeoPreviewPanelProps> = ({
  evaluation,
  loading,
  error,
}) => (
  <section
    className={`product-edit-seo product-edit-seo--preview product-edit-seo--${evaluation.level}`}
  >
    <div className="product-edit-seo__head">
      <div>
        <p className="product-edit-seo__eyebrow">Đánh giá SEO từ Website</p>
        <h3 className="product-edit-seo__title">Khối xem trước SEO</h3>
      </div>
      <div className="product-edit-seo__score">
        <span className="product-edit-seo__score-value">
          {loading ? "..." : `${evaluation.score}/100`}
        </span>
        <span className="product-edit-seo__score-label">
          {evaluation.readyCount}/{evaluation.checks.length || 0} đạt
        </span>
      </div>
    </div>

    <div className="product-edit-seo__progress">
      <div className="product-edit-seo__progress-meta">
        <span className="product-edit-seo__progress-label">
          Điểm SEO render thật từ Website
        </span>
        <span className="product-edit-seo__progress-hint">
          Ngưỡng đạt chuẩn: {evaluation.passThreshold}/100
        </span>
      </div>
      <div className="product-edit-seo__progress-track" aria-hidden="true">
        <span
          className={`product-edit-seo__progress-fill product-edit-seo__progress-fill--${evaluation.level}`}
          style={{ width: `${evaluation.score}%` }}
        />
      </div>
    </div>

    {loading ? (
      <div className="product-edit-seo__check">
        <span className="product-edit-seo__check-title">
          Đang đánh giá Website
        </span>
        <span className="product-edit-seo__check-detail">
          Website server đang chấm điểm từ HTML source hiện tại.
        </span>
      </div>
    ) : null}

    {error ? (
      <div className="product-edit-seo__check">
        <span className="product-edit-seo__check-title">
          Không thể đánh giá
        </span>
        <span className="product-edit-seo__check-detail">{error}</span>
      </div>
    ) : null}

    <div className="product-edit-seo__grid">
      <article className="product-edit-seo__card">
        <span className="product-edit-seo__label">H1 render</span>
        <strong
          className={`product-edit-seo__value ${
            evaluation.heading ? "" : "product-edit-seo__value--muted"
          }`}
        >
          {evaluation.heading || "Chưa có H1 trong phần mô tả"}
        </strong>
      </article>

      <article className="product-edit-seo__card">
        <span className="product-edit-seo__label">Slug render</span>
        <strong
          className={`product-edit-seo__value ${
            evaluation.slug ? "" : "product-edit-seo__value--muted"
          }`}
        >
          {evaluation.slug || "Slug sẽ được suy ra từ H1"}
        </strong>
      </article>

      <article className="product-edit-seo__card">
        <span className="product-edit-seo__label">Alt hình ảnh</span>
        <strong
          className={`product-edit-seo__value ${
            evaluation.imageAlt ? "" : "product-edit-seo__value--muted"
          }`}
        >
          {evaluation.imageAlt || "Website chưa tạo được alt text"}
        </strong>
      </article>

      <article className="product-edit-seo__card product-edit-seo__card--wide">
        <span className="product-edit-seo__label">Xem trước title</span>
        <strong
          className={`product-edit-seo__value ${
            evaluation.titlePreview ? "" : "product-edit-seo__value--muted"
          }`}
        >
          {evaluation.titlePreview}
        </strong>
      </article>

      <article className="product-edit-seo__card product-edit-seo__card--wide">
        <span className="product-edit-seo__label">
          Xem trước meta description
        </span>
        <p
          className={`product-edit-seo__meta ${
            evaluation.metaPreview ? "" : "product-edit-seo__value--muted"
          }`}
        >
          {evaluation.metaPreview}
        </p>
      </article>
    </div>

    <div className="product-edit-seo__checks">
      {evaluation.checks.map((item) => (
        <article
          key={item.label}
          className={`product-edit-seo__check ${
            item.ready ? "product-edit-seo__check--active" : ""
          }`}
        >
          <span className="product-edit-seo__check-title">{item.label}</span>
          <span className="product-edit-seo__check-detail">{item.detail}</span>
        </article>
      ))}
    </div>
  </section>
);
