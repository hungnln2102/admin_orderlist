const AUTH_OPEN_PATHS = new Set(["/auth/login", "/auth/logout", "/auth/me"]);

const authGuard = (req, res, next) => {
  // CHO PHÉP: Các đường dẫn auth (login, logout, me)
  if (AUTH_OPEN_PATHS.has(req.path) || req.path.startsWith("/auth/")) {
    return next();
  }

  // CHO PHÉP: Legacy webhook path `/api/payment/*` (tương thích ngược).
  // Kiến trúc hiện tại: webhook Sepay chạy process/server riêng + signature verification,
  // còn payment domain chính mount tại `/payment-receipts*` và vẫn bắt buộc session auth.
  if (req.path.startsWith("/api/payment/")) {
    return next();
  }

  // CHẶN: Nếu không có session người dùng
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "Không có quyền truy cập" });
  }
  
  return next();
};

module.exports = {
  authGuard,
  AUTH_OPEN_PATHS,
};