import React, { useEffect, useRef, useState } from "react";
import {
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  Bars3BottomLeftIcon,
  Bars3CenterLeftIcon,
  Bars3Icon,
  BoldIcon,
  ChatBubbleBottomCenterTextIcon,
  ItalicIcon,
  LinkIcon,
  ListBulletIcon,
  MinusIcon,
  StrikethroughIcon,
  UnderlineIcon,
} from "@heroicons/react/24/outline";

interface RichTextEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  helperText?: string;
}

type EditorMode = "visual" | "html";

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  label,
  value,
  onChange,
  placeholder = "Nhập nội dung...",
  minHeight = "200px",
  helperText,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isUpdatingRef = useRef(false);
  const [mode, setMode] = useState<EditorMode>("visual");

  useEffect(() => {
    if (mode !== "visual") return;
    if (!editorRef.current || isUpdatingRef.current) return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [mode, value]);

  const handleInput = () => {
    if (!editorRef.current) return;
    isUpdatingRef.current = true;
    onChange(editorRef.current.innerHTML);
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 0);
  };

  const ensureVisualMode = () => {
    if (mode !== "visual") {
      setMode("visual");
    }
  };

  const execCommand = (command: string, commandValue?: string) => {
    ensureVisualMode();
    document.execCommand(command, false, commandValue);
    editorRef.current?.focus();
    handleInput();
  };

  const formatBlock = (tag: string) => {
    execCommand("formatBlock", tag);
  };

  const insertLink = () => {
    const url = prompt("Nhập URL liên kết:");
    if (url) {
      execCommand("createLink", url);
    }
  };

  const switchMode = (nextMode: EditorMode) => {
    if (nextMode === mode) return;
    if (nextMode === "html" && editorRef.current) {
      onChange(editorRef.current.innerHTML || "");
    }
    setMode(nextMode);
  };

  const buttonClass =
    "product-edit-editor__button inline-flex min-h-[30px] min-w-[30px] items-center justify-center rounded-md border transition-all";
  const selectClass =
    "product-edit-editor__select min-h-[32px] rounded-md border px-3 text-sm transition-all";

  return (
    <div className="product-edit-editor space-y-3">
      <label className="product-edit-editor__label block text-xs font-semibold uppercase tracking-wide">
        {label}
      </label>
      {helperText ? (
        <p className="product-edit-editor__helper text-xs">{helperText}</p>
      ) : null}

      <div className="product-edit-editor__toolbar">
        <div className="product-edit-editor__toolbar-row product-edit-editor__toolbar-row--compact">
          <div
            className="product-edit-editor__mode-switch"
            role="tablist"
            aria-label={`${label} mode`}
          >
            <button
              type="button"
              className={`product-edit-editor__mode-button ${
                mode === "visual"
                  ? "product-edit-editor__mode-button--active"
                  : ""
              }`}
              onClick={() => switchMode("visual")}
              aria-pressed={mode === "visual"}
            >
              Soạn thảo
            </button>
            <button
              type="button"
              className={`product-edit-editor__mode-button ${
                mode === "html" ? "product-edit-editor__mode-button--active" : ""
              }`}
              onClick={() => switchMode("html")}
              aria-pressed={mode === "html"}
            >
              Mã HTML
            </button>
          </div>

          <div className="product-edit-editor__group">
            <button
              type="button"
              onClick={() => execCommand("undo")}
              className={buttonClass}
              title="Hoàn tác"
              disabled={mode === "html"}
            >
              <ArrowUturnLeftIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => execCommand("redo")}
              className={buttonClass}
              title="Làm lại"
              disabled={mode === "html"}
            >
              <ArrowUturnRightIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="product-edit-editor__group">
            <button
              type="button"
              onClick={insertLink}
              className={buttonClass}
              title="Chèn liên kết"
              disabled={mode === "html"}
            >
              <LinkIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => execCommand("unlink")}
              className={buttonClass}
              title="Gỡ liên kết"
              disabled={mode === "html"}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 010 5.656l-1.414 1.414a4 4 0 01-5.657-5.657l1.414-1.414M10.172 13.828a4 4 0 010-5.656l1.414-1.414a4 4 0 115.657 5.657l-1.414 1.414"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 8l8 8"
                />
              </svg>
            </button>
          </div>

          <div className="product-edit-editor__group product-edit-editor__group--danger">
            <button
              type="button"
              onClick={() => execCommand("removeFormat")}
              className={`${buttonClass} product-edit-editor__button--danger`}
              title="Xóa định dạng"
              disabled={mode === "html"}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="product-edit-editor__toolbar-row product-edit-editor__toolbar-row--actions">
          <div className="product-edit-editor__group">
            <button
              type="button"
              onClick={() => execCommand("bold")}
              className={buttonClass}
              title="In đậm"
              disabled={mode === "html"}
            >
              <BoldIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => execCommand("italic")}
              className={buttonClass}
              title="In nghiêng"
              disabled={mode === "html"}
            >
              <ItalicIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => execCommand("underline")}
              className={buttonClass}
              title="Gạch chân"
              disabled={mode === "html"}
            >
              <UnderlineIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => execCommand("strikeThrough")}
              className={buttonClass}
              title="Gạch ngang"
              disabled={mode === "html"}
            >
              <StrikethroughIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="product-edit-editor__group">
            <button
              type="button"
              onClick={() => execCommand("insertUnorderedList")}
              className={buttonClass}
              title="Danh sách không thứ tự"
              disabled={mode === "html"}
            >
              <ListBulletIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => execCommand("insertOrderedList")}
              className={buttonClass}
              title="Danh sách có thứ tự"
              disabled={mode === "html"}
            >
              <Bars3Icon className="h-4 w-4" />
            </button>
          </div>

          <div className="product-edit-editor__group">
            <button
              type="button"
              onClick={() => execCommand("justifyLeft")}
              className={buttonClass}
              title="Căn trái"
              disabled={mode === "html"}
            >
              <Bars3BottomLeftIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => execCommand("justifyCenter")}
              className={buttonClass}
              title="Căn giữa"
              disabled={mode === "html"}
            >
              <Bars3CenterLeftIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => execCommand("justifyRight")}
              className={buttonClass}
              title="Căn phải"
              disabled={mode === "html"}
            >
              <Bars3BottomLeftIcon className="h-4 w-4 scale-x-[-1]" />
            </button>
          </div>

          <div className="product-edit-editor__group">
            <button
              type="button"
              onClick={() => formatBlock("blockquote")}
              className={buttonClass}
              title="Trích dẫn"
              disabled={mode === "html"}
            >
              <ChatBubbleBottomCenterTextIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => execCommand("insertHorizontalRule")}
              className={buttonClass}
              title="Chèn đường phân cách"
              disabled={mode === "html"}
            >
              <MinusIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="product-edit-editor__toolbar-row product-edit-editor__toolbar-row--fields">
          <select
            onChange={(e) => {
              if (e.target.value) {
                formatBlock(e.target.value);
                e.target.value = "";
              }
            }}
            className={`${selectClass} product-edit-editor__select--kind`}
            defaultValue=""
            disabled={mode === "html"}
          >
            <option value="" disabled>
              Kiểu
            </option>
            <option value="h1">H1 - Tiêu đề chính</option>
            <option value="h2">H2 - Tiêu đề section</option>
            <option value="h3">H3 - Tiêu đề mục con</option>
            <option value="h4">H4 - Tiêu đề nhỏ</option>
            <option value="p">P - Đoạn văn bản</option>
          </select>

          <select
            onChange={(e) => {
              if (e.target.value) {
                execCommand("fontName", e.target.value);
                e.target.value = "";
              }
            }}
            className={`${selectClass} product-edit-editor__select--font`}
            defaultValue=""
            disabled={mode === "html"}
          >
            <option value="" disabled>
              Phông
            </option>
            <option value="Arial">Arial</option>
            <option value="Georgia">Georgia</option>
            <option value="Tahoma">Tahoma</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Verdana">Verdana</option>
          </select>

          <select
            onChange={(e) => {
              if (e.target.value) {
                execCommand("fontSize", e.target.value);
                e.target.value = "";
              }
            }}
            className={`${selectClass} product-edit-editor__select--size`}
            defaultValue=""
            disabled={mode === "html"}
          >
            <option value="" disabled>
              Cỡ chữ
            </option>
            <option value="2">Nhỏ</option>
            <option value="3">Mặc định</option>
            <option value="4">Vừa</option>
            <option value="5">Lớn</option>
            <option value="6">Rất lớn</option>
          </select>
        </div>
      </div>

      {mode === "html" ? (
        <textarea
          className="product-edit-editor__source w-full border px-4 py-4 text-sm outline-none transition-all"
          style={{ minHeight }}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Nhập mã HTML source..."
          spellCheck={false}
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          className="product-edit-editor__canvas w-full overflow-y-auto border px-4 py-4 text-sm outline-none transition-all max-w-none"
          style={{ minHeight }}
          data-placeholder={placeholder}
        />
      )}

      <style>{`
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
      `}</style>
    </div>
  );
};

export default RichTextEditor;
