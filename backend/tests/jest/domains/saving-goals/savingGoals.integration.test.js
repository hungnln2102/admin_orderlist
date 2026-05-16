describe("saving-goals priority/order sensitive flows", () => {
  const buildUseCases = () => {
    jest.resetModules();

    const fakeTrx = { id: "trx" };
    const withTransaction = jest.fn(async (handler) => handler(fakeTrx));
    const repository = {
      lockPriorityRows: jest.fn().mockResolvedValue(undefined),
      getMaxPriority: jest.fn().mockResolvedValue(3),
      insertGoal: jest.fn().mockResolvedValue({
        id: 41,
        goal_name: "Mua laptop",
        target_amount: 25000000,
        priority: 4,
        created_at: "2026-05-15T00:00:00.000Z",
      }),
      updateGoalById: jest.fn().mockResolvedValue({
        id: 41,
        goal_name: "Mua laptop",
        target_amount: 25000000,
        created_at: "2026-05-15T00:00:00.000Z",
      }),
      findGoalByIdForUpdate: jest.fn().mockResolvedValue({
        id: 41,
        goal_name: "Mua laptop",
        target_amount: 25000000,
        priority: 3,
        created_at: "2026-05-15T00:00:00.000Z",
      }),
      deleteGoalById: jest.fn().mockResolvedValue(1),
      decrementPrioritiesAbove: jest.fn().mockResolvedValue(2),
      countGoals: jest.fn().mockResolvedValue(6),
      shiftPrioritiesForReorder: jest.fn().mockResolvedValue(undefined),
      updateGoalPriority: jest.fn().mockResolvedValue({
        id: 41,
        goal_name: "Mua laptop",
        target_amount: 25000000,
        priority: 2,
        created_at: "2026-05-15T00:00:00.000Z",
      }),
      toGoalResponse: jest.fn((goal) => goal),
      listGoals: jest.fn().mockResolvedValue([]),
    };

    jest.doMock("../../../../src/db", () => ({
      db: {},
      withTransaction,
    }));
    jest.doMock(
      "../../../../src/domains/saving-goals/repositories/savingGoalsRepository",
      () => repository
    );

    const useCases = require("../../../../src/domains/saving-goals/use-cases/savingGoalsUseCases");
    return { useCases, withTransaction, repository, fakeTrx };
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("assigns next priority inside transaction with row-level lock", async () => {
    const { useCases, withTransaction, repository, fakeTrx } = buildUseCases();

    const created = await useCases.createSavingGoal({
      goal_name: "Mua laptop",
      target_amount: 25000000,
    });

    expect(withTransaction).toHaveBeenCalledTimes(1);
    expect(repository.lockPriorityRows).toHaveBeenCalledWith(fakeTrx);
    expect(repository.getMaxPriority).toHaveBeenCalledWith(fakeTrx);
    expect(repository.insertGoal).toHaveBeenCalledWith(
      fakeTrx,
      expect.objectContaining({
        goal_name: "Mua laptop",
        priority: 4,
      })
    );
    expect(created.priority).toBe(4);
  });

  it("deletes goal and compacts following priorities atomically", async () => {
    const { useCases, repository, fakeTrx } = buildUseCases();

    const deleted = await useCases.deleteSavingGoal({ goalId: 41 });

    expect(deleted).toBe(true);
    expect(repository.lockPriorityRows).toHaveBeenCalledWith(fakeTrx);
    expect(repository.deleteGoalById).toHaveBeenCalledWith(fakeTrx, 41);
    expect(repository.decrementPrioritiesAbove).toHaveBeenCalledWith(fakeTrx, 3);
  });

  it("keeps idempotent outcome for same-priority reorder requests", async () => {
    const { useCases, repository } = buildUseCases();
    repository.findGoalByIdForUpdate.mockResolvedValue({
      id: 41,
      goal_name: "Mua laptop",
      target_amount: 25000000,
      priority: 2,
      created_at: "2026-05-15T00:00:00.000Z",
    });

    const [first, second] = await Promise.all([
      useCases.reorderSavingGoal({ goalId: 41, requestedPriority: 2 }),
      useCases.reorderSavingGoal({ goalId: 41, requestedPriority: 2 }),
    ]);

    expect(first.priority).toBe(2);
    expect(second.priority).toBe(2);
    expect(repository.shiftPrioritiesForReorder).not.toHaveBeenCalled();
    expect(repository.updateGoalPriority).not.toHaveBeenCalled();
    expect(repository.lockPriorityRows).toHaveBeenCalledTimes(2);
  });
});
