import React, { useRef, useEffect } from "react";
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  LinkIcon,
  ListBulletIcon,
  Bars3Icon,
  ChatBubbleBottomCenterTextIcon,
} from "@heroicons/react/24/outline";

interface RichTextEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  label,
  value,
  onChange,
  placeholder = "Nhập nội dung...",
  minHeight = "200px",
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
    if (editorRef.current) {
      isUpdatingRef.current = true;
      onChange(editorRef.current.innerHTML);
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
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
    "p-2.5 rounded-lg border border-white/10 bg-slate-800/60 text-slate-300 hover:bg-slate-700/80 hover:text-white hover:border-white/20 transition-all flex items-center justify-center min-w-[40px]";

  const toolbarSelectClass =
    "px-3 py-2 rounded-lg border border-white/10 bg-slate-800/60 text-slate-300 text-sm hover:bg-slate-700/80 hover:border-white/20 transition-all cursor-pointer min-w-[140px]";

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
        {label}
      </label>
      
      {/* SEO-Friendly Toolbar */}
      <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-white/10 bg-slate-950/40">
        {/* Heading Selector */}
        <select
          onChange={(e) => {
            if (e.target.value) {
              formatBlock(e.target.value);
              e.target.value = ""; // Reset after selection
            }
          }}
          className={toolbarSelectClass}
          defaultValue=""
        >
          <option value="" disabled>Định dạng tiêu đề</option>
          <option value="h1">H1 - Tiêu đề chính</option>
          <option value="h2">H2 - Tiêu đề phụ</option>
          <option value="h3">H3 - Tiêu đề cấp 3</option>
          <option value="h4">H4 - Tiêu đề cấp 4</option>
          <option value="h5">H5 - Tiêu đề cấp 5</option>
          <option value="h6">H6 - Tiêu đề cấp 6</option>
          <option value="p">Đoạn văn bản</option>
        </select>

        <div className="w-px h-10 bg-white/10" />

        {/* Text Formatting */}
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

        <div className="w-px h-10 bg-white/10" />

        {/* Lists */}
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

        <div className="w-px h-10 bg-white/10" />

        {/* Link & Quote */}
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

        <div className="w-px h-10 bg-white/10" />

        {/* Clear Formatting */}
        <button
          type="button"
          onClick={() => execCommand("removeFormat")}
          className={`${toolbarButtonClass} text-red-400 hover:text-red-300`}
          title="Xóa định dạng"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white placeholder:text-slate-400 shadow-inner focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all overflow-y-auto prose prose-invert prose-headings:text-white prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h4:text-base prose-h5:text-sm prose-h6:text-xs prose-p:text-sm prose-a:text-indigo-400 prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:pl-4 prose-blockquote:italic max-w-none"
        style={{ minHeight }}
        data-placeholder={placeholder}
      />
      
      <style>{`
        [contentEditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: rgb(148 163 184);
          pointer-events: none;
        }
        
        /* SEO-friendly heading styles */
        [contentEditable] h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
          line-height: 1.2;
        }
        
        [contentEditable] h2 {
          font-size: 1.25rem;
          font-weight: 700;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
          line-height: 1.3;
        }
        
        [contentEditable] h3 {
          font-size: 1.125rem;
          font-weight: 600;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
          line-height: 1.4;
        }
        
        [contentEditable] h4 {
          font-size: 1rem;
          font-weight: 600;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        
        [contentEditable] h5 {
          font-size: 0.875rem;
          font-weight: 600;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        
        [contentEditable] h6 {
          font-size: 0.75rem;
          font-weight: 600;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        
        [contentEditable] p {
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        
        [contentEditable] blockquote {
          border-left: 4px solid rgb(99 102 241);
          padding-left: 1rem;
          font-style: italic;
          color: rgb(203 213 225);
          margin: 0.5rem 0;
        }
        
        [contentEditable] ul, [contentEditable] ol {
          margin: 0.5rem 0;
          padding-left: 1.5rem;
        }
        
        [contentEditable] li {
          margin: 0.25rem 0;
        }
        
        [contentEditable] a {
          color: rgb(129 140 248);
          text-decoration: underline;
        }
        
        [contentEditable] a:hover {
          color: rgb(165 180 252);
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
