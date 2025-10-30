import React, { useState, useEffect } from "react";
// XMarkIcon đã được xóa khỏi import vì không còn được sử dụng
import { ORDER_FIELDS, CALCULATED_FIELDS } from "../constants"; // <--- THÊM IMPORT CONSTANTS

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
  check_flag: boolean; // Thêm trường check_flag nếu cần chỉnh sửa
  // Các trường ảo đã bị loại bỏ khỏi Interface này, nhưng để an toàn, ta dùng Partial<Order> khi gửi lên API
}

interface EditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onSave: (updatedOrder: Order) => void;
}

const READ_ONLY_FIELDS = [
  ORDER_FIELDS.ID_DON_HANG,
  ORDER_FIELDS.TINH_TRANG,
  ORDER_FIELDS.NGAY_DANG_KI,
  ORDER_FIELDS.SO_NGAY_DA_DANG_KI,
  ORDER_FIELDS.HET_HAN,
  ORDER_FIELDS.GIA_NHAP,
  ORDER_FIELDS.GIA_BAN,
];

const EditOrderModal: React.FC<EditOrderModalProps> = ({
  isOpen,
  onClose,
  order,
  onSave,
}) => {
  const [formData, setFormData] = useState<Order | null>(order);

  useEffect(() => {
    if (order) {
      setFormData({
        ...order,
        [ORDER_FIELDS.GIA_NHAP]: Number(order.gia_nhap) || 0,
        [ORDER_FIELDS.GIA_BAN]: Number(order.gia_ban) || 0,
        [ORDER_FIELDS.SO_NGAY_DA_DANG_KI]:
          Number(order.so_ngay_da_dang_ki) || 0,
      } as Order);
    }
  }, [order]);

  if (!isOpen || !formData) return null;

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;

    // Ngăn không cho sửa các trường readOnly
    if (READ_ONLY_FIELDS.includes(name)) return;

    setFormData((prev) => {
      if (!prev) return null;

      if (
        [
          ORDER_FIELDS.GIA_NHAP,
          ORDER_FIELDS.GIA_BAN,
          ORDER_FIELDS.SO_NGAY_DA_DANG_KI,
        ].includes(name)
      ) {
        return {
          ...prev,
          [name]: value === "" ? 0 : Number(value),
        };
      }
      return {
        ...prev,
        [name]: value,
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      onSave(formData);
    }
  };

  const inputClass =
    "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm";
  const readOnlyClass = `bg-gray-200 cursor-not-allowed`; // Style cho trường cố định
  const labelClass = "block text-sm font-medium text-gray-700";

  // Hàm kiểm tra trường readOnly
  const isReadOnly = (fieldName: string) =>
    READ_ONLY_FIELDS.includes(fieldName);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header Modal */}
        <div className="p-5 border-b border-gray-200 flex justify-center items-center bg-gray-50 sticky top-0 z-10">
          <h3 className="text-2xl font-bold text-gray-800">
            Chỉnh sửa Đơn hàng:{" "}
            <span className="text-blue-600">
              {formData[ORDER_FIELDS.ID_DON_HANG]}
            </span>
          </h3>
        </div>

        {/* Form Body - Cuộn nếu quá dài */}
        <div className="p-6 flex-grow overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Cột 1: Chi tiết Khách hàng & Đơn */}
              <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 shadow-sm">
                <h4 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
                  Chi tiết Khách hàng & Đơn
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>ID Đơn Hàng</label>
                    <input
                      type="text"
                      name={ORDER_FIELDS.ID_DON_HANG}
                      value={formData[ORDER_FIELDS.ID_DON_HANG]}
                      readOnly={isReadOnly(ORDER_FIELDS.ID_DON_HANG)}
                      className={`${inputClass} ${
                        isReadOnly(ORDER_FIELDS.ID_DON_HANG)
                          ? readOnlyClass
                          : ""
                      }`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Khách Hàng</label>
                    <input
                      type="text"
                      name={ORDER_FIELDS.KHACH_HANG}
                      value={formData[ORDER_FIELDS.KHACH_HANG]}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Link Liên Hệ</label>
                    <input
                      type="text"
                      name={ORDER_FIELDS.LINK_LIEN_HE}
                      value={formData[ORDER_FIELDS.LINK_LIEN_HE]}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Nguồn</label>
                    <input
                      type="text"
                      name={ORDER_FIELDS.NGUON}
                      value={formData[ORDER_FIELDS.NGUON]}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Trạng Thái</label>
                    <select
                      name={ORDER_FIELDS.TINH_TRANG}
                      value={formData[ORDER_FIELDS.TINH_TRANG]}
                      onChange={handleChange}
                      readOnly={isReadOnly(ORDER_FIELDS.TINH_TRANG)}
                      disabled={isReadOnly(ORDER_FIELDS.TINH_TRANG)}
                      className={`${inputClass} ${
                        isReadOnly(ORDER_FIELDS.TINH_TRANG) ? readOnlyClass : ""
                      }`}
                    >
                      <option value="Đã Thanh Toán">Đã Thanh Toán</option>
                      <option value="Chưa Thanh Toán">Chưa Thanh Toán</option>
                      <option value="Hết Hạn" disabled>
                        Hết Hạn (Hệ thống)
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Cột 2: Thông tin Sản phẩm & Ngày */}
              <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 shadow-sm">
                <h4 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
                  Thông tin Sản phẩm & Ngày
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Sản Phẩm</label>
                    <input
                      type="text"
                      name={ORDER_FIELDS.SAN_PHAM}
                      value={formData[ORDER_FIELDS.SAN_PHAM]}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Thông Tin Sản Phẩm</label>
                    <textarea
                      name={ORDER_FIELDS.THONG_TIN_SAN_PHAM}
                      value={formData[ORDER_FIELDS.THONG_TIN_SAN_PHAM]}
                      onChange={handleChange}
                      rows={3}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Slot</label>
                    <input
                      type="text"
                      name={ORDER_FIELDS.SLOT}
                      value={formData[ORDER_FIELDS.SLOT]}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Ngày Đăng Ký</label>
                    <input
                      type="text"
                      name={ORDER_FIELDS.NGAY_DANG_KI}
                      value={formData[ORDER_FIELDS.NGAY_DANG_KI]}
                      onChange={handleChange}
                      readOnly={isReadOnly(ORDER_FIELDS.NGAY_DANG_KI)}
                      className={`${inputClass} ${
                        isReadOnly(ORDER_FIELDS.NGAY_DANG_KI)
                          ? readOnlyClass
                          : ""
                      }`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Số Ngày Đăng Ký</label>
                    <input
                      type="number"
                      name={ORDER_FIELDS.SO_NGAY_DA_DANG_KI}
                      value={formData[ORDER_FIELDS.SO_NGAY_DA_DANG_KI]}
                      onChange={handleChange}
                      readOnly={isReadOnly(ORDER_FIELDS.SO_NGAY_DA_DANG_KI)}
                      className={`${inputClass} ${
                        isReadOnly(ORDER_FIELDS.SO_NGAY_DA_DANG_KI)
                          ? readOnlyClass
                          : ""
                      }`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Hết Hạn</label>
                    <input
                      type="text"
                      name={ORDER_FIELDS.HET_HAN}
                      value={formData[ORDER_FIELDS.HET_HAN]}
                      onChange={handleChange}
                      readOnly={isReadOnly(ORDER_FIELDS.HET_HAN)}
                      className={`${inputClass} ${
                        isReadOnly(ORDER_FIELDS.HET_HAN) ? readOnlyClass : ""
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Cột 3: Thông tin Tài chính & Ghi chú */}
              <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 shadow-sm">
                <h4 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
                  Thông tin Tài chính & Ghi chú
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Giá Nhập (đ)</label>
                    <input
                      type="number"
                      name={ORDER_FIELDS.GIA_NHAP}
                      value={formData[ORDER_FIELDS.GIA_NHAP]}
                      onChange={handleChange}
                      readOnly={isReadOnly(ORDER_FIELDS.GIA_NHAP)}
                      className={`${inputClass} ${
                        isReadOnly(ORDER_FIELDS.GIA_NHAP) ? readOnlyClass : ""
                      }`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Giá Bán (đ)</label>
                    <input
                      type="number"
                      name={ORDER_FIELDS.GIA_BAN}
                      value={formData[ORDER_FIELDS.GIA_BAN]}
                      onChange={handleChange}
                      readOnly={isReadOnly(ORDER_FIELDS.GIA_BAN)}
                      className={`${inputClass} ${
                        isReadOnly(ORDER_FIELDS.GIA_BAN) ? readOnlyClass : ""
                      }`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Ghi Chú</label>
                    <textarea
                      name={ORDER_FIELDS.NOTE}
                      value={formData[ORDER_FIELDS.NOTE]}
                      onChange={handleChange}
                      rows={8}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer Modal - Nút hành động */}
        <div className="p-5 border-t border-gray-200 bg-gray-50 flex justify-end sticky bottom-0 z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors shadow-sm mr-3"
          >
            Hủy
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="px-6 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
          >
            Lưu Thay Đổi
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditOrderModal;
