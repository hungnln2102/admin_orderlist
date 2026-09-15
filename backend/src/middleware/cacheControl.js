/**
 * Middleware cho phép gắn Cache-Control header cho các GET endpoints tra cứu / danh mục.
 * @param {number} maxAge - Số giây cache phía client/browser (mặc định 15s)
 * @param {number} staleWhileRevalidate - Số giây cho phép dùng dữ liệu cũ trong lúc revalidate (mặc định 30s)
 */
const cacheControl = (maxAge = 15, staleWhileRevalidate = 30) => {
  return (req, res, next) => {
    if (req.method === "GET") {
      res.setHeader(
        "Cache-Control",
        `private, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
      );
    }
    next();
  };
};

module.exports = { cacheControl };
