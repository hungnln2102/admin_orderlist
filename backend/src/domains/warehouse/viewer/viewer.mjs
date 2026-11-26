const status = document.querySelector("#connection-status");
const saveAndClose = document.querySelector("#save-and-close");
const screen = document.querySelector("#screen");
let rfb;
let closing = false;

const socketUrl = new URL("./vnc", window.location.href);
socketUrl.protocol = window.location.protocol === "https:" ? "wss:" : "ws:";

saveAndClose.addEventListener("click", async () => {
  closing = true;
  saveAndClose.disabled = true;
  status.textContent = "Đang lưu và đóng phiên trình duyệt…";

  try {
    const response = await fetch("./close", { method: "POST", credentials: "same-origin" });
    if (!response.ok) throw new Error("Close request failed");

    status.textContent = "Đã lưu và đóng phiên trình duyệt.";
    rfb?.disconnect();
    window.opener?.postMessage({ type: "warehouse-cloud-browser-closed" }, window.location.origin);
    window.close();
  } catch {
    closing = false;
    saveAndClose.disabled = false;
    status.textContent = "Không thể lưu và đóng phiên trình duyệt. Vui lòng thử lại.";
  }
});

saveAndClose.disabled = false;

try {
  const { default: RFB } = await import("./novnc/core/rfb.js");
  rfb = new RFB(screen, socketUrl.href);
  rfb.scaleViewport = true;

  rfb.addEventListener("connect", () => {
    if (!closing) status.textContent = "Đã kết nối với phiên trình duyệt.";
  });
  rfb.addEventListener("disconnect", () => {
    if (!closing) status.textContent = "Đã mất kết nối với phiên trình duyệt.";
  });
} catch {
  if (!closing) status.textContent = "Không thể kết nối với phiên trình duyệt.";
}
