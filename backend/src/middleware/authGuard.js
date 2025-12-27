const AUTH_OPEN_PATHS = new Set(["/auth/login", "/auth/logout", "/auth/me"]);

const authGuard = (req, res, next) => {
  // CHO PHÉP: Các đường dẫn auth HOẶC đường dẫn thanh toán (Webhook)
  if (AUTH_OPEN_PATHS.has(req.path) || req.path.startsWith("/auth/") || req.path.startsWith("/api/payment/")) {
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