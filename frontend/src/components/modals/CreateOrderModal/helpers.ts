import { ORDER_FIELDS, ORDER_STATUSES } from "../../../constants";
import { Order } from "./types";

/**
 * Convert DD/MM/YYYY to YYYY-MM-DD for backend compatibility.
 */
export const convertDMYToYMD = (dmyString: string): string => {
  if (!dmyString || dmyString.indexOf("/") === -1) return dmyString;
  const parts = dmyString.split("/");
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return dmyString;
};

// Calculate expiry date by adding (days - 1) to registration date (DD/MM/YYYY).
export const calculateExpirationDate = (
  registerDateStr: string,
  days: number
): string => {
  if (!registerDateStr || days <= 0) return "N/A";

  const parts = registerDateStr.split("/");
  if (parts.length !== 3) return "N/A";

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days - 1);

  const newDay = String(date.getDate()).padStart(2, "0");
  const newMonth = String(date.getMonth() + 1).padStart(2, "0");
  const newYear = date.getFullYear();

  return `${newDay}/${newMonth}/${newYear}`;
};

export const INITIAL_FORM_DATA: Partial<Order> = {
  [ORDER_FIELDS.ID_ORDER]: "",
  [ORDER_FIELDS.ID_PRODUCT]: "",
  [ORDER_FIELDS.INFORMATION_ORDER]: "",
  [ORDER_FIELDS.CUSTOMER]: "",
  [ORDER_FIELDS.CONTACT]: "",
  [ORDER_FIELDS.SLOT]: "",
  [ORDER_FIELDS.ORDER_DATE]: "",
  [ORDER_FIELDS.DAYS]: "0",
  [ORDER_FIELDS.ORDER_EXPIRED]: "",
  [ORDER_FIELDS.SUPPLY]: "",
  [ORDER_FIELDS.COST]: 0,
  [ORDER_FIELDS.PRICE]: 0,
  [ORDER_FIELDS.NOTE]: "",
  [ORDER_FIELDS.STATUS]: ORDER_STATUSES.CHUA_THANH_TOAN,
};

export const inputClass =
  "w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-all";
export const labelClass = "block text-sm font-medium text-gray-700 mb-1";
export const readOnlyClass = "bg-gray-100 cursor-not-allowed";
