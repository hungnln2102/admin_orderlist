import React from "react";
import RichTextEditor from "./RichTextEditor";

type SeoContentSectionProps = {
  kicker: string;
  title: string;
  description: string;
  badgeText: string;
  badgeClassName: string;
  editorLabel: string;
  editorValue: string;
  editorPlaceholder: string;
  onEditorChange: (value: string) => void;
};

export const SeoContentSection: React.FC<SeoContentSectionProps> = ({
  kicker,
  title,
  description,
  badgeText,
  badgeClassName,
  editorLabel,
  editorValue,
  editorPlaceholder,
  onEditorChange,
}) => (
  <section className="product-edit-modal__content-block">
    <div className="product-edit-modal__content-head">
      <div className="product-edit-modal__content-copy">
        <p className="product-edit-modal__content-kicker">{kicker}</p>
        <h3 className="product-edit-modal__content-title">{title}</h3>
        <p className="product-edit-modal__content-summary">{description}</p>
      </div>
      <span className={badgeClassName}>{badgeText}</span>
    </div>

    <RichTextEditor
      label={editorLabel}
      value={editorValue}
      onChange={onEditorChange}
      placeholder={editorPlaceholder}
      minHeight="340px"
    />
  </section>
);
