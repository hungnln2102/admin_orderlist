const AUTH_OPEN_PATHS = new Set(["/auth/login", "/auth/logout", "/auth/me"]);

const authGuard = (req, res, next) => {
  if (AUTH_OPEN_PATHS.has(req.path) || req.path.startsWith("/auth/")) {
    return next();
  }
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "Khong co quyen truy cap" });
  }
  return next();
};

module.exports = {
  authGuard,
  AUTH_OPEN_PATHS,
};
