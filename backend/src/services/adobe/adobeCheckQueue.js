/**
 * Hàng đợi giới hạn đồng thời cho Renew Adobe (check / delete-user).
 * Tránh 10–100 request cùng lúc mở 10–100 browser → OOM hoặc treo.
 *
 * Cấu hình qua env:
 * - ADOBE_CHECK_MAX_CONCURRENT: số job chạy đồng thời (mặc định 2). Chạy headless (PUPPETEER_HEADLESS=true) có thể tăng 4–6 nếu server đủ RAM (~300MB/instance).
 * - ADOBE_CHECK_MAX_QUEUE: số job tối đa chờ trong queue (mặc định 50), vượt thì trả 429
 */

const logger = require("../../utils/logger");

const maxConcurrent = Math.max(1, parseInt(process.env.ADOBE_CHECK_MAX_CONCURRENT, 10) || 2);
const maxQueueSize = Math.max(0, parseInt(process.env.ADOBE_CHECK_MAX_QUEUE, 10) || 50);

let running = 0;
const queue = [];

function processNext() {
  if (running >= maxConcurrent || queue.length === 0) return;
  const { run, resolve, reject } = queue.shift();
  running += 1;
  logger.info("[adobe-queue] Bắt đầu job", { running, queued: queue.length, maxConcurrent });
  Promise.resolve()
    .then(run)
    .then((value) => {
      resolve(value);
    })
    .catch((err) => {
      reject(err);
    })
    .finally(() => {
      running -= 1;
      logger.info("[adobe-queue] Job xong", { running, queued: queue.length });
      processNext();
    });
}

/**
 * Đưa một job vào queue. Job chạy khi có slot (tối đa ADOBE_CHECK_MAX_CONCURRENT).
 * @param {() => Promise<T>} run - Hàm async (vd. gọi getAdobeUserToken)
 * @returns {Promise<T>}
 * @throws Nếu queue đầy (số job đang chờ >= ADOBE_CHECK_MAX_QUEUE) thì reject với error code QUEUE_FULL
 */
function runWithQueue(run) {
  return new Promise((resolve, reject) => {
    if (queue.length >= maxQueueSize) {
      const err = new Error("Hàng đợi check Adobe đã đầy, vui lòng thử lại sau vài phút.");
      err.code = "QUEUE_FULL";
      err.statusCode = 429;
      reject(err);
      return;
    }
    queue.push({ run, resolve, reject });
    processNext();
  });
}

function getQueueStatus() {
  return { running, queued: queue.length, maxConcurrent, maxQueueSize };
}

module.exports = {
  runWithQueue,
  getQueueStatus,
  maxConcurrent,
  maxQueueSize,
};
