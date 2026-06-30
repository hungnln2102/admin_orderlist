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
import { TOOLBAR_BUTTON_CLASS } from "./constants";
import type { EditorMode } from "./types";

type ToolbarActionsProps = {
  label: string;
  mode: EditorMode;
  isHtmlMode: boolean;
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

type ActionButton = {
  title: string;
  command?: string;
  onClick?: () => void;
  className?: string;
  icon: React.ReactNode;
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

const renderButtonGroup = (
  buttons: ActionButton[],
  isHtmlMode: boolean,
  onExecCommand: (command: string, commandValue?: string) => void,
  groupClassName = "product-edit-editor__group"
) => (
  <div className={groupClassName}>
    {buttons.map((button) => (
      <ToolbarButton
        key={button.title}
        title={button.title}
        disabled={isHtmlMode}
        onClick={button.onClick ?? (() => onExecCommand(button.command ?? ""))}
        className={button.className}
      >
        {button.icon}
      </ToolbarButton>
    ))}
  </div>
);

export const RichTextEditorToolbarActions: React.FC<ToolbarActionsProps> = ({
  label,
  mode,
  isHtmlMode,
  onSwitchMode,
  onExecCommand,
  onFormatBlock,
  onInsertLink,
}) => {
  const compactGroups: Array<{ className?: string; buttons: ActionButton[] }> = [
    {
      buttons: [
        { title: "Ho??n t??c", command: "undo", icon: <ArrowUturnLeftIcon className="h-4 w-4" /> },
        { title: "L??m l???i", command: "redo", icon: <ArrowUturnRightIcon className="h-4 w-4" /> },
      ],
    },
    {
      buttons: [
        { title: "Ch??n li??n k???t", onClick: onInsertLink, icon: <LinkIcon className="h-4 w-4" /> },
        { title: "G??? li??n k???t", command: "unlink", icon: <UnlinkIcon /> },
      ],
    },
    {
      className: "product-edit-editor__group product-edit-editor__group--danger",
      buttons: [
        {
          title: "X??a ?????nh d???ng",
          command: "removeFormat",
          className: `${TOOLBAR_BUTTON_CLASS} product-edit-editor__button--danger`,
          icon: <ClearFormatIcon />,
        },
      ],
    },
  ];

  const actionGroups: ActionButton[][] = [
    [
      { title: "In ?????m", command: "bold", icon: <BoldIcon className="h-4 w-4" /> },
      { title: "In nghi??ng", command: "italic", icon: <ItalicIcon className="h-4 w-4" /> },
      { title: "G???ch ch??n", command: "underline", icon: <UnderlineIcon className="h-4 w-4" /> },
      { title: "G???ch ngang", command: "strikeThrough", icon: <StrikethroughIcon className="h-4 w-4" /> },
    ],
    [
      { title: "Danh s??ch kh??ng th??? t???", command: "insertUnorderedList", icon: <ListBulletIcon className="h-4 w-4" /> },
      { title: "Danh s??ch c?? th??? t???", command: "insertOrderedList", icon: <Bars3Icon className="h-4 w-4" /> },
    ],
    [
      { title: "C??n tr??i", command: "justifyLeft", icon: <Bars3BottomLeftIcon className="h-4 w-4" /> },
      { title: "C??n gi???a", command: "justifyCenter", icon: <Bars3CenterLeftIcon className="h-4 w-4" /> },
      { title: "C??n ph???i", command: "justifyRight", icon: <Bars3BottomLeftIcon className="h-4 w-4 scale-x-[-1]" /> },
    ],
    [
      { title: "Tr??ch d???n", onClick: () => onFormatBlock("blockquote"), icon: <ChatBubbleBottomCenterTextIcon className="h-4 w-4" /> },
      { title: "Ch??n ???????ng ph??n c??ch", command: "insertHorizontalRule", icon: <MinusIcon className="h-4 w-4" /> },
    ],
  ];

  return (
    <>
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
            So???n th???o
          </button>
          <button
            type="button"
            className={`product-edit-editor__mode-button ${
              mode === "html" ? "product-edit-editor__mode-button--active" : ""
            }`}
            onClick={() => onSwitchMode("html")}
            aria-pressed={mode === "html"}
          >
            M?? HTML
          </button>
        </div>

        {compactGroups.map((group, index) =>
          renderButtonGroup(
            group.buttons,
            isHtmlMode,
            onExecCommand,
            group.className ?? `product-edit-editor__group product-edit-editor__group--compact-${index}`
          )
        )}
      </div>

      <div className="product-edit-editor__toolbar-row product-edit-editor__toolbar-row--actions">
        {actionGroups.map((group) => renderButtonGroup(group, isHtmlMode, onExecCommand))}
      </div>
    </>
  );
};
