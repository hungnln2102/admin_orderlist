const express = require("express");
const request = require("supertest");

describe("saving-goals priority/order sensitive flows", () => {
  const buildHarness = () => {
    jest.resetModules();

    const maxFirstSpy = jest.fn().mockResolvedValue({ maxPriority: 3 });
    const insertReturningSpy = jest.fn().mockResolvedValue([
      {
        id: 41,
        goal_name: "Mua laptop",
        target_amount: 25000000,
        priority: 4,
        created_at: "2026-05-15T00:00:00.000Z",
      },
    ]);
    const updateSpy = jest.fn();
    const updateReturningSpy = jest.fn().mockResolvedValue([
      {
        id: 41,
        goal_name: "Mua laptop",
        target_amount: 25000000,
        priority: 2,
        created_at: "2026-05-15T00:00:00.000Z",
      },
    ]);

    const dbMock = jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      max: jest.fn().mockReturnThis(),
      first: maxFirstSpy,
      insert: jest.fn(() => ({
        returning: insertReturningSpy,
      })),
      where: jest.fn().mockReturnThis(),
      update: jest.fn((payload) => {
        updateSpy(payload);
        return {
          returning: updateReturningSpy,
        };
      }),
      returning: jest.fn(),
      decrement: jest.fn().mockResolvedValue(1),
      delete: jest.fn().mockResolvedValue(1),
    }));

    jest.doMock("../../../../src/db", () => ({
      db: dbMock,
      withTransaction: jest.fn(),
    }));
    jest.doMock("../../../../src/utils/logger", () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }));

    const router = require("../../../../src/domains/saving-goals/routes");
    const app = express();
    app.use(express.json());
    app.use("/", router);

    return {
      app,
      insertReturningSpy,
      updateSpy,
    };
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("assigns next priority on create (happy path ordering)", async () => {
    const { app, insertReturningSpy } = buildHarness();

    const response = await request(app).post("/").send({
      goal_name: "Mua laptop",
      target_amount: 25000000,
    });

    expect(response.statusCode).toBe(201);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: 41,
        goal_name: "Mua laptop",
        priority: 4,
      })
    );
    expect(insertReturningSpy).toHaveBeenCalled();
  });

  it("keeps idempotent outcome when concurrent same-priority updates happen", async () => {
    const { app, updateSpy } = buildHarness();

    const [first, second] = await Promise.all([
      request(app).put("/41/priority").send({ priority: 2 }),
      request(app).put("/41/priority").send({ priority: 2 }),
    ]);

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(first.body.priority).toBe(2);
    expect(second.body.priority).toBe(2);
    expect(updateSpy).toHaveBeenCalledTimes(2);
    for (const [payload] of updateSpy.mock.calls) {
      expect(Object.values(payload)).toContain(2);
    }
  });
});
