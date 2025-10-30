// CreateOrderModal.tsx

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
// Đảm bảo bạn có file constants.ts và đã export các hằng số này
import { ORDER_FIELDS, API_ENDPOINTS } from "../constants";

// =======================================================
// 1. INTERFACES (Cấu trúc dữ liệu)
// =======================================================
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
  check_flag: boolean | null;
}

interface Supply {
  id: number;
  source_name: string;
}
interface Product {
  id: number;
  san_pham: string;
}

interface CalculatedPriceResult {
  gia_nhap: number;
  gia_ban: number;
  so_ngay_da_dang_ki: number;
  het_han: string;
}

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newOrderData: Partial<Order> | Order) => void;
}

// =======================================================
// 2. HELPER FUNCTIONS & CONSTANTS
// =======================================================
const formatCurrency = (value: number) => {
  return (Number(value) || 0).toLocaleString("vi-VN") + " VNĐ";
};

const generateRandomId = (length: number) => {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length)
    .toUpperCase();
};

const getTodayDMY = () => {
  const date = new Date();
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${date.getFullYear()}`;
};

const calculateDate = (startDate: string, days: number) => {
  const [d, m, y] = startDate.split("/").map(Number);
  // -1 vì ngày đăng ký là ngày đầu tiên
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${date.getFullYear()}`;
};

const INITIAL_FORM_DATA: Partial<Order> = {
  [ORDER_FIELDS.ID_DON_HANG]: "",
  [ORDER_FIELDS.SAN_PHAM]: "",
  [ORDER_FIELDS.THONG_TIN_SAN_PHAM]: "",
  [ORDER_FIELDS.KHACH_HANG]: "",
  [ORDER_FIELDS.LINK_LIEN_HE]: "",
  [ORDER_FIELDS.SLOT]: "",
  [ORDER_FIELDS.NGAY_DANG_KI]: "",
  [ORDER_FIELDS.SO_NGAY_DA_DANG_KI]: "0",
  [ORDER_FIELDS.HET_HAN]: "",
  [ORDER_FIELDS.NGUON]: "",
  [ORDER_FIELDS.GIA_NHAP]: 0,
  [ORDER_FIELDS.GIA_BAN]: 0,
  [ORDER_FIELDS.NOTE]: "",
  [ORDER_FIELDS.TINH_TRANG]: "Chưa Thanh Toán",
  [ORDER_FIELDS.CHECK_FLAG]: null,
};

const inputClass =
  "w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-all";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";
const readOnlyClass = "bg-gray-100 cursor-not-allowed";

