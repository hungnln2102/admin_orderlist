/**
 * mockReqRes.js — Tạo mock Express request/response cho test.
 *
 * Dùng cho cả unit test (mock controller) lẫn integration test
 * khi gọi handler trực tiếp không qua supertest.
 */

/**
 * Tạo mock Express Request.
 * @param {object} overrides — ghi đè params, body, query, headers, ...
 * @returns {object}
 */
function createMockReq(overrides = {}) {
  return {
    params: {},
    body: {},
    query: {},
    headers: {},
    get: function (header) {
      return this.headers[header?.toLowerCase()] ?? null;
    },
    ...overrides,
  };
}

/**
 * Tạo mock Express Response.
 * Sau khi handler xong, đọc `res.statusCode` và `res._json`.
 * @returns {object}
 */
function createMockRes() {
  const res = {
    statusCode: 200,
    _json: null,
    _headers: {},
  };

  res.status = function (code) {
    this.statusCode = code;
    return this;
  };

  res.json = function (data) {
    this._json = data;
    return this;
  };

  res.send = function (data) {
    this._json = data;
    return this;
  };

  res.setHeader = function (name, value) {
    this._headers[name.toLowerCase()] = value;
    return this;
  };

  res.end = function () {
    return this;
  };

  return res;
}

module.exports = {
  createMockReq,
  createMockRes,
};
