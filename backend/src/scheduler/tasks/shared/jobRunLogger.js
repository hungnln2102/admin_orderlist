const logger = require("../../../utils/logger");

function startJobRun(jobName, context = {}) {
  const startedAt = new Date();
  const state = {
    jobName,
    startedAt,
    counters: {},
    context,
  };
  logger.info("[%s] start", jobName, {
    ...context,
    started_at: startedAt.toISOString(),
    pid: process.pid,
  });
  return state;
}

function setCounter(state, key, value) {
  state.counters[key] = value;
}

function addCounter(state, key, delta = 1) {
  const base = Number(state.counters[key] || 0);
  state.counters[key] = base + Number(delta || 0);
}

function finishJobRun(state, extra = {}) {
  const endedAt = new Date();
  const elapsedMs = endedAt.getTime() - state.startedAt.getTime();
  logger.info("[%s] done", state.jobName, {
    ...state.context,
    ...extra,
    ...state.counters,
    started_at: state.startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    elapsed_ms: elapsedMs,
    pid: process.pid,
  });
}

module.exports = {
  startJobRun,
  setCounter,
  addCounter,
  finishJobRun,
};

