// CreateOrderModal.tsx - MÃ ĐÃ SỬA LỖI CLICK COMBOBOX

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { XMarkIcon, PlusIcon } from "@heroicons/react/24/outline";
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

interface SupplyPrice {
  source_id: number;
  price: number;
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

const calculateDate = (startDate: string, days: number): string => {
  if (!startDate || days <= 0) return startDate;
  const [d, m, y] = startDate.split("/").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days - 1);
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${date.getFullYear()}`;
};

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
// 3. CUSTOM HOOK: useCreateOrderLogic
// =======================================================

interface UseCreateOrderLogicResult {
  formData: Partial<Order>;
  supplies: Supply[];
  products: Product[];
  isLoading: boolean;
  isDataLoaded: boolean;
  selectedSupplyId: number | null;
  customerType: "MAVC" | "MAVL";
  handleChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => void;
  handleSourceChange: (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>
  ) => void;
  handleProductChange: (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>
  ) => void;
  handleCustomerTypeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handleAddNewProductSourceRule: () => void;
  productSearchTerm: string;
  supplySearchTerm: string;
  handleSearchChange: (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "product" | "supply"
  ) => void;
  filteredProducts: Product[];
  filteredSupplies: Supply[];
  isProductDropdownOpen: boolean;
  setIsProductDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isSupplyDropdownOpen: boolean;
  setIsSupplyDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  productDropdownRef: React.RefObject<HTMLDivElement>;
  supplyDropdownRef: React.RefObject<HTMLDivElement>;
  handleSubmit: (e: React.FormEvent) => boolean;
}

const useCreateOrderLogic = (
  isOpen: boolean,
  onSave: (newOrderData: Partial<Order> | Order) => void
): UseCreateOrderLogicResult => {
  // --- KHAI BÁO HOOK (Phải luôn ở cấp cao nhất) ---
  const [formData, setFormData] = useState<Partial<Order>>(INITIAL_FORM_DATA);
  const [customerType, setCustomerType] = useState<"MAVC" | "MAVL">("MAVC");

  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [supplyPrices, setSupplyPrices] = useState<SupplyPrice[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null
  );
  const [selectedSupplyId, setSelectedSupplyId] = useState<number | null>(null);

  // STATE MỚI CHO SEARCH/DROPDOWN UI
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [supplySearchTerm, setSupplySearchTerm] = useState("");
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [isSupplyDropdownOpen, setIsSupplyDropdownOpen] = useState(false);

  const productDropdownRef = useRef<HTMLDivElement>(null);
  const supplyDropdownRef = useRef<HTMLDivElement>(null);

  // Memoized ID và Date
  const currentOrderId = useMemo(
    () => customerType + generateRandomId(5),
    [customerType]
  );
  const todayDate = useMemo(() => getTodayDMY(), []);
  // --- KẾT THÚC KHAI BÁO HOOK ---

  // --- LOGIC TÌM KIẾM VÀ LỌC (Giữ nguyên) ---
  const handleSearchChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "product" | "supply"
  ) => {
    const value = e.target.value;
    if (field === "product") {
      setProductSearchTerm(value);
      setFormData((prev) => ({
        ...prev,
        [ORDER_FIELDS.SAN_PHAM]: value,
      }));
    } else {
      setSupplySearchTerm(value);
      setFormData((prev) => ({
        ...prev,
        [ORDER_FIELDS.NGUON]: value,
      }));
    }
  };

  const filteredProducts = useMemo(() => {
    if (!productSearchTerm) return products;
    const lowerTerm = productSearchTerm.toLowerCase();
    return products.filter((p) => p.san_pham.toLowerCase().includes(lowerTerm));
  }, [products, productSearchTerm]);

  const filteredSupplies = useMemo(() => {
    if (!supplySearchTerm) return supplies;
    const lowerTerm = supplySearchTerm.toLowerCase();
    return supplies.filter((s) =>
      s.source_name.toLowerCase().includes(lowerTerm)
    );
  }, [supplies, supplySearchTerm]);
  // --- KẾT THÚC LOGIC TÌM KIẾM VÀ LỌC ---

  // Hàm Fetch: Lấy danh sách TẤT CẢ sản phẩm (tải đầu tiên)
  const fetchProducts = useCallback(async () => {
    try {
      const response = await fetch(
        `http://localhost:3001${API_ENDPOINTS.PRODUCTS_ALL}`
      );
      if (!response.ok) throw new Error("Lỗi tải danh sách sản phẩm.");
      const data: Product[] = await response.json();
      setProducts(data);
    } catch (error) {
      console.error("Lỗi khi fetch products:", error);
    }
  }, []);

  // Hàm Fetch: Lấy danh sách NGUỒN theo Tên SẢN PHẨM (cho dropdown)
  const fetchSuppliesByProduct = useCallback(async (productName: string) => {
    try {
      const response = await fetch(
        `http://localhost:3001${API_ENDPOINTS.SUPPLIES_BY_PRODUCT(productName)}`
      );
      if (!response.ok) throw new Error("Lỗi tải danh sách nguồn.");
      const data: Supply[] = await response.json();
      setSupplies(data);
    } catch (error) {
      console.error("Lỗi khi fetch supplies:", error);
      setSupplies([]);
    }
  }, []);

  // HÀM FETCH MỚI: Lấy TẤT CẢ giá nhập theo Tên SẢN PHẨM (cho logic hiển thị)
  const fetchAllSupplyPrices = useCallback(async (productName: string) => {
    try {
      const response = await fetch(
        `http://localhost:3001/api/products/all-prices-by-name/${encodeURIComponent(
          productName
        )}`
      );
      if (!response.ok) throw new Error("Lỗi tải giá nhập các nguồn.");
      const data: SupplyPrice[] = await response.json();
      setSupplyPrices(data);
    } catch (error) {
      console.error("Lỗi khi fetch all supply prices:", error);
      setSupplyPrices([]);
    }
  }, []);

  // Hàm Fetch: Tính toán Giá/Số ngày
  const calculatePrice = useCallback(
    async (
      supplyId: number,
      productName: string,
      orderId: string,
      registerDateStr: string
    ): Promise<CalculatedPriceResult | undefined> => {
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

        return {
          gia_nhap: result.gia_nhap,
          gia_ban: result.gia_ban,
          so_ngay_da_dang_ki: newDays,
          het_han: newHetHan,
        } as CalculatedPriceResult;
      } catch (error) {
        console.error("Lỗi khi tính giá:", error);
        setIsDataLoaded(false);
        alert(
          `Tính giá thất bại: ${
            error instanceof Error ? error.message : "Lỗi không xác định"
          }`
        );
        return undefined; // Trả về undefined khi có lỗi
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // LOGIC 1, 2, 3 (Giữ nguyên)
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
      setSelectedProductId(null);
      setSelectedSupplyId(null);
      setSupplies([]);
      setSupplyPrices([]);
      fetchProducts();
      setProductSearchTerm("");
      setSupplySearchTerm("");
    }
  }, [isOpen, fetchProducts]);

  useEffect(() => {
    if (isOpen) {
      setFormData((prev) => ({
        ...prev,
        [ORDER_FIELDS.ID_DON_HANG]: currentOrderId,
      }));
    }
  }, [currentOrderId, isOpen]);

  useEffect(() => {
    const productName = formData[ORDER_FIELDS.SAN_PHAM];
    const orderId = formData[ORDER_FIELDS.ID_DON_HANG];
    const registerDate = formData[ORDER_FIELDS.NGAY_DANG_KI];

    if (!productName || !orderId || !registerDate) {
      setIsDataLoaded(false);
    }
  }, [
    formData[ORDER_FIELDS.SAN_PHAM],
    formData[ORDER_FIELDS.ID_DON_HANG],
    formData[ORDER_FIELDS.NGAY_DANG_KI],
  ]);

  // --- HÀM XỬ LÝ SỰ KIỆN ĐÃ ĐIỀU CHỈNH ---

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

  // HÀM SỬA CHỮA: Xác nhận chọn Sản Phẩm khi onBlur hoặc onClick
  const handleProductChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>
  ) => {
    const selectedProductName = e.target.value;
    const confirmedProduct = products.find(
      (p) => p.san_pham === selectedProductName
    );

    // 1. Logic Xác nhận chọn
    if (!confirmedProduct) {
      // Logic reset nếu giá trị KHÔNG khớp với sản phẩm nào
      if (
        !selectedProductName ||
        (e.type === "blur" &&
          selectedProductName !== formData[ORDER_FIELDS.SAN_PHAM])
      ) {
        setFormData((prev) => ({
          ...prev,
          [ORDER_FIELDS.SAN_PHAM]: "",
          [ORDER_FIELDS.NGUON]: "",
          [ORDER_FIELDS.GIA_NHAP]: 0,
          [ORDER_FIELDS.GIA_BAN]: 0,
        }));
        setProductSearchTerm("");
        setSupplySearchTerm("");
        setSupplies([]);
        setSupplyPrices([]);
      }
      return;
    }

    // 2. Logic Kích hoạt tính giá (Nếu xác nhận thành công)
    setSelectedProductId(confirmedProduct.id);
    setSelectedSupplyId(null);
    setProductSearchTerm(confirmedProduct.san_pham); // Đảm bảo input hiển thị tên đầy đủ

    setFormData((prev) => ({
      ...prev,
      [ORDER_FIELDS.SAN_PHAM]: confirmedProduct.san_pham,
      [ORDER_FIELDS.NGUON]: "",
      [ORDER_FIELDS.GIA_NHAP]: 0,
      [ORDER_FIELDS.GIA_BAN]: 0,
      [ORDER_FIELDS.SO_NGAY_DA_DANG_KI]: "0",
      [ORDER_FIELDS.HET_HAN]: prev[ORDER_FIELDS.NGAY_DANG_KI] || todayDate,
    }));
    setSupplies([]);
    setSupplyPrices([]);
    setSupplySearchTerm(""); // Reset search nguồn

    fetchSuppliesByProduct(confirmedProduct.san_pham);
    fetchAllSupplyPrices(confirmedProduct.san_pham);

    const orderId = formData[ORDER_FIELDS.ID_DON_HANG];
    const registerDate = formData[ORDER_FIELDS.NGAY_DANG_KI];

    if (orderId && registerDate) {
      calculatePrice(0, confirmedProduct.san_pham, orderId, registerDate).then(
        (result) => {
          if (result) {
            setFormData((prev) => ({
              ...prev,
              [ORDER_FIELDS.GIA_BAN]: result.gia_ban,
              [ORDER_FIELDS.SO_NGAY_DA_DANG_KI]: String(
                result.so_ngay_da_dang_ki
              ),
              [ORDER_FIELDS.HET_HAN]: result.het_han,
            }));
            setIsDataLoaded(true);
          }
        }
      );
    } else {
      setIsDataLoaded(false);
    }
  };

  // HÀM SỬA CHỮA: Xác nhận chọn Nguồn khi onBlur hoặc onClick
  const handleSourceChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>
  ) => {
    const selectedSourceName = e.target.value;
    const confirmedSupply = supplies.find(
      (s) => s.source_name === selectedSourceName
    );

    // 1. Logic Xác nhận chọn
    if (!confirmedSupply) {
      // Reset nếu không khớp
      if (selectedSourceName) {
        setFormData((prev) => ({ ...prev, [ORDER_FIELDS.NGUON]: "" }));
        setSelectedSupplyId(null);
        setSupplySearchTerm("");
      } else {
        // Cho phép reset về giá trị rỗng ("-- Chọn Nguồn --")
        setFormData((prev) => ({
          ...prev,
          [ORDER_FIELDS.NGUON]: "",
          [ORDER_FIELDS.GIA_NHAP]: 0,
        }));
        setSelectedSupplyId(null);
        setSupplySearchTerm("");
      }
      return;
    }

    // 2. Logic cập nhật giá (Nếu xác nhận thành công)
    const sourceId = confirmedSupply.id;
    let newBasePrice = 0;

    if (sourceId !== 0) {
      newBasePrice =
        supplyPrices.find((p) => p.source_id === sourceId)?.price || 0;
    }

    setSelectedSupplyId(sourceId);
    setSupplySearchTerm(confirmedSupply.source_name); // Đảm bảo input hiển thị tên đầy đủ

    setFormData((prev) => ({
      ...prev,
      [ORDER_FIELDS.NGUON]: confirmedSupply.source_name,
      [ORDER_FIELDS.GIA_NHAP]: newBasePrice,
    }));
  };

  // HÀM MỚI: Xử lý nút Thêm Nguồn/Sản phẩm
  const handleAddNewProductSourceRule = () => {
    alert("Chức năng Thêm Nguồn/Sản phẩm mới sẽ được phát triển tại đây.");
    // Thêm logic mở modal hoặc điều hướng tại đây
  };

  const handleCustomerTypeChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newType = e.target.value as "MAVC" | "MAVL";
    setCustomerType(newType);
  };

  const handleSubmit = (e: React.FormEvent): boolean => {
    e.preventDefault();

    const requiredFieldsFilled =
      formData &&
      formData[ORDER_FIELDS.SAN_PHAM] &&
      formData[ORDER_FIELDS.NGUON] &&
      formData[ORDER_FIELDS.KHACH_HANG] &&
      formData[ORDER_FIELDS.THONG_TIN_SAN_PHAM];

    if (requiredFieldsFilled && isDataLoaded && !isLoading) {
      const dataToSave = {
        ...formData,
        [ORDER_FIELDS.GIA_NHAP]: Number(formData[ORDER_FIELDS.GIA_NHAP]),
        [ORDER_FIELDS.GIA_BAN]: Number(formData[ORDER_FIELDS.GIA_BAN]),

        [ORDER_FIELDS.LINK_LIEN_HE]:
          formData[ORDER_FIELDS.LINK_LIEN_HE] || null,
        [ORDER_FIELDS.SLOT]: formData[ORDER_FIELDS.SLOT] || null,
        [ORDER_FIELDS.NOTE]: formData[ORDER_FIELDS.NOTE] || null,
      };

      onSave(dataToSave as Order);
      return true;
    } else {
      alert(
        "Vui lòng điền đủ Tên Khách Hàng, Thông Tin Sản Phẩm và đảm bảo đã chọn Nguồn/Sản phẩm để tính giá."
      );
      return false;
    }
  };

  return {
    formData,
    supplies,
    products,
    isLoading,
    isDataLoaded,
    selectedSupplyId,
    customerType,
    handleChange,
    handleSourceChange,
    handleProductChange,
    handleCustomerTypeChange,
    handleAddNewProductSourceRule,
    handleSubmit,
    productSearchTerm,
    supplySearchTerm,
    handleSearchChange,
    filteredProducts,
    filteredSupplies,
    isProductDropdownOpen,
    setIsProductDropdownOpen,
    isSupplyDropdownOpen,
    setIsSupplyDropdownOpen,
    productDropdownRef,
    supplyDropdownRef,
  };
};

