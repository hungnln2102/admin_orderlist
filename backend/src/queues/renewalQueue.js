const { Queue } = require("bullmq");
const { getQueueConnection } = require("./connection");
const logger = require("../utils/logger");

const QUEUE_NAME = "renewal";

let renewalQueue = null;

const getRenewalQueue = () => {
  if (renewalQueue) return renewalQueue;

  const connection = getQueueConnection();
  if (!connection) return null;

  renewalQueue = new Queue(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 500 },
    },
  });

  renewalQueue.on("error", (err) => {
    logger.error(`[RenewalQueue] Error: ${err.message}`);
  });

  logger.info("[RenewalQueue] BullMQ queue initialised");
  return renewalQueue;
};

const addRenewalJob = async (orderCode, options = {}) => {
  const queue = getRenewalQueue();
  if (!queue) return null;
  const jobId = `renewal-${orderCode}`;
  const existingJob = await queue.getJob(jobId);
  if (existingJob) {
    logger.info(`[RenewalQueue] Job already queued: ${orderCode} (id: ${existingJob.id})`);
    return { job: existingJob, alreadyQueued: true, jobId };
  }

  const job = await queue.add(
    "process-renewal",
    { orderCode, forceRenewal: options.forceRenewal || false },
    { jobId }
  );

  logger.info(`[RenewalQueue] Job added: ${orderCode} (id: ${job.id})`);
  return { job, alreadyQueued: false, jobId };
};

module.exports = { QUEUE_NAME, getRenewalQueue, addRenewalJob };
