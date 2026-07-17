const request = require("supertest");

process.env.DISABLE_CSRF = "false";

const app = require("@/app");

describe("auth CSRF protection", () => {
  it("blocks POST /api/auth/logout without CSRF token", async () => {
    const response = await request(app).post("/api/auth/logout");

    expect(response.statusCode).toBe(403);
    expect(response.body.code).toBe("CSRF_TOKEN_MISSING");
  });

  it("allows POST /api/auth/logout with valid CSRF token", async () => {
    const agent = request.agent(app);
    const csrfResponse = await agent.get("/api/auth/csrf-token");
    const csrfToken = csrfResponse.body.csrfToken;

    const response = await agent.post("/api/auth/logout").set("X-CSRF-Token", csrfToken);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ success: true });
  });

  it("keeps POST /api/auth/login CSRF-exempt for current flow", async () => {
    const response = await request(app).post("/api/auth/login").send({});

    expect(response.statusCode).toBe(400);
    expect(response.body.code).toBe("VALIDATION_ERROR");
  });

  it("requires CSRF for POST /api/auth/change-password", async () => {
    const response = await request(app).post("/api/auth/change-password").send({});

    expect(response.statusCode).toBe(403);
    expect(response.body.code).toBe("CSRF_TOKEN_MISSING");
  });
});