// =======================================================
// 4. COMPONENT CHÍNH
// =======================================================
const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const {
    formData,
    supplies,
    products,
    isLoading,
    isDataLoaded,
    selectedSupplyId,
    customerType,
    handleChange,
    handleSourceChange,
    handleProductChange,
    handleCustomerTypeChange,
    handleAddNewProductSourceRule,
    handleSubmit,
    productSearchTerm,
    supplySearchTerm,
    handleSearchChange,
    filteredProducts,
    filteredSupplies,
    isProductDropdownOpen,
    setIsProductDropdownOpen,
    isSupplyDropdownOpen,
    setIsSupplyDropdownOpen,
    productDropdownRef,
    supplyDropdownRef,
  } = useCreateOrderLogic(isOpen, onSave); // <<< HOOK ĐƯỢC GỌI Ở ĐÂY

  if (!isOpen) return null; // <<< IF NÀY PHẢI NẰM SAU CÁC LỜI GỌI HOOK

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header Modal */}
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
          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Phần 1: Mã Đơn & Khách Hàng */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border p-4 rounded-lg bg-gray-50">
                {/* Loại Khách Hàng */}
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
                {/* Mã Đơn Hàng */}
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

                {/* Tên Khách Hàng */}
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
                    required
                  />
                </div>
                {/* Link Liên Hệ */}
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

              {/* Phần 2: Sản Phẩm & Nguồn & Thông Tin Sản Phẩm */}
              <div className="grid grid-cols-1 gap-6 border p-4 rounded-lg">
                {/* Hàng 1: SẢN PHẨM và NGUỒN (Chia 2 cột) */}
                <div className="grid grid-cols-2 gap-6">
                  {/* 1. SẢN PHẨM */}
                  <div className="relative" ref={productDropdownRef}>
                    <label className={labelClass}>
                      Sản Phẩm <span className="text-red-500">*</span>
                    </label>
                    {/* INPUT VÀ CUSTOM DROPDOWN CHO SẢN PHẨM */}
                    <input
                      type="text"
                      name={ORDER_FIELDS.SAN_PHAM}
                      value={
                        productSearchTerm ||
                        formData[ORDER_FIELDS.SAN_PHAM] ||
                        ""
                      }
                      onChange={(e) => handleSearchChange(e, "product")}
                      onFocus={() => setIsProductDropdownOpen(true)}
                      onBlur={() =>
                        setTimeout(() => setIsProductDropdownOpen(false), 150)
                      }
                      className={inputClass}
                      placeholder="Chọn hoặc gõ tên Sản phẩm"
                      required
                    />

                    {/* CUSTOM DROPDOWN MỚI CHO SẢN PHẨM */}
                    {isProductDropdownOpen && filteredProducts.length > 0 && (
                      <ul className="absolute z-20 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto mt-1">
                        {filteredProducts.map((p) => (
                          <li
                            key={p.id}
                            className="p-2 cursor-pointer hover:bg-blue-100 text-sm"
                            onMouseDown={(e) => {
                              // Dùng onMouseDown để xử lý trước onBlur
                              e.preventDefault(); // Ngăn onBlur kích hoạt ngay lập tức
                              setProductSearchTerm(p.san_pham);
                              handleProductChange({
                                target: { value: p.san_pham },
                              } as any);
                              setIsProductDropdownOpen(false);
                            }}
                          >
                            {p.san_pham}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* 2. NGUỒN + BUTTON */}
                  <div className="relative" ref={supplyDropdownRef}>
                    <label className={labelClass}>
                      Nguồn <span className="text-red-500">*</span>
                    </label>
                    {/* INPUT FIELD VÀ BUTTON TRÊN CÙNG 1 HÀNG DÙNG FLEX */}
                    <div className="flex items-center space-x-2">
                      {/* INPUT VÀ CUSTOM DROPDOWN CHO NGUỒN */}
                      <input
                        type="text"
                        name={ORDER_FIELDS.NGUON}
                        value={
                          supplySearchTerm || formData[ORDER_FIELDS.NGUON] || ""
                        }
                        onChange={(e) => handleSearchChange(e, "supply")}
                        onFocus={() => setIsSupplyDropdownOpen(true)}
                        onBlur={() =>
                          setTimeout(() => setIsSupplyDropdownOpen(false), 150)
                        }
                        className={`${inputClass} flex-grow`}
                        placeholder="Chọn hoặc gõ tên Nguồn"
                        required
                        disabled={!formData[ORDER_FIELDS.SAN_PHAM]}
                      />

                      {/* CUSTOM DROPDOWN MỚI CHO NGUỒN */}
                      {isSupplyDropdownOpen && filteredSupplies.length > 0 && (
                        <ul className="absolute z-20 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto mt-1 top-full">
                          {filteredSupplies.map((s) => (
                            <li
                              key={s.id}
                              className="p-2 cursor-pointer hover:bg-blue-100 text-sm"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setSupplySearchTerm(s.source_name);
                                handleSourceChange({
                                  target: { value: s.source_name },
                                } as any);
                                setIsSupplyDropdownOpen(false);
                              }}
                            >
                              {s.source_name}
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* BUTTON MỚI: Thêm rule */}
                      <button
                        type="button"
                        onClick={handleAddNewProductSourceRule}
                        disabled={!formData[ORDER_FIELDS.SAN_PHAM]}
                        className={`p-2 rounded-lg transition-colors ${
                          formData[ORDER_FIELDS.SAN_PHAM]
                            ? "bg-green-500 hover:bg-green-600 text-white"
                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        <PlusIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Hàng 2: THÔNG TIN SẢN PHẨM (Full width) */}
                <div className="col-span-full">
                  <label className={labelClass}>
                    Thông Tin Sản Phẩm <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name={ORDER_FIELDS.THONG_TIN_SAN_PHAM}
                    value={formData[ORDER_FIELDS.THONG_TIN_SAN_PHAM]}
                    onChange={handleChange}
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              {/* Phần 3: Thời Gian & Giá Tiền */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  {/* Ngày Đăng Ký */}
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
                  {/* Số Ngày Đã Đăng Ký */}
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
                  {/* Ngày Hết Hạn */}
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
                  {/* Slot */}
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
                  {/* Giá Nhập (Sẽ hiển thị giá của Nguồn được chọn) */}
                  <div>
                    <label className={labelClass}>
                      Giá Nhập (Base Price) - Nguồn Chọn
                    </label>
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
                  {/* Giá Bán (Sẽ hiển thị giá tính toán từ giá nhập cao nhất) */}
                  <div>
                    <label className={labelClass}>Giá Bán (Giá cố định)</label>
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

                  {/* Ghi Chú */}
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
