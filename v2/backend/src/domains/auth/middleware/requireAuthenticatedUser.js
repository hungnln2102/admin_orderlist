function requireAuthenticatedUser(req, res, next) {
  if (req.session?.user) {
    return next();
  }

  return res.status(401).json({ error: "Unauthorized" });
}

module.exports = { requireAuthenticatedUser };
