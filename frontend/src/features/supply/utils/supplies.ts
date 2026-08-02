import { parseSignedIntegerMoneyInput } from "@/shared/money";

export const normalizeText = (text: string) => text.trim().toLowerCase();

export const parseMoney = parseSignedIntegerMoneyInput;
