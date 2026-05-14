function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function clickBestEffort(locator, timeout = 5000) {
  try {
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    await locator.click({ timeout, force: true });
    return true;
  } catch (_) {}

  try {
    await locator.evaluate((el) => el.click());
    return true;
  } catch (_) {}

  return false;
}

async function waitForAssignButtonEnabled(modal, slotIndex, timeoutMs = 6000) {
  const assignButton = modal
    .locator('button[data-testid="assignment-modal-open-button"]')
    .nth(slotIndex);

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const visible = await assignButton.isVisible({ timeout: 300 }).catch(() => false);
    if (visible) {
      const disabled = await assignButton.isDisabled().catch(() => true);
      if (!disabled) {
        return true;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return false;
}

function getUsersListUrlFromPage(page) {
  const url = page.url();
  const m = url.match(/^(https:\/\/adminconsole\.adobe\.com\/[^/]+@AdobeOrg)/);
  return m ? `${m[1]}/users` : null;
}

module.exports = {
  escapeRegex,
  clickBestEffort,
  waitForAssignButtonEnabled,
  getUsersListUrlFromPage,
};
