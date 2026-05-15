export const TOOLBAR_BUTTON_CLASS =
  "product-edit-editor__button inline-flex min-h-[30px] min-w-[30px] items-center justify-center rounded-md border transition-all";

export const TOOLBAR_SELECT_CLASS =
  "product-edit-editor__select min-h-[32px] rounded-md border px-3 text-sm transition-all";

export const EDITOR_STYLE_TEXT = `
  .product-edit-editor__canvas[data-placeholder]:empty:before {
    content: attr(data-placeholder);
    color: rgba(160, 174, 208, 0.72);
    pointer-events: none;
  }

  .product-edit-editor__canvas h1 {
    font-size: 1.8rem;
    font-weight: 800;
    margin: 0.85rem 0;
    line-height: 1.2;
    color: #f8faff;
  }

  .product-edit-editor__canvas h2 {
    font-size: 1.4rem;
    font-weight: 800;
    margin: 1rem 0 0.6rem;
    line-height: 1.28;
    color: #eef2ff;
  }

  .product-edit-editor__canvas h3 {
    font-size: 1.12rem;
    font-weight: 700;
    margin: 0.9rem 0 0.45rem;
    line-height: 1.4;
    color: #dbe5ff;
  }

  .product-edit-editor__canvas h4 {
    font-size: 1rem;
    font-weight: 700;
    margin: 0.8rem 0 0.4rem;
    color: #c9d5f4;
  }

  .product-edit-editor__canvas p {
    margin: 0.55rem 0;
  }

  .product-edit-editor__canvas blockquote {
    margin: 0.95rem 0;
    padding: 0.85rem 1rem;
    border-left: 3px solid rgba(129, 140, 248, 0.82);
    border-radius: 0 14px 14px 0;
    background: rgba(94, 111, 255, 0.12);
    color: #d8e1ff;
    font-style: italic;
  }

  .product-edit-editor__canvas ul,
  .product-edit-editor__canvas ol {
    margin: 0.8rem 0;
    padding-left: 1.5rem;
  }

  .product-edit-editor__canvas li {
    margin: 0.3rem 0;
  }

  .product-edit-editor__canvas hr {
    margin: 1rem 0;
    border: 0;
    border-top: 1px solid rgba(122, 135, 185, 0.34);
  }

  .product-edit-editor__canvas a {
    color: #9db4ff;
    text-decoration: underline;
  }
`;

export const BLOCK_FORMAT_OPTIONS = [
  { value: "h1", label: "H1 - Tiêu đề chính" },
  { value: "h2", label: "H2 - Tiêu đề section" },
  { value: "h3", label: "H3 - Tiêu đề mục con" },
  { value: "h4", label: "H4 - Tiêu đề nhỏ" },
  { value: "p", label: "P - Đoạn văn bản" },
] as const;

export const FONT_OPTIONS = [
  { value: "Arial", label: "Arial" },
  { value: "Georgia", label: "Georgia" },
  { value: "Tahoma", label: "Tahoma" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Verdana", label: "Verdana" },
] as const;

export const FONT_SIZE_OPTIONS = [
  { value: "2", label: "Nhỏ" },
  { value: "3", label: "Mặc định" },
  { value: "4", label: "Vừa" },
  { value: "5", label: "Lớn" },
  { value: "6", label: "Rất lớn" },
] as const;
