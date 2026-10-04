import React from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { GenericPage } from "@/features/shared/GenericPage";
import { OrdersPage } from "@/pages/OrdersPage";
import { PricingPage } from "@/pages/PricingPage";
import { SuppliersPage } from "@/pages/SuppliersPage";
import { CreditPage } from "@/pages/CreditPage";
import { PaymentWalletsPage } from "@/pages/PaymentWalletsPage";
import { PackageManagementPage } from "@/features/packages/PackageManagementPage";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { WarehousePage } from "@/pages/WarehousePage";
import { ReceiptsPage } from "@/pages/ReceiptsPage";
import { useAuth } from "@/shared/context/AuthContext";

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-slate-400 font-sans">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Đang kiểm tra quyền truy cập...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

const PublicOnlyRoute: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />

      {/* 1. Tổng quan & Báo cáo */}
      <Route
        path="/traffic"
        element={
          <GenericPage
            title="Traffic & Phân Tích Lượt Truy Cập"
            category="Tổng quan & Báo cáo"
            description="Theo dõi truy cập trang web và nguồn lưu lượng"
            columns={[
              { key: "date", label: "Ngày" },
              { key: "views", label: "Lượt xem" },
              { key: "users", label: "Người dùng" },
              { key: "source", label: "Nguồn chính" },
            ]}
            sampleData={[
              { date: "19/09/2026", views: "14,520", users: "3,120", source: "Google Search" },
              { date: "18/09/2026", views: "12,980", users: "2,840", source: "Direct QR" },
              { date: "17/09/2026", views: "15,800", users: "3,450", source: "Facebook Ads" },
            ]}
          />
        }
      />
      <Route
        path="/tax"
        element={
          <GenericPage
            title="Tính Thuế Hộ Kinh Doanh"
            category="Tổng quan & Báo cáo"
            description="Khai báo và tính mức thuế giá trị gia tăng / TNCN theo doanh thu"
            columns={[
              { key: "month", label: "Tháng" },
              { key: "revenue", label: "Doanh thu tính thuế" },
              { key: "taxRate", label: "Tỷ lệ thuế" },
              { key: "taxAmount", label: "Số tiền thuế" },
            ]}
            sampleData={[
              { month: "Tháng 09/2026", revenue: "158.450.000 ₫", taxRate: "1.5%", taxAmount: "2.376.750 ₫" },
              { month: "Tháng 08/2026", revenue: "142.100.000 ₫", taxRate: "1.5%", taxAmount: "2.131.500 ₫" },
            ]}
          />
        }
      />

      {/* 2. Bán hàng & Đơn hàng */}
      <Route path="/orders" element={<OrdersPage />} />
      <Route path="/credit" element={<CreditPage />} />
      <Route
        path="/customer-list"
        element={
          <GenericPage
            title="Khách Hàng & CTV"
            category="Hệ thống Website"
            description="Danh sách đối tác, CTV và khách hàng thân thiết"
            columns={[
              { key: "name", label: "Họ và tên" },
              { key: "contact", label: "Liên hệ" },
              { key: "type", label: "Phân loại" },
              { key: "totalSpent", label: "Tổng chi tiêu" },
            ]}
            sampleData={[
              { name: "Phạm Thi Lan Anh", contact: "0987123456", type: "Khách Lẻ", totalSpent: "1.500.000 ₫" },
              { name: "Nguyễn Vũ Quang Huy", contact: "0912345678", type: "CTV Cấp 1", totalSpent: "12.800.000 ₫" },
            ]}
          />
        }
      />


      <Route path="/package-products" element={<PackageManagementPage />} />
      <Route
        path="/product-info"
        element={
          <GenericPage
            title="Thông Tin Sản Phẩm & SEO"
            category="Hệ thống Website"
            description="Mô tả chi tiết, hình ảnh và bài viết hướng dẫn sản phẩm"
            columns={[
              { key: "sku", label: "Mã SKU" },
              { key: "name", label: "Sản phẩm" },
              { key: "category", label: "Danh mục" },
              { key: "status", label: "Hiển thị" },
            ]}
            sampleData={[
              { sku: "ADOBE-ALL-12M", name: "Adobe All Apps", category: "Thiết Kế Đồ Họa", status: "Hiển thị" },
              { sku: "CANVA-PRO-12M", name: "Canva Pro", category: "Thiết Kế Đồ Họa", status: "Hiển thị" },
            ]}
          />
        }
      />
      <Route
        path="/form-info"
        element={
          <GenericPage
            title="Cấu Hình Form Đặt Hàng"
            category="Hệ thống Website"
            description="Cấu hình các trường dữ liệu thu thập khi khách hàng đặt đơn"
            columns={[
              { key: "formName", label: "Tên Form" },
              { key: "fields", label: "Các trường yêu cầu" },
              { key: "status", label: "Trạng thái" },
            ]}
            sampleData={[
              { formName: "Form Nhận Email Gia Hạn Adobe", fields: "Email, Mật khẩu tạm", status: "Kích hoạt" },
            ]}
          />
        }
      />
      <Route path="/pricing" element={<PricingPage />} />

      <Route
        path="/active-keys"
        element={
          <GenericPage
            title="Quản Lý Active Keys"
            category="Hệ thống Website"
            description="Danh sách key kích hoạt bản quyền sẵn sàng giao khách"
            columns={[
              { key: "keyCode", label: "Mã Key" },
              { key: "product", label: "Sản phẩm" },
              { key: "status", label: "Trạng thái" },
            ]}
            sampleData={[
              { keyCode: "KASPER-XXXX-YYYY-ZZZZ", product: "Kaspersky Internet Security", status: "Chưa sử dụng" },
            ]}
          />
        }
      />
      <Route
        path="/promo-codes"
        element={
          <GenericPage
            title="Mã Giảm Giá & Voucher"
            category="Hệ thống Website"
            description="Tạo các chương trình khuyến mãi và mã giảm giá"
            columns={[
              { key: "code", label: "Mã Voucher" },
              { key: "discount", label: "Mức giảm" },
              { key: "usage", label: "Đã dùng" },
              { key: "expiry", label: "Hạn dùng" },
            ]}
            sampleData={[
              { code: "MAVRYKNEW", discount: "50.000 ₫", usage: "45 / 100", expiry: "31/12/2026" },
            ]}
          />
        }
      />
      <Route
        path="/add-mcoin"
        element={
          <GenericPage
            title="Nạp MCoin / Điểm Thưởng"
            category="Hệ thống Website"
            description="Cộng điểm thưởng MCoin cho tài khoản khách hàng"
            columns={[
              { key: "customer", label: "Khách hàng" },
              { key: "mcoinAmount", label: "Số MCoin" },
              { key: "reason", label: "Lý do cộng" },
            ]}
            sampleData={[
              { customer: "Nguyễn Vũ Quang Huy", mcoinAmount: "+500 MCoin", reason: "Thưởng doanh số CTV" },
            ]}
          />
        }
      />

      {/* 4. Nguồn hàng & Kho */}
      <Route path="/sources" element={<SuppliersPage />} />
      <Route
        path="/external-imports"
        element={
          <GenericPage
            title="Nhập Nguồn Hàng Ngoài Luồng"
            category="Nguồn hàng & Kho"
            description="Ghi nhận chi phí nhập hàng không qua đơn đặt tự động"
            columns={[
              { key: "importId", label: "Mã Đơn Nhập" },
              { key: "supplier", label: "Nhà cung cấp" },
              { key: "amount", label: "Số tiền" },
              { key: "note", label: "Ghi chú" },
            ]}
            sampleData={[
              { importId: "IMP-992", supplier: "Supplier Adobe Global", amount: "4.000.000 ₫", note: "Nhập 10 gói Adobe All Apps" },
            ]}
          />
        }
      />
      <Route path="/invoices" element={<ReceiptsPage />} />
      <Route path="/warehouse" element={<WarehousePage />} />

      {/* 5. Hệ thống & Ví */}
      <Route
        path="/shop-bank-accounts"
        element={
          <GenericPage
            title="Tài Khoản Shop Bank"
            category="Hệ thống & Ví"
            description="Cấu hình tài khoản ngân hàng nhận tiền chuyển khoản tự động"
            columns={[
              { key: "bankName", label: "Ngân hàng" },
              { key: "accountNumber", label: "Số tài khoản" },
              { key: "accountName", label: "Chủ tài khoản" },
              { key: "status", label: "Mặc định" },
            ]}
            sampleData={[
              { bankName: "MB Bank", accountNumber: "0378304963", accountName: "MAVRYK STORE", status: "Đang nhận Sepay QR" },
            ]}
          />
        }
      />
      <Route path="/payment-accounts" element={<PaymentWalletsPage />} />
      <Route path="/usdt-wallets" element={<Navigate to="/payment-accounts" replace />} />
      <Route
        path="/ip-whitelist"
        element={
          <GenericPage
            title="IP Whitelist Quản Trị"
            category="Hệ thống & Ví"
            description="Cấu hình địa chỉ IP được phép truy cập trang Admin"
            columns={[
              { key: "ipAddress", label: "Địa chỉ IP" },
              { key: "description", label: "Ghi chú" },
              { key: "status", label: "Trạng thái" },
            ]}
            sampleData={[
              { ipAddress: "180.93.43.169", description: "VPS Server Master", status: "Cho phép" },
            ]}
          />
        }
      />
      <Route
        path="/external-api-config"
        element={
          <GenericPage
            title="Cấu Hình API Bên Thứ 3"
            category="Hệ thống & Ví"
            description="Cấu hình API Sepay, Telegram Bot, Mail Service"
            columns={[
              { key: "service", label: "Dịch vụ" },
              { key: "apiKey", label: "API Key / Token" },
              { key: "status", label: "Trạng thái kết nối" },
            ]}
            sampleData={[
              { service: "Sepay Auto Webhook", apiKey: "sepay_sec_*******", status: "Đã kết nối" },
              { service: "Telegram Bot Notify", apiKey: "bot_token_*******", status: "Đã kết nối" },
            ]}
          />
        }
      />
      <Route
        path="/renew-adobe-admin"
        element={
          <GenericPage
            title="Renew Adobe Admin Console"
            category="Hệ thống & Ví"
            description="Quản trị hệ thống gia hạn Adobe tự động"
            columns={[
              { key: "teamName", label: "Tên Team Adobe" },
              { key: "adminEmail", label: "Email Admin" },
              { key: "slotsUsed", label: "Slots đã dùng" },
            ]}
            sampleData={[
              { teamName: "Mavryk Adobe Team #1", adminEmail: "admin@mavrykpremium.com", slotsUsed: "48 / 50 Slots" },
            ]}
          />
        }
      />
      <Route
        path="/renew-adobe-system-logs"
        element={
          <GenericPage
            title="Renew System Logs"
            category="Hệ thống & Ví"
            description="Nhật ký chi tiết các tác vụ gia hạn tự động"
            columns={[
              { key: "time", label: "Thời gian" },
              { key: "level", label: "Mức độ" },
              { key: "message", label: "Nội dung Log" },
            ]}
            sampleData={[
              { time: "19/09/2026 18:30:00", level: "INFO", message: "Gia hạn thành công user phamthilananh@gmail.com" },
            ]}
          />
        }
      />
      <Route
        path="/renew-adobe-check"
        element={
          <GenericPage
            title="Renew Profile Check Desk"
            category="Hệ thống & Ví"
            description="Kiểm tra trạng thái profile tài khoản Adobe"
            columns={[
              { key: "email", label: "Email tài khoản" },
              { key: "status", label: "Trạng thái Profile" },
            ]}
            sampleData={[
              { email: "user1@gmail.com", status: "Active Premium" },
            ]}
          />
        }
      />
      <Route
        path="/netflix"
        element={
          <GenericPage
            title="Quản Trị Hộ Gia Đình Netflix"
            category="Hệ thống & Ví"
            description="Quản lý slot 4K và mã gia đình Netflix"
            columns={[
              { key: "account", label: "Tài khoản chính" },
              { key: "slotNumber", label: "Slot" },
              { key: "pin", label: "Mã PIN" },
            ]}
            sampleData={[
              { account: "netflix1@mavryk.com", slotNumber: "Slot #3", pin: "1234" },
            ]}
          />
        }
      />

      {/* 6. Nội dung & Truyền thông */}
      <Route
        path="/content/articles"
        element={
          <GenericPage
            title="Danh Sách Bài Viết"
            category="Nội dung & Truyền thông"
            description="Quản lý bài viết tin tức, hướng dẫn sử dụng sản phẩm"
            columns={[
              { key: "title", label: "Tiêu đề bài viết" },
              { key: "category", label: "Chuyên mục" },
              { key: "views", label: "Lượt xem" },
              { key: "date", label: "Ngày đăng" },
            ]}
            sampleData={[
              { title: "Hướng dẫn kích hoạt Adobe All Apps 2026", category: "Hướng dẫn", views: "4,520", date: "15/09/2026" },
            ]}
          />
        }
      />
      <Route
        path="/content/create"
        element={
          <GenericPage
            title="Tạo / Chỉnh Sửa Bài Viết"
            category="Nội dung & Truyền thông"
            description="Trình soạn thảo bài viết tin tức và SEO"
            columns={[
              { key: "field", label: "Mục" },
              { key: "value", label: "Nội dung mẫu" },
            ]}
            sampleData={[
              { field: "Tiêu đề", value: "Nhập tiêu đề bài viết tại đây..." },
            ]}
          />
        }
      />
      <Route
        path="/content/categories"
        element={
          <GenericPage
            title="Danh Mục Bài Viết"
            category="Nội dung & Truyền thông"
            description="Phân loại các bài viết tin tức và khuyến mãi"
            columns={[
              { key: "name", label: "Tên danh mục" },
              { key: "slug", label: "Slug SEO" },
              { key: "count", label: "Số bài viết" },
            ]}
            sampleData={[
              { name: "Hướng dẫn kỹ thuật", slug: "huong-dan-ky-thuat", count: "18 Bài" },
            ]}
          />
        }
      />
      <Route
        path="/content/banners"
        element={
          <GenericPage
            title="Banners & Hero Images"
            category="Nội dung & Truyền thông"
            description="Quản lý banner quảng cáo hiển thị trên trang chủ"
            columns={[
              { key: "bannerName", label: "Tên Banner" },
              { key: "location", label: "Vị trí hiển thị" },
              { key: "status", label: "Trạng thái" },
            ]}
            sampleData={[
              { bannerName: "Banner Khuyến Mãi Adobe Thu 2026", location: "Trang chủ Top Hero", status: "Đang chạy" },
            ]}
          />
        }
      />

      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
