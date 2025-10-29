import React, { useState } from "react";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";

const pricing = [
  {
    id: "PRD-001",
    name: "iPhone 15 Pro Max",
    category: "Điện thoại",
    sku: "IP15PM-256GB",
    costPrice: 25000000,
    sellingPrice: 29990000,
    margin: 19.96,
    competitor1: 30500000,
    competitor2: 29500000,
    lastUpdated: "15/12/2024",
    priceHistory: "up",
  },
  {
    id: "PRD-002",
    name: "Samsung Galaxy S24 Ultra",
    category: "Điện thoại",
    sku: "SGS24U-512GB",
    costPrice: 22000000,
    sellingPrice: 26990000,
    margin: 22.68,
    competitor1: 27200000,
    competitor2: 26500000,
    lastUpdated: "14/12/2024",
    priceHistory: "stable",
  },
  {
    id: "PRD-003",
    name: "MacBook Pro M3",
    category: "Laptop",
    sku: "MBP-M3-16GB",
    costPrice: 45000000,
    sellingPrice: 54990000,
    margin: 22.2,
    competitor1: 56000000,
    competitor2: 54500000,
    lastUpdated: "13/12/2024",
    priceHistory: "down",
  },
  {
    id: "PRD-004",
    name: "Dell XPS 13",
    category: "Laptop",
    sku: "DELL-XPS13-16GB",
    costPrice: 27000000,
    sellingPrice: 32990000,
    margin: 22.19,
    competitor1: 33500000,
    competitor2: 32500000,
    lastUpdated: "15/12/2024",
    priceHistory: "up",
  },
  {
    id: "PRD-005",
    name: "AirPods Pro 2",
    category: "Phụ kiện",
    sku: "APP2-USBC",
    costPrice: 5200000,
    sellingPrice: 6490000,
    margin: 24.81,
    competitor1: 6600000,
    competitor2: 6400000,
    lastUpdated: "14/12/2024",
    priceHistory: "stable",
  },
];

const pricingStats = [
  {
    name: "Tỷ suất lợi nhuận TB",
    value: "22.4%",
    icon: CurrencyDollarIcon,
    color: "bg-green-500",
    trend: "up",
  },
  {
    name: "Sản phẩm cạnh tranh",
    value: "156",
    icon: ArrowTrendingUpIcon,
    color: "bg-blue-500",
    trend: "up",
  },
  {
    name: "Giá cập nhật hôm nay",
    value: "12",
    icon: PencilIcon,
    color: "bg-purple-500",
    trend: "stable",
  },
  {
    name: "Sản phẩm giá thấp",
    value: "3",
    icon: ArrowTrendingDownIcon,
    color: "bg-red-500",
    trend: "down",
  },
];

export default function Pricing() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [marginFilter, setMarginFilter] = useState("all");

  const filteredPricing = pricing.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || item.category === categoryFilter;
    const matchesMargin =
      marginFilter === "all" ||
      (marginFilter === "high" && item.margin > 25) ||
      (marginFilter === "medium" && item.margin >= 15 && item.margin <= 25) ||
      (marginFilter === "low" && item.margin < 15);
    return matchesSearch && matchesCategory && matchesMargin;
  });

  const getPriceHistoryIcon = (history: string) => {
    switch (history) {
      case "up":
        return <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />;
      case "down":
        return <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4 bg-gray-300 rounded-full"></div>;
    }
  };

  const getMarginColor = (margin: number) => {
    if (margin > 25) return "text-green-600 bg-green-50";
    if (margin >= 15) return "text-blue-600 bg-blue-50";
    return "text-red-600 bg-red-50";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bảng giá sản phẩm
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Quản lý giá bán và theo dõi tỷ suất lợi nhuận
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors">
            <ArrowTrendingUpIcon className="h-4 w-4 mr-2" />
            Cập nhật giá
          </button>
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            <PlusIcon className="h-4 w-4 mr-2" />
            Thêm sản phẩm
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {pricingStats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`${stat.color} rounded-lg p-3`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    {stat.name}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                </div>
              </div>
              <div className="text-right">
                {stat.trend === "up" && (
                  <ArrowTrendingUpIcon className="h-5 w-5 text-green-500" />
                )}
                {stat.trend === "down" && (
                  <ArrowTrendingDownIcon className="h-5 w-5 text-red-500" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">Tất cả danh mục</option>
            <option value="Điện thoại">Điện thoại</option>
            <option value="Laptop">Laptop</option>
            <option value="Phụ kiện">Phụ kiện</option>
          </select>

          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={marginFilter}
            onChange={(e) => setMarginFilter(e.target.value)}
          >
            <option value="all">Tất cả tỷ suất</option>
            <option value="high">Cao (&gt;25%)</option>
            <option value="medium">Trung bình (15-25%)</option>
            <option value="low">Thấp (&lt;15%)</option>
          </select>

          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            So sánh giá
          </button>
        </div>
      </div>

      {/* Pricing Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sản phẩm
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Giá nhập
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Giá bán
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tỷ suất LN
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Đối thủ cạnh tranh
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Xu hướng
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cập nhật
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPricing.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {item.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.category}
                      </div>
                      <div className="text-xs text-gray-400 font-mono">
                        {item.sku}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      ₫{item.costPrice.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">Giá gốc</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-blue-600">
                      ₫{item.sellingPrice.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">Giá bán lẻ</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getMarginColor(
                        item.margin
                      )}`}
                    >
                      {item.margin.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div>₫{item.competitor1.toLocaleString()}</div>
                      <div>₫{item.competitor2.toLocaleString()}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getPriceHistoryIcon(item.priceHistory)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.lastUpdated}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-3">
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button className="text-green-600 hover:text-green-900">
                      So sánh
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
