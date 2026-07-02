import { translations, type LangCode, type LangId } from "./lang.generated";

let activeLang: LangCode = "lang_vn";

export const setActiveLang = (lang: LangCode) => {
  activeLang = lang;
};

export const getActiveLang = (): LangCode => activeLang;

export const t = (
  id: LangId,
  params: Record<string, string | number> = {},
  lang: LangCode = activeLang
): string => {
  const row = translations[id];
  const template = row?.[lang] || row?.lang_vn || id;
  return Object.entries(params).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template
  );
};

export type { LangCode, LangId };
