export const toHtmlFromPlain = (value: string): string =>
  (value || "").replace(/\n/g, "<br/>");
