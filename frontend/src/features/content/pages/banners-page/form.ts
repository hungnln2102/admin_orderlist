import type { Banner } from "../../types";

export const fieldClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none backdrop-blur-md focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30";
export const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400";

export type HeroForm = {
  title: string;
  description: string;
  tag_text: string;
  image_url: string;
  image_alt: string;
  button_label: string;
  button_href: string;
};

export const emptyForm = (): HeroForm => ({
  title: "",
  description: "",
  tag_text: "",
  image_url: "",
  image_alt: "",
  button_label: "",
  button_href: "",
});

export const bannerToForm = (banner: Banner): HeroForm => ({
  title: banner.title ?? "",
  description: banner.description ?? "",
  tag_text: banner.tag_text ?? "",
  image_url: banner.image_url ?? "",
  image_alt: banner.image_alt ?? "",
  button_label: banner.button_label ?? "",
  button_href: banner.button_href ?? "",
});
