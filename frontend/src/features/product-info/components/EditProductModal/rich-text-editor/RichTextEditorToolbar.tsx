import type React from "react";
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

import {
  BLOCK_FORMAT_OPTIONS,
  FONT_OPTIONS,
  FONT_SIZE_OPTIONS,
  TOOLBAR_BUTTON_CLASS,
  TOOLBAR_SELECT_CLASS,
} from "./constants";
import type { EditorMode } from "./types";

type RichTextEditorToolbarProps = {
  label: string;
  mode: EditorMode;
  onSwitchMode: (mode: EditorMode) => void;
  onExecCommand: (command: string, commandValue?: string) => void;
  onFormatBlock: (tag: string) => void;
  onInsertLink: () => void;
};

type ToolbarButtonProps = {
  title: string;
  disabled: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
};

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  title,
  disabled,
  onClick,
  className,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={className ?? TOOLBAR_BUTTON_CLASS}
    title={title}
    disabled={disabled}
  >
    {children}
  </button>
);

const UnlinkIcon: React.FC = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13.828 10.172a4 4 0 010 5.656l-1.414 1.414a4 4 0 01-5.657-5.657l1.414-1.414M10.172 13.828a4 4 0 010-5.656l1.414-1.414a4 4 0 115.657 5.657l-1.414 1.414"
    />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 8l8 8" />
  </svg>
);

const ClearFormatIcon: React.FC = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const RichTextEditorToolbar: React.FC<RichTextEditorToolbarProps> = ({
  label,
  mode,
  onSwitchMode,
  onExecCommand,
  onFormatBlock,
  onInsertLink,
}) => {
  const isHtmlMode = mode === "html";

  const handleSelectValue = (
    event: React.ChangeEvent<HTMLSelectElement>,
    callback: (value: string) => void
  ) => {
    const selected = event.target.value;
    if (!selected) return;
    callback(selected);
    event.target.value = "";
  };

  return (
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
              mode === "visual" ? "product-edit-editor__mode-button--active" : ""
            }`}
            onClick={() => onSwitchMode("visual")}
            aria-pressed={mode === "visual"}
          >
            Soạn thảo
          </button>
          <button
            type="button"
            className={`product-edit-editor__mode-button ${
              mode === "html" ? "product-edit-editor__mode-button--active" : ""
            }`}
            onClick={() => onSwitchMode("html")}
            aria-pressed={mode === "html"}
          >
            Mã HTML
          </button>
        </div>

        <div className="product-edit-editor__group">
          <ToolbarButton
            title="Hoàn tác"
            disabled={isHtmlMode}
            onClick={() => onExecCommand("undo")}
          >
            <ArrowUturnLeftIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            title="Làm lại"
            disabled={isHtmlMode}
            onClick={() => onExecCommand("redo")}
          >
            <ArrowUturnRightIcon className="h-4 w-4" />
          </ToolbarButton>
        </div>

        <div className="product-edit-editor__group">
          <ToolbarButton
            title="Chèn liên kết"
            disabled={isHtmlMode}
            onClick={onInsertLink}
          >
            <LinkIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            title="Gỡ liên kết"
            disabled={isHtmlMode}
            onClick={() => onExecCommand("unlink")}
          >
            <UnlinkIcon />
          </ToolbarButton>
        </div>

        <div className="product-edit-editor__group product-edit-editor__group--danger">
          <ToolbarButton
            title="Xóa định dạng"
            disabled={isHtmlMode}
            onClick={() => onExecCommand("removeFormat")}
            className={`${TOOLBAR_BUTTON_CLASS} product-edit-editor__button--danger`}
          >
            <ClearFormatIcon />
          </ToolbarButton>
        </div>
      </div>

      <div className="product-edit-editor__toolbar-row product-edit-editor__toolbar-row--actions">
        <div className="product-edit-editor__group">
          <ToolbarButton
            title="In đậm"
            disabled={isHtmlMode}
            onClick={() => onExecCommand("bold")}
          >
            <BoldIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            title="In nghiêng"
            disabled={isHtmlMode}
            onClick={() => onExecCommand("italic")}
          >
            <ItalicIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            title="Gạch chân"
            disabled={isHtmlMode}
            onClick={() => onExecCommand("underline")}
          >
            <UnderlineIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            title="Gạch ngang"
            disabled={isHtmlMode}
            onClick={() => onExecCommand("strikeThrough")}
          >
            <StrikethroughIcon className="h-4 w-4" />
          </ToolbarButton>
        </div>

        <div className="product-edit-editor__group">
          <ToolbarButton
            title="Danh sách không thứ tự"
            disabled={isHtmlMode}
            onClick={() => onExecCommand("insertUnorderedList")}
          >
            <ListBulletIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            title="Danh sách có thứ tự"
            disabled={isHtmlMode}
            onClick={() => onExecCommand("insertOrderedList")}
          >
            <Bars3Icon className="h-4 w-4" />
          </ToolbarButton>
        </div>

        <div className="product-edit-editor__group">
          <ToolbarButton
            title="Căn trái"
            disabled={isHtmlMode}
            onClick={() => onExecCommand("justifyLeft")}
          >
            <Bars3BottomLeftIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            title="Căn giữa"
            disabled={isHtmlMode}
            onClick={() => onExecCommand("justifyCenter")}
          >
            <Bars3CenterLeftIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            title="Căn phải"
            disabled={isHtmlMode}
            onClick={() => onExecCommand("justifyRight")}
          >
            <Bars3BottomLeftIcon className="h-4 w-4 scale-x-[-1]" />
          </ToolbarButton>
        </div>

        <div className="product-edit-editor__group">
          <ToolbarButton
            title="Trích dẫn"
            disabled={isHtmlMode}
            onClick={() => onFormatBlock("blockquote")}
          >
            <ChatBubbleBottomCenterTextIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            title="Chèn đường phân cách"
            disabled={isHtmlMode}
            onClick={() => onExecCommand("insertHorizontalRule")}
          >
            <MinusIcon className="h-4 w-4" />
          </ToolbarButton>
        </div>
      </div>

      <div className="product-edit-editor__toolbar-row product-edit-editor__toolbar-row--fields">
        <select
          onChange={(event) => handleSelectValue(event, onFormatBlock)}
          className={`${TOOLBAR_SELECT_CLASS} product-edit-editor__select--kind`}
          defaultValue=""
          disabled={isHtmlMode}
        >
          <option value="" disabled>
            Kiểu
          </option>
          {BLOCK_FORMAT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          onChange={(event) =>
            handleSelectValue(event, (value) => onExecCommand("fontName", value))
          }
          className={`${TOOLBAR_SELECT_CLASS} product-edit-editor__select--font`}
          defaultValue=""
          disabled={isHtmlMode}
        >
          <option value="" disabled>
            Phông
          </option>
          {FONT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          onChange={(event) =>
            handleSelectValue(event, (value) => onExecCommand("fontSize", value))
          }
          className={`${TOOLBAR_SELECT_CLASS} product-edit-editor__select--size`}
          defaultValue=""
          disabled={isHtmlMode}
        >
          <option value="" disabled>
            Cỡ chữ
          </option>
          {FONT_SIZE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default RichTextEditorToolbar;
