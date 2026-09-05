/**
 * Unit tests cho backend/src/domains/netflix/publicRoutes.js
 *
 * Test:
 *   GET /api/netflix/public/tabs — Trả về tab configs cho Website
 */

const express = require("express");
const request = require("supertest");
const netflixPublicRoutes = require("../../../../../src/domains/netflix/publicRoutes");

describe("GET /api/netflix/public/tabs", () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/api/netflix/public", netflixPublicRoutes);
  });

  it("trả về HTTP 200, ok: true và danh sách tabs hợp lệ", async () => {
    const res = await request(app).get("/api/netflix/public/tabs");

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.tabs)).toBe(true);
    expect(res.body.tabs.length).toBe(3);

    const ids = res.body.tabs.map((t) => t.id);
    expect(ids).toEqual(["household", "otp", "six-digit"]);

    res.body.tabs.forEach((tab) => {
      expect(tab).toHaveProperty("id");
      expect(tab).toHaveProperty("label");
      expect(tab).toHaveProperty("description");
      expect(tab).toHaveProperty("apiEndpoint");
      expect(tab).toHaveProperty("inputLabel");
      expect(tab).toHaveProperty("inputPlaceholder");
      expect(tab).toHaveProperty("submitLabel");
      expect(tab).toHaveProperty("resultType");
    });
  });
});

describe("GET & POST /api/netflix/public/config", () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/api/netflix/public", netflixPublicRoutes);
  });

  it("GET /config trả về cấu hình mặc định", async () => {
    const res = await request(app).get("/api/netflix/public/config");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("vivaBaseUrl");
    expect(res.body.data).toHaveProperty("mainAccessCode");
    expect(res.body.data).toHaveProperty("otpAccessCode");
  });

  it("POST /config cập nhật cấu hình API thành công", async () => {
    const res = await request(app)
      .post("/api/netflix/public/config")
      .send({
        vivaBaseUrl: "https://new-viva-service.com",
        mainAccessCode: "newmain123",
        otpAccessCode: "newotp456",
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.vivaBaseUrl).toBe("https://new-viva-service.com");
    expect(res.body.data.mainAccessCode).toBe("newmain123");
    expect(res.body.data.otpAccessCode).toBe("newotp456");
  });
});
