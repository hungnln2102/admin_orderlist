import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import { apiFetch } from "../lib/api";
import * as Helpers from "../lib/helpers";

interface SupplySummaryApiItem {
  id: number;
  sourceName: string;
  numberBank: string | null;
  binBank: string | null;
  bankName: string | null;
  status: string;
  rawStatus?: string | null;
  products: string[];
  monthlyOrders: number;
  monthlyImportValue: number;
  lastOrderDate: string | null;
  totalOrders: number;
}

interface SupplyStats {
  totalSuppliers: number;
  activeSuppliers: number;
  monthlyOrders: number;
  totalImportValue: number;
}

interface SupplySummaryResponse {
  stats?: Partial<SupplyStats>;
  supplies?: SupplySummaryApiItem[];
}

interface SupplySummaryItem extends SupplySummaryApiItem {
  products: string[];
}

const DEFAULT_STATS: SupplyStats = {
  totalSuppliers: 0,
  activeSuppliers: 0,
  monthlyOrders: 0,
  totalImportValue: 0,
};

const formatCurrencyShort = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) return "₫0";
  if (value >= 1_000_000_000) {
    return `₫${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `₫${(value / 1_000_000).toFixed(1)}M`;
  }
  return `₫${Math.round(value).toLocaleString("vi-VN")}`;
};

const formatCurrencyVnd = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) return "₫0";
  return `₫${Math.round(value).toLocaleString("vi-VN")}`;
};

const formatStatusLabel = (status: string): string => {
  if (status === "inactive") return "Tam ngung";
  if (status === "active") return "Dang hoat dong";
  return status || "Chua xac dinh";
};

const getStatusClasses = (status: string): string => {
  if (status === "inactive") {
    return "bg-yellow-100 text-yellow-800";
  }
  if (status === "active") {
    return "bg-green-100 text-green-800";
  }
  return "bg-gray-100 text-gray-800";
};

const getFormattedDate = (value: string | null): string => {
  if (!value) return "--";
  return Helpers.formatDateToDMY(value) || "--";
};

const normalizeProducts = (products?: string[]): string[] => {
  if (!Array.isArray(products)) return [];
  return products
    .map((product) => (typeof product === "string" ? product.trim() : ""))
    .filter((product) => product.length > 0);
};

const formatSearchValue = (value: string): string => value.trim().toLowerCase();

export default function Sources() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplies, setSupplies] = useState<SupplySummaryItem[]>([]);
  const [stats, setStats] = useState<SupplyStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSupplySummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiFetch("/api/supply-insights");
      if (!response.ok) {
        throw new Error("Khong the tai du lieu nguon.");
      }
      const data: SupplySummaryResponse = await response.json();
      const normalizedSupplies: SupplySummaryItem[] = Array.isArray(
        data.supplies
      )
        ? data.supplies.map((item) => ({
            ...item,
            products: normalizeProducts(item.products),
            monthlyOrders: Number(item.monthlyOrders) || 0,
            monthlyImportValue: Number(item.monthlyImportValue) || 0,
            totalOrders: Number(item.totalOrders) || 0,
          }))
        : [];
      setSupplies(normalizedSupplies);
      setStats({
        totalSuppliers: Number(data.stats?.totalSuppliers) || 0,
        activeSuppliers: Number(data.stats?.activeSuppliers) || 0,
        monthlyOrders: Number(data.stats?.monthlyOrders) || 0,
        totalImportValue: Number(data.stats?.totalImportValue) || 0,
      });
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Co loi xay ra khi tai du lieu."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSupplySummary();
  }, [fetchSupplySummary]);

  const productFilters = useMemo(() => {
    const set = new Set<string>();
    supplies.forEach((supply) => {
      supply.products.forEach((product) => set.add(product));
    });
    return Array.from(set).sort();
  }, [supplies]);

  const filteredSupplies = useMemo(() => {
    const formattedSearch = formatSearchValue(searchTerm);
    return supplies.filter((supply) => {
      const matchesSearch =
        !formattedSearch ||
        supply.sourceName.toLowerCase().includes(formattedSearch) ||
        (supply.bankName || "").toLowerCase().includes(formattedSearch) ||
        (supply.numberBank || "").toLowerCase().includes(formattedSearch) ||
        supply.products.some((product) =>
          product.toLowerCase().includes(formattedSearch)
        );

      const matchesStatus =
        statusFilter === "all" || supply.status === statusFilter;

      const matchesCategory =
        categoryFilter === "all"
          ? true
          : categoryFilter === "no-products"
          ? supply.products.length === 0
          : supply.products.includes(categoryFilter);

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [supplies, searchTerm, statusFilter, categoryFilter]);

  const supplierStats = useMemo(
    () => [
      {
        name: "Tong nha cung cap",
        value: stats.totalSuppliers.toString(),
        color: "bg-blue-500",
      },
      {
        name: "Dang hoat dong",
        value: stats.activeSuppliers.toString(),
        color: "bg-green-500",
      },
      {
        name: "Don hang thang nay",
        value: stats.monthlyOrders.toString(),
        color: "bg-purple-500",
      },
      {
        name: "Gia tri nhap hang",
        value: formatCurrencyShort(stats.totalImportValue),
        color: "bg-orange-500",
      },
    ],
    [stats]
  );

  const renderProductBadges = (products: string[]) => {
    if (!products.length) {
      return <span className="text-xs text-gray-400">Chua cap nhat</span>;
    }
    const maxVisible = 3;
    const visible = products.slice(0, maxVisible);
    const hiddenCount = products.length - visible.length;
    return (
      <div className="flex flex-wrap gap-1">
        {visible.map((product) => (
          <span
            key={product}
            className="px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-700"
          >
            {product}
          </span>
        ))}
        {hiddenCount > 0 && (
          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
            +{hiddenCount}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bang thong tin nguon</h1>
          <p className="mt-1 text-sm text-gray-500">
            Quan ly thong tin nha cung cap va doi tac
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            <PlusIcon className="h-4 w-4 mr-2" />
            Them nha cung cap
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {supplierStats.map((stat, index) => (
          <div key={stat.name} className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center">
              <div className={`${stat.color} rounded-lg p-3`}>
                <div className="text-white text-xl font-bold">{index + 1}</div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tim kiem nha cung cap..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="all">Tat ca nguon</option>
            <option value="no-products">Chua gan san pham</option>
            {productFilters.map((product) => (
              <option key={product} value={product}>
                {product}
              </option>
            ))}
          </select>

          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">Tat ca trang thai</option>
            <option value="active">Dang hoat dong</option>
            <option value="inactive">Tam ngung</option>
          </select>

          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            Xuat danh sach
          </button>
        </div>

        {error && (
          <div className="text-sm text-red-600">
            {error}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nha cung cap
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thong tin thanh toan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cac san pham
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Don trong thang
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trang thai
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Don hang cuoi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tong tien thanh toan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tac
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading && (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                    Dang tai du lieu...
                  </td>
                </tr>
              )}

              {!loading && filteredSupplies.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                    Khong tim thay nha cung cap phu hop.
                  </td>
                </tr>
              )}

              {!loading &&
                filteredSupplies.map((supply) => (
                  <tr key={supply.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {supply.sourceName || "Chua dat ten"}
                      </div>
                      <div className="text-xs text-gray-500">
                        Tong don: {supply.totalOrders}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {supply.numberBank || "Chua co so tai khoan"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {supply.bankName ||
                          (supply.binBank ? `BIN ${supply.binBank}` : "Chua co ngan hang")}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderProductBadges(supply.products)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {supply.monthlyOrders} don
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatCurrencyVnd(supply.monthlyImportValue)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusClasses(
                          supply.status
                        )}`}
                      >
                        {formatStatusLabel(supply.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getFormattedDate(supply.lastOrderDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      --{/* Placeholder until payment calculation is finalised */}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 mr-3">
                        Xem
                      </button>
                      <button className="text-green-600 hover:text-green-900">
                        Chinh sua
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
