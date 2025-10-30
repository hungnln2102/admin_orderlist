import React, { useState, useEffect } from "react";
// Import các hằng số cần thiết
import { ORDER_FIELDS, API_ENDPOINTS } from "../constants";

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
  check_flag: boolean;
}

// Interface cho dữ liệu Dropdown từ Backend
interface Supply {
  id: number;
  source_name: string;
}

interface Product {
  id: number;
  san_pham: string;
}

// Interface cho dữ liệu trả về từ API tính toán giá (Đã định nghĩa ở bước trước)
interface CalculatedPriceResult {
  gia_nhap: number;
  gia_ban: number;
  so_ngay_da_dang_ki: number;
  het_han: string; // Thực tế frontend sẽ tự tính, nhưng vẫn giữ trường này
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

// Hàm Helper để tính Ngày Hết Hạn
const calculateExpirationDate = (
  registerDateStr: string,
  days: number
): string => {
  if (!registerDateStr || days <= 0) return "N/A";

  // Chuyển chuỗi dd/mm/yyyy sang Date
  const parts = registerDateStr.split("/");
  if (parts.length !== 3) return "N/A";

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  // Tạo đối tượng Date (tháng trong JS là 0-indexed)
  const date = new Date(year, month - 1, day);

  // Cộng thêm số ngày (days)
  // -1 vì ngày đăng ký là ngày đầu tiên
  date.setDate(date.getDate() + days - 1);

  // Định dạng lại thành dd/mm/yyyy
  const newDay = String(date.getDate()).padStart(2, "0");
  const newMonth = String(date.getMonth() + 1).padStart(2, "0");
  const newYear = date.getFullYear();

  return `${newDay}/${newMonth}/${newYear}`;
};

// Hàm định dạng tiền tệ
const formatCurrency = (value: number) => {
  return (Number(value) || 0).toLocaleString("vi-VN") + " đ";
};

const EditOrderModal: React.FC<EditOrderModalProps> = ({
  isOpen,
  onClose,
  order,
  onSave,
}) => {
  const [formData, setFormData] = useState<Order | null>(order);
  const [supplies, setSupplies] = useState<Supply[]>([]); // Danh sách nguồn
  const [products, setProducts] = useState<Product[]>([]); // Danh sách sản phẩm
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null); // ID của nguồn đang chọn

  // 1. Tải danh sách nguồn (Supplies) và thiết lập state ban đầu
  useEffect(() => {
    const fetchSupplies = async () => {
      try {
        const response = await fetch(
          `http://localhost:3001${API_ENDPOINTS.SUPPLIES}`
        );
        if (!response.ok) throw new Error("Lỗi tải danh sách nguồn.");
        const data: Supply[] = await response.json();
        setSupplies(data);
      } catch (error) {
        console.error("Lỗi tải nguồn:", error);
      }
    };
    if (isOpen && supplies.length === 0) {
      fetchSupplies();
    }
  }, [isOpen, supplies.length]);

  // 2. Cập nhật formData và ID Nguồn khi order/supplies thay đổi
  useEffect(() => {
    if (order && supplies.length > 0) {
      // Đảm bảo các giá trị số là Number
      const newFormData = {
        ...order,
        [ORDER_FIELDS.GIA_NHAP]: Number(order.gia_nhap) || 0,
        [ORDER_FIELDS.GIA_BAN]: Number(order.gia_ban) || 0,
        [ORDER_FIELDS.SO_NGAY_DA_DANG_KI]:
          Number(order.so_ngay_da_dang_ki) || 0,
      } as Order;
      setFormData(newFormData);

      // Cập nhật ID nguồn ban đầu để tải sản phẩm
      const initialSupply = supplies.find((s) => s.source_name === order.nguon);
      if (initialSupply) {
        setSelectedSourceId(initialSupply.id);
        fetchProductsBySupply(initialSupply.id);
      } else {
        // Nếu không tìm thấy ID nguồn, đặt về null và reset sản phẩm
        setSelectedSourceId(null);
        setProducts([]);
      }
    }
  }, [order, supplies]);

