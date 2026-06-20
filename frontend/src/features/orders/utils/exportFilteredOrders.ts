import * as XLSX from "xlsx";
import { ORDER_FIELDS, VIRTUAL_FIELDS, type Order, type OrderDatasetKey } from "@/constants";

const toNumber = (value: unknown): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const asText = (value: unknown): string => String(value ?? "").trim();

const datasetLabelMap: Record<OrderDatasetKey, string> = {
  active: "don-hang",
  import: "nhap-hang",
  expired: "het-han",
  canceled: "hoan-tien",
};

const formatDatePart = (date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}${m}${d}-${hh}${mm}`;
};

const buildExportRows = (orders: Order[], dataset: OrderDatasetKey) =>
  orders.map((order, index) => {
    const base = {
      STT: index + 1,
      "Mã đơn": asText(order[ORDER_FIELDS.ID_ORDER]),
      "Sản phẩm": asText(
        order.product_display_name || order[ORDER_FIELDS.ID_PRODUCT]
      ),
      "Thông tin đơn": asText(order[ORDER_FIELDS.INFORMATION_ORDER]),
      "Khách hàng": asText(order[ORDER_FIELDS.CUSTOMER]),
      "Liên hệ": asText(order[ORDER_FIELDS.CONTACT]),
      Slot: asText(order[ORDER_FIELDS.SLOT]),
      "Ngày đăng ký": asText(
        order[VIRTUAL_FIELDS.ORDER_DATE_DISPLAY] || order[ORDER_FIELDS.ORDER_DATE]
      ),
      "Ngày hết hạn": asText(
        order[VIRTUAL_FIELDS.EXPIRY_DATE_DISPLAY] || order[ORDER_FIELDS.EXPIRY_DATE]
      ),
      "Số ngày": toNumber(order[ORDER_FIELDS.DAYS]),
      "Còn lại": toNumber(order[VIRTUAL_FIELDS.SO_NGAY_CON_LAI]),
      "Trạng thái": asText(
        order[VIRTUAL_FIELDS.TRANG_THAI_TEXT] || order[ORDER_FIELDS.STATUS]
      ),
      Nguồn: asText(order[ORDER_FIELDS.SUPPLY] || order.supply),
      "Giá nhập": toNumber(order[ORDER_FIELDS.COST]),
      "Giá bán": toNumber(order[ORDER_FIELDS.PRICE]),
      "Giá trị còn lại": toNumber(order[VIRTUAL_FIELDS.GIA_TRI_CON_LAI]),
      "Hoàn từ NCC": toNumber(order[VIRTUAL_FIELDS.HOAN_TU_NCC]),
    };

    if (dataset !== "canceled") {
      delete (base as Partial<typeof base>)["Hoàn từ NCC"];
    }

    return base;
  });

export const exportFilteredOrdersToExcel = (
  orders: Order[],
  dataset: OrderDatasetKey
): void => {
  const rows = buildExportRows(orders, dataset);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 26 },
    { wch: 34 },
    { wch: 22 },
    { wch: 28 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 18 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 16 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
  XLSX.writeFile(
    workbook,
    `orders-${datasetLabelMap[dataset]}-${formatDatePart()}.xlsx`
  );
};
