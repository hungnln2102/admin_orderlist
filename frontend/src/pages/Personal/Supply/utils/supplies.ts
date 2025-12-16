import * as Helpers from "../../../../lib/helpers";

export const normalizeText = (text: string) => text.trim().toLowerCase();

export const parseMoney = (val: string) => Number(val.replace(/[^\d]/g, "")) || 0;

export const buildSepayQrUrl = Helpers.buildSepayQrUrl;