  // 3. Hàm tải sản phẩm theo ID nguồn
  const fetchProductsBySupply = async (supplyId: number) => {
    try {
      const response = await fetch(
        `http://localhost:3001${API_ENDPOINTS.PRODUCTS_BY_SUPPLY(supplyId)}`
      );
      if (!response.ok) throw new Error("Lỗi tải danh sách sản phẩm.");
      const data: Product[] = await response.json();
      setProducts(data);
    } catch (error) {
      console.error("Lỗi tải sản phẩm theo nguồn:", error);
      setProducts([]);
    }
  };

  // 4. HÀM GỌI API TÍNH TOÁN GIÁ MỚI
  const calculatePrice = async (
    supplyId: number,
    productName: string,
    orderIdDonHang: string,
    registerDateStr: string
  ) => {
    if (!supplyId || !productName || !orderIdDonHang) return;

    try {
      const response = await fetch(
        `http://localhost:3001${API_ENDPOINTS.CALCULATE_PRICE}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supply_id: supplyId,
            san_pham_name: productName,
            id_don_hang: orderIdDonHang,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Lỗi tính toán giá từ server.");
      }

      const result: CalculatedPriceResult = await response.json();

      // --- LOGIC CẬP NHẬT FORM SAU KHI TÍNH TOÁN ---
      setFormData((prev) => {
        if (!prev) return null;

        const newDays = result.so_ngay_da_dang_ki;
        const newExpirationDate = calculateExpirationDate(
          registerDateStr,
          newDays
        );

        return {
          ...prev,
          [ORDER_FIELDS.GIA_NHAP]: Number(result.gia_nhap),
          [ORDER_FIELDS.GIA_BAN]: Number(result.gia_ban),
          [ORDER_FIELDS.SO_NGAY_DA_DANG_KI]: String(newDays), // Lưu dưới dạng chuỗi như trong DB
          [ORDER_FIELDS.HET_HAN]: newExpirationDate,
        };
      });
    } catch (error) {
      console.error("Lỗi khi tính toán giá:", error);
      alert(
        `Lỗi khi tính toán giá: ${
          error instanceof Error ? error.message : "Lỗi không xác định"
        }`
      );
    }
  };

  // 5. Xử lý thay đổi Nguồn
  const handleSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sourceId = Number(e.target.value);
    const selectedSupply = supplies.find((s) => s.id === sourceId);

    setSelectedSourceId(sourceId);

    // Cập nhật tên nguồn trong form data và RESET các trường liên quan
    setFormData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        [ORDER_FIELDS.NGUON]: selectedSupply ? selectedSupply.source_name : "",
        [ORDER_FIELDS.SAN_PHAM]: "", // Reset sản phẩm
        [ORDER_FIELDS.GIA_NHAP]: 0,
        [ORDER_FIELDS.GIA_BAN]: 0,
        [ORDER_FIELDS.SO_NGAY_DA_DANG_KI]: "", // Đặt lại là chuỗi rỗng
        [ORDER_FIELDS.HET_HAN]: "", // Đặt lại là chuỗi rỗng
      };
    });

    // Tải danh sách sản phẩm mới
    if (sourceId) {
      fetchProductsBySupply(sourceId);
    } else {
      setProducts([]);
    }
  };

  // 6. Xử lý thay đổi Sản phẩm (TRIGGER TÍNH GIÁ)
  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const productName = e.target.value;

    setFormData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        [ORDER_FIELDS.SAN_PHAM]: productName,
      };
    });

    // GỌI API TÍNH TOÁN GIÁ VỚI DỮ LIỆU MỚI
    if (selectedSourceId && formData?.id_don_hang && formData?.ngay_dang_ki) {
      const registerDateStr = formData[ORDER_FIELDS.NGAY_DANG_KI];

      if (productName) {
        calculatePrice(
          selectedSourceId,
          productName,
          formData.id_don_hang,
          registerDateStr
        );
      } else {
        // Reset giá nếu chọn lại "Chọn Sản phẩm"
        setFormData((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            [ORDER_FIELDS.GIA_NHAP]: 0,
            [ORDER_FIELDS.GIA_BAN]: 0,
            [ORDER_FIELDS.SO_NGAY_DA_DANG_KI]: "",
            [ORDER_FIELDS.HET_HAN]: "",
          };
        });
      }
    }
  };

  if (!isOpen || !formData) return null;

  // Lấy ID nguồn hiện tại để đặt giá trị mặc định cho Dropdown Nguồn
  const currentSupply = supplies.find(
    (s) => s.source_name === formData[ORDER_FIELDS.NGUON]
  );
  const currentSupplyId = currentSupply ? currentSupply.id : "";

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

      // Không cần chuyển số nếu là trường read-only. Chỉ cần cập nhật value
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

                  {/* TRƯỜNG NGUỒN: DROPDOWN */}
                  <div>
                    <label className={labelClass}>Nguồn</label>
                    <select
                      name={ORDER_FIELDS.NGUON}
                      value={currentSupplyId || ""} // Sử dụng ID làm value của select
                      onChange={handleSourceChange}
                      className={inputClass}
                    >
                      <option value="">Chọn Nguồn</option>
                      {supplies.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.source_name}
                        </option>
                      ))}
                    </select>
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
                  {/* TRƯỜNG SẢN PHẨM: DROPDOWN (TRIGGER TÍNH GIÁ) */}
                  <div>
                    <label className={labelClass}>Sản Phẩm</label>
                    <select
                      name={ORDER_FIELDS.SAN_PHAM}
                      value={formData[ORDER_FIELDS.SAN_PHAM] || ""}
                      onChange={handleProductChange}
                      disabled={!selectedSourceId} // Disable nếu chưa chọn nguồn
                      className={`${inputClass} ${
                        !selectedSourceId ? readOnlyClass : ""
                      }`}
                    >
                      <option value="">Chọn Sản phẩm</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.san_pham}>
                          {p.san_pham}
                        </option>
                      ))}
                    </select>
                    {selectedSourceId && products.length === 0 && (
                      <p className="text-xs text-red-500 mt-1">
                        Không tìm thấy sản phẩm cho nguồn này.
                      </p>
                    )}
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

                  {/* CÁC TRƯỜNG NGÀY THÁNG (CỐ ĐỊNH / TỰ ĐỘNG CẬP NHẬT) */}
                  <div>
                    <label className={labelClass}>Ngày Đăng Ký</label>
                    <input
                      type="text"
                      name={ORDER_FIELDS.NGAY_DANG_KI}
                      value={formData[ORDER_FIELDS.NGAY_DANG_KI]}
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
                      type="text"
                      name={ORDER_FIELDS.SO_NGAY_DA_DANG_KI}
                      value={formData[ORDER_FIELDS.SO_NGAY_DA_DANG_KI]}
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
                  {/* CÁC TRƯỜNG GIÁ (CỐ ĐỊNH / TỰ ĐỘNG CẬP NHẬT) */}
                  <div>
                    <label className={labelClass}>Giá Nhập (đ)</label>
                    <input
                      type="text" // Chuyển sang text để hiển thị định dạng tiền tệ
                      name={ORDER_FIELDS.GIA_NHAP}
                      value={formatCurrency(formData[ORDER_FIELDS.GIA_NHAP])}
                      readOnly={isReadOnly(ORDER_FIELDS.GIA_NHAP)}
                      className={`${inputClass} font-semibold text-blue-700 ${
                        isReadOnly(ORDER_FIELDS.GIA_NHAP) ? readOnlyClass : ""
                      }`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Giá Bán (đ)</label>
                    <input
                      type="text" // Chuyển sang text để hiển thị định dạng tiền tệ
                      name={ORDER_FIELDS.GIA_BAN}
                      value={formatCurrency(formData[ORDER_FIELDS.GIA_BAN])}
                      readOnly={isReadOnly(ORDER_FIELDS.GIA_BAN)}
                      className={`${inputClass} font-semibold text-green-700 ${
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
