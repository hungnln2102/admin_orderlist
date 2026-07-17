const express = require("express");
const request = require("supertest");

const buildApp = () => {
  jest.resetModules();

  const service = {
    createImportPackage: jest.fn().mockResolvedValue({
      stock: { id: 11 },
      pkg: { id: 22, stock_id: 11 },
    }),
    expireImportPackage: jest.fn().mockResolvedValue({
      deletedPackages: [22],
      stockDeleted: true,
    }),
    listRules: jest.fn().mockResolvedValue([]),
    getRuleByProductId: jest.fn().mockResolvedValue({
      id: 1,
      productId: 7,
      enabled: true,
      fields: ["account", "password"],
      defaultSlotLimit: 1,
      defaultMatchMode: "information_order",
    }),
    upsertRule: jest.fn().mockResolvedValue({ id: 1, productId: 7 }),
    deleteRule: jest.fn().mockResolvedValue(true),
  };

  jest.doMock("../../../../src/domains/import-packages/service", () => service);
  jest.doMock("../../../../src/utils/logger", () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }));

  const router = require("@/domains/import-packages/routes");
  const app = express();
  app.use(express.json());
  app.use("/import-packages", router);
  return { app, service };
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe("import-packages routes", () => {
  it("creates stock and package with normalized payload", async () => {
    const { app, service } = buildApp();

    const response = await request(app)
      .post("/import-packages")
      .send({
        productId: 7,
        supplierId: 3,
        importPrice: 120000,
        account: "user@example.com",
        password: "secret",
        backup_email: "backup@example.com",
        two_fa: "ABCDEF",
        expires_at: "2026-12-31",
        note: "first package",
      });

    expect(response.statusCode).toBe(201);
    expect(response.body).toEqual({ stock: { id: 11 }, pkg: { id: 22, stock_id: 11 } });
    expect(service.createImportPackage).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 7,
        supplierId: 3,
        importPrice: 120000,
        account: "user@example.com",
        password: "secret",
        backup_email: "backup@example.com",
        two_fa: "ABCDEF",
        expires_at: "2026-12-31",
        note: "first package",
      })
    );
  });

  it("rejects create request without a valid productId", async () => {
    const { app, service } = buildApp();

    const response = await request(app).post("/import-packages").send({ productId: 0 });

    expect(response.statusCode).toBe(400);
    expect(service.createImportPackage).not.toHaveBeenCalled();
  });

  it("expires package and optionally deletes stock", async () => {
    const { app, service } = buildApp();

    const response = await request(app)
      .post("/import-packages/11/expire")
      .send({ deleteStock: true });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ deletedPackages: [22], stockDeleted: true });
    expect(service.expireImportPackage).toHaveBeenCalledWith(11, true);
  });

  it("returns configured rule for product", async () => {
    const { app, service } = buildApp();

    const response = await request(app).get("/import-packages/rules/7");

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({ productId: 7, enabled: true })
    );
    expect(service.getRuleByProductId).toHaveBeenCalledWith(7);
  });
});