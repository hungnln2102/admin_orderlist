import { mergeAttributes, Node } from "@tiptap/core";
import Highlight from "@tiptap/extension-highlight";
import { Table, TableKit } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import StarterKit from "@tiptap/starter-kit";
import { isEditorialLink, isSecureImage } from "./editorialContent";

export interface EditorialImage {
  src: string;
  alt: string;
  title: string;
  caption: string;
  textAlign?: string | null;
}

function readImage(image: HTMLImageElement, caption = "") {
  const src = image.getAttribute("src") ?? "";
  return isSecureImage(src)
    ? { src, alt: image.getAttribute("alt") ?? "", title: image.getAttribute("title") ?? "", caption }
    : false;
}

const EditorialFigure = Node.create({
  name: "editorialFigure",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: "", rendered: false },
      alt: { default: "", rendered: false },
      title: { default: "", rendered: false },
      caption: { default: "", rendered: false },
    };
  },
  parseHTML() {
    return [
      {
        tag: "figure",
        getAttrs: (element) => {
          const image = element.querySelector("img");
          return image ? readImage(image, element.querySelector("figcaption")?.textContent ?? "") : false;
        },
      },
      {
        tag: "img[src]",
        getAttrs: (element) => readImage(element as HTMLImageElement),
      },
    ];
  },
  renderHTML({ node, HTMLAttributes }) {
    const { src, alt, title, caption } = node.attrs as EditorialImage;
    const imageAttributes = title ? { src, alt, title } : { src, alt };
    return caption
      ? ["figure", HTMLAttributes, ["img", imageAttributes], ["figcaption", caption]]
      : ["figure", HTMLAttributes, ["img", imageAttributes]];
  },
});

const EditorialHighlight = Highlight.extend({
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => element.getAttribute("style")?.match(/^background-color:\s*(#[0-9a-f]{6})/i)?.[1] ?? null,
        renderHTML: ({ color }) => color ? { style: `background-color: ${color}` } : {},
      },
    };
  },
}).configure({ multicolor: true });

const EditorialTable = Table.extend({
  renderHTML({ HTMLAttributes }) {
    return ["table", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), ["tbody", 0]];
  },
}).configure({ resizable: false, cellMinWidth: 96 });

export const editorialExtensions = [
  StarterKit.extend({
    addGlobalAttributes() {
      return [{
        types: ["link"],
        attributes: {
          title: {
            default: null,
            parseHTML: (element) => element.getAttribute("title"),
          },
        },
      }];
    },
  }).configure({
    code: false,
    codeBlock: false,
    heading: { levels: [2, 3, 4] },
    link: {
      openOnClick: false,
      HTMLAttributes: { target: null, rel: null },
      isAllowedUri: (url) => isEditorialLink(url),
    },
  }),
  EditorialFigure,
  TextAlign.configure({ types: ["heading", "paragraph", "editorialFigure"], alignments: ["left", "center", "right"] }),
  TextStyle,
  Color,
  EditorialHighlight,
  TableKit.configure({ table: false }),
  EditorialTable,
];
