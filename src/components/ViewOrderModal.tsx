import React from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

// Interface Order (Giữ nguyên)
interface Order {
  id: number;
  id_don_hang: string;
  san_pham: string;
  thong_tin_san_pham: string;
  khach_hang: string;
  link_lien_he: string;
  slot: string;
  ngay_dang_ki: string;
  so_ngay_da_dang_ki: string;
  het_han: string;
  nguon: string;
  gia_nhap: number;
  gia_ban: number;
  note: string;
  tinh_trang: string;
  soNgayConLai?: number;
  giaTriConLai?: number;
  trangThaiText?: string;
}

interface ViewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  formatCurrency: (value: number | string) => string;
}

const BANK_SHORT_CODE = "VPB";
const ACCOUNT_NO = "9183400998";
const ACCOUNT_NAME = "NGO LE NGOC HUNG";

const ViewOrderModal: React.FC<ViewOrderModalProps> = ({
  isOpen,
  onClose,
  order,
  formatCurrency,
}) => {
  if (!isOpen || !order) return null;

  const displayStatus = order.trangThaiText || order.tinh_trang;
  const displayRemainingValue =
    order.giaTriConLai !== undefined ? order.giaTriConLai : 0;
  const displayRemainingDays =
    order.soNgayConLai !== undefined ? order.soNgayConLai : 0;

  // --- Logic Giá Trị Hiển Thị ---
  const displayPriceClass =
    displayStatus.toLowerCase().includes("chưa thanh toán") ||
    displayStatus.toLowerCase() === "hết hạn"
      ? "text-red-600"
      : "text-green-600";

  // --- Tạo Link VietQR (Đã sửa lỗi URL) ---
  const qrAmount = order.gia_ban;
  const qrMessage = order.id_don_hang;

  const safeQrAmount = Math.round(Math.max(0, Number(qrAmount)));

  // SỬA CẤU TRÚC: Chỉ sử dụng BANK_SHORT_CODE
  const qrCodeImageUrl =
    `https://img.vietqr.io/image/${BANK_SHORT_CODE}-${ACCOUNT_NO}-compact2.png` + // <-- Đã dùng BANK_SHORT_CODE
    `?amount=${safeQrAmount}` +
    `&addInfo=${encodeURIComponent(qrMessage)}` +
    `&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 transition-opacity duration-300 px-4 py-6">
      {/* Khung Modal */}
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl transform transition-all duration-300 scale-100 max-h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-center items-center p-4 border-b bg-gray-50 rounded-t-lg sticky top-0 z-10">
          <h3 className="text-xl font-semibold text-gray-800">
            Chi tiết đơn hàng:{" "}
            <span className="text-blue-600">{order.id_don_hang}</span>
          </h3>
        </div>

        {/* Body (Cho phép cuộn) */}
        <div className="p-6 overflow-y-auto flex-grow space-y-5 text-gray-700">
          {/* Phần Thông tin chung - Layout 2 cột cân đối */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {/* Cột Trái */}
            <dl className="space-y-2">
              <div className="flex justify-between border-b pb-1">
                <dt className="font-medium text-gray-500 w-1/3">ID Đơn:</dt>
                <dd className="text-gray-900 font-semibold w-2/3 text-right">
                  {order.id_don_hang}
                </dd>
              </div>
              <div className="flex justify-between border-b pb-1">
                <dt className="font-medium text-gray-500 w-1/3">Sản phẩm:</dt>
                <dd className="text-gray-900 w-2/3 text-right">
                  {order.san_pham}
                </dd>
              </div>
              <div className="flex justify-between border-b pb-1">
                <dt className="font-medium text-gray-500 w-1/3">
                  Thông tin SP:
                </dt>
                <dd className="text-gray-900 w-2/3 text-right break-words">
                  {order.thong_tin_san_pham}
                </dd>
              </div>
              <div className="flex justify-between border-b pb-1">
                <dt className="font-medium text-gray-500 w-1/3">Slot:</dt>
                <dd className="text-gray-900 w-2/3 text-right">{order.slot}</dd>
              </div>
              <div className="flex justify-between border-b pb-1">
                <dt className="font-medium text-gray-500 w-1/3">Ghi chú:</dt>
                <dd className="text-gray-900 w-2/3 text-right">
                  {order.note || "-"}
                </dd>
              </div>
              {/* Dòng trạng thái mới */}
              <div className="flex justify-between pt-1 pb-1">
                <dt className="font-medium text-gray-500 w-1/3">Trạng thái:</dt>
                <dd className="w-2/3 text-right">
                  <span
                    className={`inline-flex items-center px-3 py-1 text-sm font-bold rounded-full ${getStatusColor(
                      displayStatus
                    )}`}
                  >
                    {displayStatus}
                  </span>
                </dd>
              </div>
            </dl>
            {/* Cột Phải */}
            <dl className="space-y-2">
              <div className="flex justify-between border-b pb-1">
                <dt className="font-medium text-gray-500 w-1/3">Khách hàng:</dt>
                <dd className="text-gray-900 w-2/3 text-right">
                  {order.khach_hang}
                </dd>
              </div>
              <div className="flex justify-between border-b pb-1 items-start">
                <dt className="font-medium text-gray-500 w-1/3 shrink-0">
                  Liên hệ:
                </dt>
                <dd className="w-2/3 text-right break-all">
                  <a
                    href={order.link_lien_he}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {order.link_lien_he || "-"}
                  </a>
                </dd>
              </div>
              <div className="flex justify-between border-b pb-1">
                <dt className="font-medium text-gray-500 w-1/3">Ngày đặt:</dt>
                <dd className="text-gray-900 w-2/3 text-right">
                  {order.ngay_dang_ki}
                </dd>
              </div>
              <div className="flex justify-between border-b pb-1">
                <dt className="font-medium text-gray-500 w-1/3">Số ngày ĐK:</dt>
                <dd className="text-gray-900 w-2/3 text-right">
                  {order.so_ngay_da_dang_ki}
                </dd>
              </div>
              <div className="flex justify-between border-b pb-1">
                <dt className="font-medium text-gray-500 w-1/3">
                  Ngày hết hạn:
                </dt>
                <dd className="text-gray-900 w-2/3 text-right">
                  {order.het_han}
                </dd>
              </div>
              <div className="flex justify-between border-b pb-1">
                <dt className="font-medium text-gray-500 w-1/3">
                  Số ngày còn lại:
                </dt>
                <dd className="text-indigo-600 font-bold w-2/3 text-right">
                  {displayRemainingDays}
                </dd>
              </div>
            </dl>
          </div>

          {/* Đường kẻ phân cách */}
          <hr className="my-4 border-gray-300" />

          {/* Phần QR Code */}
          <div className="text-center bg-gradient-to-b from-gray-50 to-white p-4 rounded-md border border-gray-200 shadow-inner">
            <h4 className="text-lg font-semibold text-gray-800 mb-3">
              Quét mã QR để thanh toán (VietQR)
            </h4>
            {qrCodeImageUrl ? (
              <div className="flex justify-center mb-3">
                <img
                  src={qrCodeImageUrl}
                  alt={`QR Code thanh toán ${order.id_don_hang}`}
                  className="border-2 border-gray-300 rounded-lg p-1 bg-white shadow-md"
                  width={280}
                  height={280}
                />
              </div>
            ) : (
              <p className="text-red-600 font-medium">
                Không thể tạo mã QR. Vui lòng kiểm tra lại thông tin cấu hình.
              </p>
            )}
            <div className="text-sm text-gray-700 space-y-1">
              <p>
                Ngân hàng: <strong>VP Bank</strong>
              </p>
              <p>
                Số tài khoản: <strong>{ACCOUNT_NO}</strong>
              </p>
              <p>
                Chủ tài khoản: <strong>{ACCOUNT_NAME}</strong>
              </p>
              <p>
                Số tiền:{" "}
                <strong className="text-xl text-red-600">
                  {formatCurrency(safeQrAmount)}
                </strong>
              </p>
              {/* HIỂN THỊ NỘI DUNG CHUYỂN KHOẢN CẦN NHẬP THỦ CÔNG */}
              <p>
                Nội dung: <strong className="text-blue-600">{qrMessage}</strong>{" "}
                (Vui lòng điền đúng)
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t bg-gray-100 rounded-b-lg sticky bottom-0 z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

// Hàm getStatusColor (Giữ nguyên)
const getStatusColor = (status: string) => {
  const lowerStatus = (status || "").toLowerCase();
  switch (lowerStatus) {
    case "đã thanh toán":
      return "bg-green-100 text-green-800";
    case "chưa thanh toán":
      return "bg-yellow-100 text-yellow-800";
    case "hết hạn":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export default ViewOrderModal;
