export const hasMeaningfulText = (value: string | null | undefined): boolean =>
  Boolean((value || "").replace(/\u00a0/g, " ").trim());

export const unwrapElement = (element: HTMLElement) => {
  const parent = element.parentNode;
  if (!parent) return;
  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }
  parent.removeChild(element);
};

export const replaceElementTag = (
  element: HTMLElement,
  nextTagName: string
): HTMLElement => {
  const doc = element.ownerDocument;
  const replacement = doc.createElement(nextTagName);
  Array.from(element.attributes).forEach((attr) => {
    replacement.setAttribute(attr.name, attr.value);
  });
  while (element.firstChild) {
    replacement.appendChild(element.firstChild);
  }
  element.replaceWith(replacement);
  return replacement;
};

