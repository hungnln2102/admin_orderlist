const request = require("supertest");

process.env.DISABLE_CSRF = "false";

describe("POST /api/auth/change-password CSRF + success flow", () => {
  const userRow = {
    userid: 7,
    username: "admin",
    passwordhash: "$2a$10$old-hash",
    role: "admin",
  };

  const bootApp = () => {
    jest.resetModules();

    const selectQueue = [userRow, userRow];
    const updateSpy = jest.fn().mockResolvedValue(1);
    const dbMock = jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      whereRaw: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockImplementation(async () => selectQueue.shift() || null),
      update: updateSpy,
    }));

    const bcryptMock = {
      compare: jest.fn().mockResolvedValue(true),
      hash: jest.fn().mockResolvedValue("$2a$10$new-hash"),
    };

    jest.doMock("../../../../src/db", () => ({
      db: dbMock,
      withTransaction: jest.fn(),
    }));
    jest.doMock("bcryptjs", () => bcryptMock);

    const app = require("@/app");
    return { app, updateSpy, bcryptMock };
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("blocks missing CSRF token and allows valid CSRF token for authenticated change-password", async () => {
    const { app, updateSpy, bcryptMock } = bootApp();
    const agent = request.agent(app);

    const csrfResponse = await agent.get("/api/auth/csrf-token");
    expect(csrfResponse.statusCode).toBe(200);
    expect(csrfResponse.body.csrfToken).toBeTruthy();

    const loginResponse = await agent.post("/api/auth/login").send({
      username: "admin",
      password: "old-password",
    });
    expect(loginResponse.statusCode).toBe(200);
    expect(loginResponse.body.user).toEqual(
      expect.objectContaining({
        id: 7,
        username: "admin",
      })
    );

    const missingCsrfResponse = await agent.post("/api/auth/change-password").send({
      currentPassword: "old-password",
      newPassword: "new-password",
      confirmPassword: "new-password",
    });
    expect(missingCsrfResponse.statusCode).toBe(403);
    expect(missingCsrfResponse.body.code).toBe("CSRF_TOKEN_MISSING");

    const validResponse = await agent
      .post("/api/auth/change-password")
      .set("X-CSRF-Token", csrfResponse.body.csrfToken)
      .send({
        currentPassword: "old-password",
        newPassword: "new-password",
        confirmPassword: "new-password",
      });

    expect(validResponse.statusCode).toBe(200);
    expect(validResponse.body).toEqual({ success: true });
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ passwordhash: "$2a$10$new-hash" }));
    expect(bcryptMock.hash).toHaveBeenCalledWith("new-password", 10);
  });
});
