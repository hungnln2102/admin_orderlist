const ADMIN_ROLES = new Set(["admin", "super_admin", "owner"]);

function requireAdmin(req, res, next) {
  const role = String(req.session?.user?.role ?? "").trim().toLowerCase();
  if (ADMIN_ROLES.has(role)) return next();
  return res.status(403).json({ error: "Admin role required." });
}

module.exports = { ADMIN_ROLES, requireAdmin };
