/**
 * Shared Telegram send retry: topic/thread errors → retry without topic;
 * optional copy-button errors → retry without buttons.
 */

const { isThreadError, isCopyButtonError } = require("./errorHelpers");

/**
 * @param {object} options
 * @param {(opts: { includeTopic: boolean, includeButtons: boolean }) => object} options.buildPayload
 * @param {(payload: object) => Promise<void>} options.sendFn
 * @param {object} [options.context] Reserved for call sites (closures carry per-send data; this is unused by the helper).
 * @param {number} [options.maxAttempts=3]
 * @param {boolean} [options.enableCopyButtonRetry=false] When true, isCopyButtonError clears reply_markup path.
 * @param {object} [options.log]
 * @param {(fields: { attempt: number, includeTopic: boolean, includeButtons: boolean }) => void} [options.log.sending]
 * @param {(fields: { attempt: number, includeTopic: boolean, includeButtons: boolean }) => void} [options.log.success]
 * @param {(fields: { attempt: number, error?: string, status?: number, body?: unknown }) => void} [options.log.attemptFailed]
 * @param {() => void} [options.log.retryNoTopic]
 * @param {() => void} [options.log.retryNoButtons]
 * @param {(fields: { error?: string, stack?: string, status?: number, body?: unknown }) => void} [options.log.permanentFailure]
 * @param {() => void} [options.log.finalNotSent] Called once if sent is still false after the loop.
 * @returns {Promise<{ sent: boolean }>}
 */
async function sendWithRetry({
  buildPayload,
  sendFn,
  context,
  maxAttempts = 3,
  enableCopyButtonRetry = false,
  log = {},
}) {
  void context;

  let includeTopic = true;
  let includeButtons = true;
  let sent = false;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      log.sending?.({
        attempt: attempt + 1,
        includeTopic,
        includeButtons,
      });
      const payload = buildPayload({ includeTopic, includeButtons });
      await sendFn(payload);
      log.success?.({
        attempt: attempt + 1,
        includeTopic,
        includeButtons,
      });
      sent = true;
      break;
    } catch (err) {
      log.attemptFailed?.({
        attempt: attempt + 1,
        error: err?.message,
        status: err?.status,
        body: err?.body,
      });

      let adjusted = false;
      if (includeTopic && isThreadError(err)) {
        log.retryNoTopic?.();
        includeTopic = false;
        adjusted = true;
      }
      if (enableCopyButtonRetry && includeButtons && isCopyButtonError(err)) {
        log.retryNoButtons?.();
        includeButtons = false;
        adjusted = true;
      }

      if (!adjusted) {
        log.permanentFailure?.({
          error: err?.message,
          stack: err?.stack,
          status: err?.status,
          body: err?.body,
        });
        break;
      }
    }
  }

  if (!sent) {
    log.finalNotSent?.();
  }

  return { sent };
}

module.exports = {
  sendWithRetry,
};
