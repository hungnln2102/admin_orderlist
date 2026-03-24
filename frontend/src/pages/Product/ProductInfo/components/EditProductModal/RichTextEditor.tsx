import React, { useEffect, useRef } from "react";
import {
  Bars3Icon,
  BoldIcon,
  ChatBubbleBottomCenterTextIcon,
  ItalicIcon,
  LinkIcon,
  ListBulletIcon,
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

  useEffect(() => {
    if (editorRef.current && !isUpdatingRef.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || "";
      }
    }
  }, [value]);

  const handleInput = () => {
    if (!editorRef.current) return;
    isUpdatingRef.current = true;
    onChange(editorRef.current.innerHTML);
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 0);
  };

  const execCommand = (command: string, commandValue?: string) => {
    document.execCommand(command, false, commandValue);
    editorRef.current?.focus();
    handleInput();
  };

  const formatBlock = (tag: string) => {
    execCommand("formatBlock", tag);
  };

  const insertLink = () => {
    const url = prompt("Nhập URL:");
    if (url) {
      execCommand("createLink", url);
    }
  };

  const toolbarButtonClass =
    "product-edit-editor__button inline-flex min-h-[42px] min-w-[42px] items-center justify-center rounded-xl border transition-all";
  const toolbarSelectClass =
    "product-edit-editor__select min-h-[42px] min-w-[184px] rounded-xl border px-4 text-sm transition-all";

  return (
    <div className="product-edit-editor space-y-3">
      <label className="product-edit-editor__label block text-xs font-semibold uppercase tracking-wide">
        {label}
      </label>
      {helperText && (
        <p className="product-edit-editor__helper text-xs">{helperText}</p>
      )}

      <div className="product-edit-editor__toolbar flex flex-wrap items-center gap-2">
        <select
          onChange={(e) => {
            if (e.target.value) {
              formatBlock(e.target.value);
              e.target.value = "";
            }
          }}
          className={toolbarSelectClass}
          defaultValue=""
        >
          <option value="" disabled>
            Định dạng tiêu đề
          </option>
          <option value="h2">H2 - Tiêu đề section</option>
          <option value="h3">H3 - Tiêu đề mục con</option>
          <option value="h4">H4 - Tiêu đề nhỏ</option>
          <option value="p">Đoạn văn bản</option>
        </select>

        <div className="product-edit-editor__divider h-10 w-px" />

        <button
          type="button"
          onClick={() => execCommand("bold")}
          className={toolbarButtonClass}
          title="Bold (Ctrl+B)"
        >
          <BoldIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand("italic")}
          className={toolbarButtonClass}
          title="Italic (Ctrl+I)"
        >
          <ItalicIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand("underline")}
          className={toolbarButtonClass}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon className="h-4 w-4" />
        </button>

        <div className="product-edit-editor__divider h-10 w-px" />

        <button
          type="button"
          onClick={() => execCommand("insertUnorderedList")}
          className={toolbarButtonClass}
          title="Danh sách không thứ tự"
        >
          <ListBulletIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand("insertOrderedList")}
          className={toolbarButtonClass}
          title="Danh sách có thứ tự"
        >
          <Bars3Icon className="h-4 w-4" />
        </button>

        <div className="product-edit-editor__divider h-10 w-px" />

        <button
          type="button"
          onClick={insertLink}
          className={toolbarButtonClass}
          title="Chèn liên kết"
        >
          <LinkIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => formatBlock("blockquote")}
          className={toolbarButtonClass}
          title="Trích dẫn"
        >
          <ChatBubbleBottomCenterTextIcon className="h-4 w-4" />
        </button>

        <div className="product-edit-editor__divider h-10 w-px" />

        <button
          type="button"
          onClick={() => execCommand("removeFormat")}
          className={`${toolbarButtonClass} product-edit-editor__button--danger`}
          title="Xóa định dạng"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="product-edit-editor__canvas w-full overflow-y-auto rounded-[20px] border px-4 py-4 text-sm outline-none transition-all max-w-none"
        style={{ minHeight }}
        data-placeholder={placeholder}
      />

      <style>{`
        .product-edit-editor__canvas[data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: rgb(148 163 184);
          pointer-events: none;
        }

        .product-edit-editor__canvas h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0.5rem 0;
          line-height: 1.2;
        }

        .product-edit-editor__canvas h2 {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0.5rem 0;
          line-height: 1.3;
        }

        .product-edit-editor__canvas h3 {
          font-size: 1.125rem;
          font-weight: 600;
          margin: 0.5rem 0;
          line-height: 1.4;
        }

        .product-edit-editor__canvas h4 {
          font-size: 1rem;
          font-weight: 600;
          margin: 0.5rem 0;
        }

        .product-edit-editor__canvas h5 {
          font-size: 0.875rem;
          font-weight: 600;
          margin: 0.5rem 0;
        }

        .product-edit-editor__canvas h6 {
          font-size: 0.75rem;
          font-weight: 600;
          margin: 0.5rem 0;
        }

        .product-edit-editor__canvas p {
          margin: 0.5rem 0;
        }

        .product-edit-editor__canvas blockquote {
          border-left: 4px solid rgb(129 140 248);
          padding-left: 1rem;
          font-style: italic;
          color: rgb(203 213 225);
          margin: 0.75rem 0;
        }

        .product-edit-editor__canvas ul,
        .product-edit-editor__canvas ol {
          margin: 0.75rem 0;
          padding-left: 1.5rem;
        }

        .product-edit-editor__canvas li {
          margin: 0.25rem 0;
        }

        .product-edit-editor__canvas a {
          color: rgb(165 180 252);
          text-decoration: underline;
        }

        .product-edit-editor__canvas a:hover {
          color: rgb(196 181 253);
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
