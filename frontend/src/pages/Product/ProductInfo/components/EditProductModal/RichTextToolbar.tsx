import React from "react";
import { EditorContext } from "./types";

type RichTextToolbarProps = {
  context: EditorContext;
  onCommand: (command: string, value?: string) => void;
  onOpenLink: () => void;
  onOpenColor: (type: "foreColor" | "hiliteColor", context: EditorContext) => void;
  headingPrompt: string;
  headingDefault: string;
};

export const RichTextToolbar: React.FC<RichTextToolbarProps> = ({
  context,
  onCommand,
  onOpenLink,
  onOpenColor,
  headingPrompt,
  headingDefault,
}) => (
  <div className="rich-toolbar-wrapper">
    <div className="rich-toolbar mb-2">
      <button type="button" onClick={() => onCommand("bold")}>
        B
      </button>
      <button type="button" onClick={() => onCommand("italic")}>
        I
      </button>
      <button type="button" onClick={() => onCommand("underline")}>
        U
      </button>
      <button type="button" onClick={onOpenLink}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.71" />
        </svg>
      </button>
      <button
        type="button"
        data-color-button="true"
        onClick={() => onOpenColor("foreColor", context)}
      >
        A
      </button>
      <button
        type="button"
        data-color-button="true"
        onClick={() => onOpenColor("hiliteColor", context)}
      >
        Bg
      </button>
      <button
        type="button"
        className="rich-toolbar-heading"
        onClick={() => {
          const level = window.prompt(headingPrompt, headingDefault);
          const num = Number(level);
          if (Number.isInteger(num) && num >= 1 && num <= 6) {
            onCommand("formatBlock", `h${num}`);
          }
        }}
      >
        H
      </button>
      <select
        className="rich-toolbar-select"
        value=""
        onChange={(event) => {
          const value = event.target.value;
          event.target.value = "";
          if (value) onCommand("fontName", value);
        }}
      >
        <option value="">Font</option>
        <option value="Arial">Arial</option>
        <option value="Georgia">Georgia</option>
        <option value="Times New Roman">Times New Roman</option>
        <option value="Verdana">Verdana</option>
        <option value="Tahoma">Tahoma</option>
        <option value="Roboto">Roboto</option>
        <option value="Inter">Inter</option>
        <option value="Poppins">Poppins</option>
        <option value="Montserrat">Montserrat</option>
        <option value="Open Sans">Open Sans</option>
        <option value="Nunito">Nunito</option>
        <option value="Raleway">Raleway</option>
        <option value="Merriweather">Merriweather</option>
        <option value="Playfair Display">Playfair Display</option>
        <option value="Courier New">Courier New</option>
        <option value="Fira Code">Fira Code</option>
        <option value="Source Sans Pro">Source Sans Pro</option>
      </select>
      <select
        className="rich-toolbar-select"
        value=""
        onChange={(event) => {
          const value = event.target.value;
          event.target.value = "";
          if (value) onCommand("fontSize", value);
        }}
      >
        <option value="">Size</option>
        <option value="2">12px</option>
        <option value="3">16px</option>
        <option value="4">18px</option>
        <option value="5">24px</option>
        <option value="6">32px</option>
        <option value="7">48px</option>
      </select>
    </div>
  </div>
);