// =======================================================
// 3. COMPONENT CHÍNH
// =======================================================
const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  // --- START: TẤT CẢ HOOKS PHẢI Ở ĐẦU COMPONENT ---

  const [formData, setFormData] = useState<Partial<Order>>(INITIAL_FORM_DATA);
  const [customerType, setCustomerType] = useState<"MAVC" | "MAVL">("MAVC");

  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [selectedSupplyId, setSelectedSupplyId] = useState<number | null>(null);

  // Memoized ID và Date
  const currentOrderId = useMemo(
    () => customerType + generateRandomId(5),
    [customerType]
  );
  const todayDate = useMemo(() => getTodayDMY(), []);

  // Hàm Fetch: Lấy danh sách nguồn (suppliers)
  const fetchSupplies = useCallback(async () => {
    try {
      const response = await fetch(
        `http://localhost:3001${API_ENDPOINTS.SUPPLIES}`
      );
      if (!response.ok) throw new Error("Lỗi tải danh sách nguồn.");
      const data: Supply[] = await response.json();
      setSupplies(data);
    } catch (error) {
      console.error("Lỗi khi fetch supplies:", error);
    }
  }, []);

  // Hàm Fetch: Lấy danh sách sản phẩm theo nguồn
  const fetchProductsBySource = useCallback(async (supplyId: number) => {
    try {
      const response = await fetch(
        `http://localhost:3001${API_ENDPOINTS.PRODUCTS_BY_SUPPLY(supplyId)}`
      );
      if (!response.ok) throw new Error("Lỗi tải danh sách sản phẩm.");
      const data: Product[] = await response.json();
      setProducts(data);
    } catch (error) {
      console.error("Lỗi khi fetch products:", error);
      setProducts([]);
    }
  }, []);

  // Hàm Fetch: Tính toán Giá/Số ngày
  const calculatePrice = useCallback(
    async (
      supplyId: number,
      productName: string,
      orderId: string,
      registerDateStr: string
    ) => {
      setIsLoading(true);
      setIsDataLoaded(false);
      try {
        const response = await fetch(
          `http://localhost:3001${API_ENDPOINTS.CALCULATE_PRICE}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              supply_id: supplyId,
              san_pham_name: productName,
              id_don_hang: orderId,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Lỗi tính toán giá từ server.");
        }

        const result: CalculatedPriceResult = await response.json();

        const newDays = result.so_ngay_da_dang_ki;
        const newHetHan = calculateDate(registerDateStr, newDays);

        setFormData((prev) => ({
          ...prev,
          [ORDER_FIELDS.GIA_NHAP]: result.gia_nhap,
          [ORDER_FIELDS.GIA_BAN]: result.gia_ban,
          [ORDER_FIELDS.SO_NGAY_DA_DANG_KI]: String(newDays),
          [ORDER_FIELDS.HET_HAN]: newHetHan,
          [ORDER_FIELDS.CHECK_FLAG]: null,
        }));
        setIsDataLoaded(true);
      } catch (error) {
        console.error("Lỗi khi tính giá:", error);
        setIsDataLoaded(false);
        alert(
          `Tính giá thất bại: ${
            error instanceof Error ? error.message : "Lỗi không xác định"
          }`
        );
      } finally {
        setIsLoading(false);
      }
    },
    [formData[ORDER_FIELDS.NGAY_DANG_KI]] // Dependency: Ngày đăng ký
  );

  // Logic Reset Form khi mở Modal
  useEffect(() => {
    if (isOpen) {
      const initialType = "MAVC";
      const initialID = initialType + generateRandomId(5);
      const initialDate = getTodayDMY();

      setCustomerType(initialType);
      setFormData({
        ...INITIAL_FORM_DATA,
        [ORDER_FIELDS.ID_DON_HANG]: initialID,
        [ORDER_FIELDS.NGAY_DANG_KI]: initialDate,
        [ORDER_FIELDS.HET_HAN]: initialDate,
      });
      setIsDataLoaded(false);
      setSelectedSupplyId(null);
      setProducts([]);
      fetchSupplies();
    }
  }, [isOpen, fetchSupplies]);

  // Logic Cập nhật ID khi CustomerType thay đổi
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      [ORDER_FIELDS.ID_DON_HANG]: currentOrderId,
    }));
  }, [currentOrderId]);

  // Logic Cập nhật Giá/Ngày khi Source/Product thay đổi
  useEffect(() => {
    const productName = formData[ORDER_FIELDS.SAN_PHAM];
    const orderId = formData[ORDER_FIELDS.ID_DON_HANG];
    const registerDate = formData[ORDER_FIELDS.NGAY_DANG_KI];

    if (selectedSupplyId && productName && orderId && registerDate) {
      calculatePrice(selectedSupplyId, productName, orderId, registerDate);
    } else {
      setIsDataLoaded(false);
    }
  }, [
    selectedSupplyId,
    formData[ORDER_FIELDS.SAN_PHAM],
    formData[ORDER_FIELDS.ID_DON_HANG],
    formData[ORDER_FIELDS.NGAY_DANG_KI],
    calculatePrice,
  ]);

  // --- END: TẤT CẢ HOOKS PHẢI Ở ĐẦU COMPONENT ---

  // --- BẮT ĐẦU PHẦN JSX/RETURN ---
  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sourceId = Number(e.target.value);
    const selectedSupply = supplies.find((s) => s.id === sourceId);

    setSelectedSupplyId(sourceId);

    setFormData((prev) => ({
      ...prev,
      [ORDER_FIELDS.NGUON]: selectedSupply ? selectedSupply.source_name : "",
      [ORDER_FIELDS.SAN_PHAM]: "",
      [ORDER_FIELDS.GIA_NHAP]: 0,
      [ORDER_FIELDS.GIA_BAN]: 0,
      [ORDER_FIELDS.SO_NGAY_DA_DANG_KI]: "0",
      [ORDER_FIELDS.HET_HAN]: formData[ORDER_FIELDS.NGAY_DANG_KI],
    }));
    setProducts([]);

    if (sourceId) {
      fetchProductsBySource(sourceId);
    }
  };

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const productName = e.target.value;
    setFormData((prev) => ({
      ...prev,
      [ORDER_FIELDS.SAN_PHAM]: productName,
    }));
  };

  const handleCustomerTypeChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newType = e.target.value as "MAVC" | "MAVL";
    setCustomerType(newType);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Kiểm tra tất cả 4 trường: Nguồn, Sản phẩm, Tên Khách Hàng, Thông tin Sản phẩm
    if (
      formData &&
      formData[ORDER_FIELDS.SAN_PHAM] &&
      formData[ORDER_FIELDS.NGUON] &&
      formData[ORDER_FIELDS.KHACH_HANG] && // <-- BẮT BUỘC CHECK KHÁCH HÀNG
      formData[ORDER_FIELDS.THONG_TIN_SAN_PHAM] && // <-- BẮT BUỘC CHECK THÔNG TIN SP
      isDataLoaded &&
      !isLoading
    ) {
      const dataToSave = {
        ...formData,
        [ORDER_FIELDS.GIA_NHAP]: Number(formData[ORDER_FIELDS.GIA_NHAP]),
        [ORDER_FIELDS.GIA_BAN]: Number(formData[ORDER_FIELDS.GIA_BAN]),

        // Chuyển chuỗi rỗng thành null nếu cần cho các trường tùy chọn khác (nếu có)
        [ORDER_FIELDS.LINK_LIEN_HE]:
          formData[ORDER_FIELDS.LINK_LIEN_HE] || null,
        [ORDER_FIELDS.SLOT]: formData[ORDER_FIELDS.SLOT] || null,
        [ORDER_FIELDS.NOTE]: formData[ORDER_FIELDS.NOTE] || null,
        // Các trường đã được điền ở trên nên không cần null check
      };

      onSave(dataToSave as Order);
    } else {
      alert(
        "Vui lòng điền đủ Tên Khách Hàng, Thông Tin Sản Phẩm và đảm bảo đã chọn Nguồn/Sản phẩm để tính giá."
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-gray-200 sticky top-0 bg-white z-10 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-900">
            Tạo Đơn Hàng Mới
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Form sử dụng HTML validation, nhưng logic submit vẫn kiểm tra data đã có */}
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Phần 1: Mã Đơn & Khách Hàng */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border p-4 rounded-lg bg-gray-50">
                <div>
                  <label className={labelClass}>Loại Khách Hàng</label>
                  <select
                    name="customer_type"
                    value={customerType}
                    onChange={handleCustomerTypeChange}
                    className={inputClass}
                  >
                    <option value="MAVC">MAVC (Cộng Tác Viên)</option>
                    <option value="MAVL">MAVL (Khách Lẻ)</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Mã Đơn Hàng (Tự Động)</label>
                  <input
                    type="text"
                    name={ORDER_FIELDS.ID_DON_HANG}
                    value={formData[ORDER_FIELDS.ID_DON_HANG]}
                    readOnly
                    className={`${inputClass} font-semibold ${readOnlyClass}`}
                  />
                </div>

                {/* Các trường thông tin Khách Hàng - BẮT BUỘC */}
                <div>
                  <label className={labelClass}>
                    Tên Khách Hàng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name={ORDER_FIELDS.KHACH_HANG}
                    value={formData[ORDER_FIELDS.KHACH_HANG]}
                    onChange={handleChange}
                    className={inputClass}
                    required // <--- BẮT BUỘC: Không được rỗng
                  />
                </div>
                <div>
                  <label className={labelClass}>Link Liên Hệ</label>
                  <input
                    type="url"
                    name={ORDER_FIELDS.LINK_LIEN_HE}
                    value={formData[ORDER_FIELDS.LINK_LIEN_HE]}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Phần 2: Sản Phẩm & Nguồn */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border p-4 rounded-lg">
                <div>
                  <label className={labelClass}>
                    Nguồn <span className="text-red-500">*</span>
                  </label>
                  <select
                    name={ORDER_FIELDS.NGUON}
                    value={
                      supplies.find(
                        (s) => s.source_name === formData[ORDER_FIELDS.NGUON]
                      )?.id || ""
                    }
                    onChange={handleSourceChange}
                    className={inputClass}
                    required
                  >
                    <option value="">-- Chọn Nguồn --</option>
                    {supplies.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.source_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>
                    Sản Phẩm <span className="text-red-500">*</span>
                  </label>
                  <select
                    name={ORDER_FIELDS.SAN_PHAM}
                    value={formData[ORDER_FIELDS.SAN_PHAM]}
                    onChange={handleProductChange}
                    className={inputClass}
                    required
                    disabled={!selectedSupplyId}
                  >
                    <option value="">-- Chọn Sản Phẩm --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.san_pham}>
                        {p.san_pham}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>
                    Thông Tin Sản Phẩm <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name={ORDER_FIELDS.THONG_TIN_SAN_PHAM}
                    value={formData[ORDER_FIELDS.THONG_TIN_SAN_PHAM]}
                    onChange={handleChange}
                    className={inputClass}
                    required // <--- BẮT BUỘC: Không được rỗng
                  />
                </div>
              </div>

              {/* Phần 3: Thời Gian & Giá Tiền */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div>
                    <label className={labelClass}>Ngày Đăng Ký</label>
                    <input
                      type="text"
                      name={ORDER_FIELDS.NGAY_DANG_KI}
                      value={formData[ORDER_FIELDS.NGAY_DANG_KI]}
                      readOnly
                      className={`${inputClass} ${readOnlyClass}`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Số Ngày Đã Đăng Ký</label>
                    <input
                      type="text"
                      name={ORDER_FIELDS.SO_NGAY_DA_DANG_KI}
                      value={formData[ORDER_FIELDS.SO_NGAY_DA_DANG_KI]}
                      readOnly
                      className={`${inputClass} ${readOnlyClass}`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Ngày Hết Hạn</label>
                    <input
                      type="text"
                      name={ORDER_FIELDS.HET_HAN}
                      value={formData[ORDER_FIELDS.HET_HAN]}
                      readOnly
                      className={`${inputClass} font-medium text-red-600 ${readOnlyClass}`}
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
                </div>

                <div className="space-y-6">
                  <div>
                    <label className={labelClass}>Giá Nhập (Base Price)</label>
                    <input
                      type="text"
                      name={ORDER_FIELDS.GIA_NHAP}
                      value={formatCurrency(
                        formData[ORDER_FIELDS.GIA_NHAP] || 0
                      )}
                      readOnly
                      className={`${inputClass} font-semibold ${readOnlyClass}`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Giá Bán (Theo Loại KH)</label>
                    <input
                      type="text"
                      name={ORDER_FIELDS.GIA_BAN}
                      value={formatCurrency(
                        formData[ORDER_FIELDS.GIA_BAN] || 0
                      )}
                      readOnly
                      className={`${inputClass} font-semibold text-green-700 ${readOnlyClass}`}
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
            className={`px-6 py-2 text-base font-medium text-white rounded-lg transition-colors shadow-md ${
              isDataLoaded && !isLoading
                ? "bg-green-600 hover:bg-green-700"
                : "bg-gray-400 cursor-not-allowed"
            }`}
            disabled={!isDataLoaded || isLoading}
          >
            {isLoading ? "Đang tính giá..." : "Tạo Đơn Hàng"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateOrderModal;
