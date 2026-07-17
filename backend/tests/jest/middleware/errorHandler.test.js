const logger = require("@/utils/logger");
const { errorHandler } = require("@/middleware/errorHandler");

describe("errorHandler", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("delegates to next error middleware when headers are already sent", () => {
    const next = jest.fn();
    const res = {
      headersSent: true,
      status: jest.fn(),
      json: jest.fn(),
    };
    const req = { originalUrl: "/api/test", method: "GET" };
    const err = new Error("late error");

    const logSpy = jest.spyOn(logger, "error").mockImplementation(() => undefined);
    errorHandler(err, req, res, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalled();
  });
});
