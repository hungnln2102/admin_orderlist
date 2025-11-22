import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { ORDER_FIELDS, API_ENDPOINTS } from "../constants";
import * as Helpers from "../lib/helpers";

const API_BASE =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env?.VITE_API_BASE_URL) ||
  (process.env.VITE_API_BASE_URL as string) ||
  "http://localhost:3001";

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

interface Supply {
  id: number;
  source_name: string;
}

interface CalculatedPriceResult {
  gia_nhap: number;
  gia_ban: number;
  so_ngay_da_dang_ki: number;
  het_han: string;
  thong_tin_san_pham?: string;
}

interface EditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onSave: (updatedOrder: Order) => void;
}

const READ_ONLY_FIELDS = [
  ORDER_FIELDS.ID_DON_HANG,
  ORDER_FIELDS.NGAY_DANG_KI,
  ORDER_FIELDS.SO_NGAY_DA_DANG_KI,
  ORDER_FIELDS.HET_HAN,
  ORDER_FIELDS.GIA_NHAP,
  ORDER_FIELDS.GIA_BAN,
];

const formatCurrency = (value: number) => {
  return (Number(value) || 0).toLocaleString("vi-VN") + " đ";
};
const guessCustomerType = (orderCode?: string | null) => {
  if (!orderCode) return undefined;
  const normalized = orderCode.trim().toUpperCase();
  if (normalized.startsWith("MAVC")) return "MAVC";
  if (normalized.startsWith("MAVL")) return "MAVL";
  if (normalized.startsWith("MAVK")) return "MAVK";
  return undefined;
};

