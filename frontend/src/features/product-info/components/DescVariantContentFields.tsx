import React from "react";
import RichTextEditor from "./EditProductModal/RichTextEditor";
import { SeoPreviewPanel } from "./EditProductModal/SeoPreviewPanel";

type SeoPreviewPanelProps = React.ComponentProps<typeof SeoPreviewPanel>;

type DescVariantContentFieldsProps = {
  shortDescription: string;
  rulesHtml: string;
  descriptionHtml: string;
  onShortDescriptionChange: (value: string) => void;
  onRulesHtmlChange: (value: string) => void;
  onDescriptionHtmlChange: (value: string) => void;
  seoEvaluation: SeoPreviewPanelProps["evaluation"];
  seoAuditLoading: boolean;
  seoAuditError: string | null;
  panelClassName?: string;
};

export const DescVariantContentFields: React.FC<DescVariantContentFieldsProps> = ({
  shortDescription,
  rulesHtml,
  descriptionHtml,
  onShortDescriptionChange,
  onRulesHtmlChange,
  onDescriptionHtmlChange,
  seoEvaluation,
  seoAuditLoading,
  seoAuditError,
  panelClassName = "p-5",
}) => (
  <section
    className={`product-edit-modal__panel product-edit-modal__panel--editor ${panelClassName}`}
  >
    <div className="product-edit-modal__editor-stack">
      <section className="product-edit-modal__content-block">
        <div className="product-edit-modal__content-head">
          <div className="product-edit-modal__content-copy">
            <p className="product-edit-modal__content-kicker">short_desc</p>
            <h3 className="product-edit-modal__content-title">Mô tả ngắn</h3>
            <p className="product-edit-modal__content-summary">
              Meta / teaser — giữ ngắn.
            </p>
          </div>
          <span className="product-edit-modal__content-badge product-edit-modal__content-badge--description">
            Plain text
          </span>
        </div>
        <textarea
          className="product-edit-modal__textarea max-h-[140px] min-h-[88px] w-full rounded-[18px]"
          value={shortDescription}
          onChange={(event) => onShortDescriptionChange(event.target.value)}
          placeholder="Nhập mô tả ngắn…"
          rows={3}
        />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">
        <section className="product-edit-modal__content-block flex h-full min-h-0 flex-col">
          <div className="product-edit-modal__content-head">
            <div className="product-edit-modal__content-copy">
              <p className="product-edit-modal__content-kicker">rules</p>
              <h3 className="product-edit-modal__content-title">Quy tắc</h3>
              <p className="product-edit-modal__content-summary">
                Điều kiện, lưu ý — HTML.
              </p>
            </div>
            <span className="product-edit-modal__content-badge product-edit-modal__content-badge--rules">
              HTML / CMS
            </span>
          </div>
          <div className="min-h-0 flex-1">
            <RichTextEditor
              label="Quy tắc (rules)"
              value={rulesHtml}
              onChange={onRulesHtmlChange}
              placeholder="Soạn quy tắc, hướng dẫn…"
              minHeight="280px"
            />
          </div>
        </section>

        <section className="product-edit-modal__content-block flex h-full min-h-0 flex-col">
          <div className="product-edit-modal__content-head">
            <div className="product-edit-modal__content-copy">
              <p className="product-edit-modal__content-kicker">description</p>
              <h3 className="product-edit-modal__content-title">
                Thông tin / mô tả
              </h3>
              <p className="product-edit-modal__content-summary">
                Nội dung chi tiết — HTML.
              </p>
            </div>
            <span className="product-edit-modal__content-badge product-edit-modal__content-badge--description">
              HTML / CMS
            </span>
          </div>
          <div className="min-h-0 flex-1">
            <RichTextEditor
              label="Thông tin / mô tả (description)"
              value={descriptionHtml}
              onChange={onDescriptionHtmlChange}
              placeholder="Soạn mô tả chi tiết…"
              minHeight="280px"
            />
          </div>
        </section>
      </div>

      <SeoPreviewPanel
        evaluation={seoEvaluation}
        loading={seoAuditLoading}
        error={seoAuditError}
      />
    </div>
  </section>
);
