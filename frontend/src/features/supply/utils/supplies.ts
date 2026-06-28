import { parseSignedIntegerMoneyInput } from "@/shared/money";
import { buildSepayQrUrl } from "@/shared/vietqr";

export const normalizeText = (text: string) => text.trim().toLowerCase();

export const parseMoney = parseSignedIntegerMoneyInput;