const useEditOrderLogic = (order: Order | null, isOpen: boolean) => {
  const [formData, setFormData] = useState<Order | null>(order);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const baseOrderRef = useRef<Order | null>(order);
  const fetchSuppliesForProduct = useCallback(async (productName: string) => {
    if (!productName) {
      setSupplies([]);
      return [];
    }
    try {
      const response = await fetch(
        `${API_BASE}${API_ENDPOINTS.SUPPLIES_BY_PRODUCT(productName)}`
      );
      if (!response.ok)
        throw new Error("L?i t?i danh s?ch ngu?n theo s?n ph?m.");
      const data: Supply[] = await response.json();
      setSupplies(data);
      return data;
    } catch (error) {
      console.error("L?i t?i ngu?n theo s?n ph?m:", error);
      setSupplies([]);
      return [];
    }
  }, []);

  const calculatePrice = useCallback(
    async (
      supplyId: number,
      productName: string,
      orderIdDonHang: string,
      registerDate?: string
    ) => {
      if (!productName || !orderIdDonHang) return;

      const normalizedRegisterDate = registerDate
        ? Helpers.formatDateToDMY(registerDate)
        : undefined;

      try {
        const customerType = guessCustomerType(orderIdDonHang);
        const response = await fetch(
          `${API_BASE}${API_ENDPOINTS.CALCULATE_PRICE}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              supply_id: supplyId,
              san_pham_name: productName,
              id_don_hang: orderIdDonHang,
              register_date: normalizedRegisterDate,
              customer_type: customerType,
            }),
          }
        );

        const { data, rawText } =
          await Helpers.readJsonOrText<CalculatedPriceResult>(response);

        if (!response.ok) {
          const message =
            (data as { error?: string } | null)?.error ||
            rawText ||
            "Loi tinh toan gia tu server.";
          throw new Error(message);
        }

        if (!data) {
          throw new Error("Phan hoi khong hop le tu server.");
        }

        const result: CalculatedPriceResult = data;

        setFormData((prev) => {
          if (!prev) return null;

          const calculatedDays = Number(result.so_ngay_da_dang_ki);
          const fallbackDays =
            Number(prev[ORDER_FIELDS.SO_NGAY_DA_DANG_KI]) || 0;
          const registerDMY = Helpers.formatDateToDMY(
            prev[ORDER_FIELDS.NGAY_DANG_KI]
          );
          const productInfo =
            result.thong_tin_san_pham ??
            prev[ORDER_FIELDS.THONG_TIN_SAN_PHAM] ??
            "";
          const inferredMonths = Helpers.parseMonthsFromInfo(productInfo);

          let effectiveDays = Number.isFinite(calculatedDays)
            ? calculatedDays
            : fallbackDays;

          if ((!effectiveDays || effectiveDays <= 0) && inferredMonths > 0) {
            effectiveDays = Helpers.daysFromMonths(inferredMonths);
          }

          let nextExpiry = result.het_han?.trim();
          if (nextExpiry) {
            const normalized = Helpers.convertDMYToYMD(nextExpiry);
            nextExpiry = normalized || nextExpiry;
          }
          if (!nextExpiry && registerDMY) {
            if (inferredMonths > 0) {
              const expiryDMY = Helpers.addMonthsMinusOneDay(
                registerDMY,
                inferredMonths
              );
              if (expiryDMY) {
                nextExpiry = Helpers.convertDMYToYMD(expiryDMY);
              }
            }
          }

          if (!nextExpiry && registerDMY && effectiveDays > 0) {
            const expiryDMY = Helpers.calculateExpirationDate(
              registerDMY,
              effectiveDays
            );
            if (expiryDMY && expiryDMY !== "N/A") {
              nextExpiry = Helpers.convertDMYToYMD(expiryDMY);
            }
          }

          return {
            ...prev,
            [ORDER_FIELDS.GIA_NHAP]: Number(result.gia_nhap),
            [ORDER_FIELDS.GIA_BAN]: Number(result.gia_ban),
            [ORDER_FIELDS.SO_NGAY_DA_DANG_KI]: String(effectiveDays || 0),
            [ORDER_FIELDS.HET_HAN]: nextExpiry || prev[ORDER_FIELDS.HET_HAN],
          };
        });
      } catch (error) {
        console.error("Loi khi tinh toan gia:", error);
        alert(
          `Loi khi tinh toan gia: ${
            error instanceof Error ? error.message : "Loi khong xac dinh"
          }`
        );
      }
    },
    []
  );

  useEffect(() => {
    if (!isOpen || !order) return;

    let isMounted = true;

    const loadInitialData = async () => {
      baseOrderRef.current = order;
      const fetchedSupplies = await fetchSuppliesForProduct(order.san_pham);

      if (!isMounted) return;

      const normalizedFormData = {
        ...order,
        [ORDER_FIELDS.GIA_NHAP]: Number(order.gia_nhap) || 0,
        [ORDER_FIELDS.GIA_BAN]: Number(order.gia_ban) || 0,
        [ORDER_FIELDS.SO_NGAY_DA_DANG_KI]:
          String(order.so_ngay_da_dang_ki) || "",
      } as Order;

      setFormData(normalizedFormData);

      const initialSupply = fetchedSupplies.find(
        (s) => s.source_name === order.nguon
      );

      const registerDate = order[ORDER_FIELDS.NGAY_DANG_KI];
      if (order.id_don_hang && order.san_pham) {
        await calculatePrice(
          initialSupply?.id ?? 0,
          order.san_pham,
          order.id_don_hang,
          registerDate
        );
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, order, fetchSuppliesForProduct, calculatePrice]);

  const handleSourceChange = async (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const selectedValue = event.target.value;
    const parsedId = Number(selectedValue);
    const sourceId = Number.isFinite(parsedId) && parsedId > 0 ? parsedId : null;
    const selectedSupply = supplies.find((s) => s.id === sourceId);

    const productName =
      formData?.[ORDER_FIELDS.SAN_PHAM] || baseOrderRef.current?.san_pham || "";
    const orderId =
      formData?.id_don_hang || baseOrderRef.current?.id_don_hang || "";
    const registerDate =
      formData?.[ORDER_FIELDS.NGAY_DANG_KI] ||
      baseOrderRef.current?.[ORDER_FIELDS.NGAY_DANG_KI];

    setFormData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        [ORDER_FIELDS.NGUON]: selectedSupply ? selectedSupply.source_name : "",
      };
    });

    if (sourceId && productName && orderId) {
      await calculatePrice(sourceId, productName, orderId, registerDate);
    } else if (!sourceId) {
      setFormData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          [ORDER_FIELDS.NGUON]: "",
          [ORDER_FIELDS.GIA_NHAP]: 0,
          [ORDER_FIELDS.GIA_BAN]: 0,
        };
      });
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;

    if (READ_ONLY_FIELDS.includes(name)) return;

    setFormData((prev) => {
      if (!prev) return null;

      return {
        ...prev,
        [name]: value,
      };
    });
  };

  const currentSupplyId =
    supplies.find((s) => s.source_name === formData?.[ORDER_FIELDS.NGUON])
      ?.id || "";

  return {
    formData,
    supplies,
    currentSupplyId,
    handleChange,
    handleSourceChange,
  };
};

const EditOrderModal: React.FC<EditOrderModalProps> = ({
  isOpen,
  onClose,
  order,
  onSave,
}) => {
  const {
    formData,
    supplies,
    currentSupplyId,
    handleChange,
    handleSourceChange,
  } = useEditOrderLogic(order, isOpen);

  if (!isOpen || !formData) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      onSave(formData);
    }
  };

  const inputClass =
    "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm";
  const readOnlyClass = `bg-gray-200 cursor-not-allowed`;
  const labelClass = "block text-sm font-medium text-gray-700";

  const isReadOnly = (fieldName: string) =>
    READ_ONLY_FIELDS.includes(fieldName);

  const displayDate = (dateStr: string) => {
    if (!dateStr || dateStr.length < 10 || dateStr.indexOf("-") === -1)
      return dateStr;
    const parts = dateStr.substring(0, 10).split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-5 border-b border-gray-200 flex justify-center items-center bg-gray-50 sticky top-0 z-10">
          <h3 className="text-2xl font-bold text-gray-800">
            Chỉnh sửa Đơn hàng:{" "}
            <span className="text-blue-600">
              {formData[ORDER_FIELDS.ID_DON_HANG]}
            </span>
          </h3>
        </div>

        <div className="p-6 flex-grow overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                      value={formData?.[ORDER_FIELDS.ID_DON_HANG] ?? ""}
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
                      value={formData?.[ORDER_FIELDS.KHACH_HANG] ?? ""}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Link Liên Hệ</label>
                    <input
                      type="text"
                      name={ORDER_FIELDS.LINK_LIEN_HE}
                      value={formData?.[ORDER_FIELDS.LINK_LIEN_HE] ?? ""}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Nguồn</label>
                    <select
                      name={ORDER_FIELDS.NGUON}
                      value={currentSupplyId || ""}
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
                      value={formData?.[ORDER_FIELDS.TINH_TRANG] ?? ""}
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
                      value={formData?.[ORDER_FIELDS.SAN_PHAM] ?? ""}
                      readOnly
                      className={`${inputClass} ${readOnlyClass}`}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Sản phẩm đã được khóa, vui lòng thay đổi nguồn cho phù hợp.
                    </p>
                  </div>

                  <div>
                    <label className={labelClass}>Thông Tin Sản Phẩm</label>
                    <textarea
                      name={ORDER_FIELDS.THONG_TIN_SAN_PHAM}
                      value={formData?.[ORDER_FIELDS.THONG_TIN_SAN_PHAM] ?? ""}
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
                      value={formData?.[ORDER_FIELDS.SLOT] ?? ""}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Ngày Đăng Ký</label>
                    <input
                      type="text"
                      name={ORDER_FIELDS.NGAY_DANG_KI}
                      value={displayDate(formData[ORDER_FIELDS.NGAY_DANG_KI])}
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
                      value={formData?.[ORDER_FIELDS.SO_NGAY_DA_DANG_KI] ?? ""}
                      readOnly={isReadOnly(ORDER_FIELDS.SO_NGAY_DA_DANG_KI)}
                      className={`${inputClass} ${
                        isReadOnly(ORDER_FIELDS.SO_NGAY_DA_DANG_KI)
                          ? readOnlyClass
                          : ""
                      }`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Ngày Hết Hạn</label>
                    <input
                      type="text"
                      name={ORDER_FIELDS.HET_HAN}
                      value={displayDate(formData[ORDER_FIELDS.HET_HAN])}
                      readOnly={isReadOnly(ORDER_FIELDS.HET_HAN)}
                      className={`${inputClass} ${
                        isReadOnly(ORDER_FIELDS.HET_HAN) ? readOnlyClass : ""
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 shadow-sm">
                <h4 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
                  Thông tin Tài chính & Ghi chú
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Giá Nhập (đ)</label>
                    <input
                      type="text"
                      name={ORDER_FIELDS.GIA_NHAP}
                      value={Helpers.formatCurrency(
                        formData[ORDER_FIELDS.GIA_NHAP]
                      )}
                      readOnly={isReadOnly(ORDER_FIELDS.GIA_NHAP)}
                      className={`${inputClass} font-semibold text-blue-700 ${
                        isReadOnly(ORDER_FIELDS.GIA_NHAP) ? readOnlyClass : ""
                      }`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Giá Bán (đ)</label>
                    <input
                      type="text"
                      name={ORDER_FIELDS.GIA_BAN}
                      value={Helpers.formatCurrency(
                        formData[ORDER_FIELDS.GIA_BAN]
                      )}
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
                      value={formData?.[ORDER_FIELDS.NOTE] ?? ""}
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



