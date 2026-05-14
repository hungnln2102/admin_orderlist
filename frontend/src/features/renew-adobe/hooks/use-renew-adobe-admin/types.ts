export type CheckAllProgress = {
  total: number;
  completed: number;
  failed: number;
  checkingIds: Set<number>;
};

export type FixAllProgress = {
  current: number;
  total: number;
};
