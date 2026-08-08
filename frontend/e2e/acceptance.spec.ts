import { test, expect } from "@playwright/test";
import crypto from "crypto";

test.describe("Admin Store E2E Acceptance Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Go to login page
    await page.goto("/login");
    
    // Fill credentials
    await page.locator('input[placeholder="Nhập tên đăng nhập"]').fill("admin");
    await page.locator('input[placeholder="Nhập mật khẩu"]').fill("123456");
    
    // Click Đăng nhập
    await page.locator('button[type="submit"]:has-text("Đăng nhập")').click();
    
    // Wait for redirection to dashboard
    await page.waitForURL("**/dashboard");
  });

  test("Scenario: Create Order, Pay via Webhook, and Update Order", async ({ page, request }) => {
    // Navigate to /orders
    await page.goto("/orders");
    await page.waitForSelector("button:has-text('Tạo Đơn')");

    // Click "Tạo Đơn" to open the modal
    await page.locator("button:has-text('Tạo Đơn')").click();
    await page.waitForSelector("#create-order-form");

    // Fill Customer Selection Form
    await page.locator('input[name="customer"]').fill("Playwright Customer E2E");
    await page.locator('input[name="contact"]').fill("0999888777");

    // Switch to manual mode for custom Product and Supplier
    await page.getByLabel("Switch to manual mode").click();

    // Fill custom product and supplier
    await page.locator('input[name="id_product"]').fill("Adobe Creative Cloud E2E");
    await page.locator('input[name="supply"]').fill("NCC E2E Supplier");

    // Enter pricing (cost and price)
    await page.locator('input[name="cost"]').fill("150000");
    await page.locator('input[name="price"]').fill("200000");

    // Enter slot and info
    await page.locator('label:has-text("Slot") + input').fill("1");
    await page.locator('label:has-text("Thông tin sản phẩm") + input').fill("playwright-e2e@test.com");

    // Click "Tạo đơn hàng" submit button in the footer
    await page.locator('button[type="submit"]:has-text("Tạo đơn hàng")').click();

    // Verify order created successfully in order table (modal should close)
    await expect(page.locator("#create-order-form")).not.toBeVisible();

    // Wait for the View Order Modal to open automatically
    await page.waitForSelector(".view-order-modal");

    // Get the order code from the View Order Modal header
    const modalTitleText = await page.locator(".view-order-modal h3.view-order-modal__title span").innerText();
    const orderCodeText = modalTitleText.trim();
    console.log(`Created Order Code: ${orderCodeText}`);
    expect(orderCodeText).not.toBe("");

    // Get the actual price with suffix from the View Order Modal
    const priceText = await page.locator(".view-order-modal p:has-text('Số tiền:') strong").innerText();
    const actualPrice = parseInt(priceText.replace(/[^\d]/g, ""), 10);
    console.log(`Extracted actual price with suffix: ${actualPrice}`);
    expect(actualPrice).toBeGreaterThan(0);

    // Close the modal
    await page.locator(".view-order-modal__header button").click();
    await expect(page.locator(".view-order-modal")).not.toBeVisible();

    // Simulate SePay Webhook
    const sepaySecret = "3vbrRvfwins3eoUFpAnXD11akEqOhmTldj3BCllkxO0gKMSl";
    const payload = {
      transactionDate: new Date().toISOString().slice(0, 19).replace("T", " "),
      accountNumber: "918340998",
      transferType: "in",
      transferAmount: actualPrice,
      content: `Thanh toan don ${orderCodeText}`,
      description: `simulate-sepay-e2e-${Date.now()}`
    };

    const bodyString = JSON.stringify(payload);
    const signature = crypto
      .createHmac("sha256", sepaySecret)
      .update(Buffer.from(bodyString, "utf8"))
      .digest("hex");

    const response = await request.post("http://localhost:5000/api/payment/notify", {
      data: payload,
      headers: {
        "Content-Type": "application/json",
        "X-SEPAY-SIGNATURE": signature
      }
    });

    expect(response.status()).toBe(200);

    // Reload the orders page and verify status changed to "Đã Thanh Toán" (with retries for async processing)
    let statusUpdated = false;
    for (let i = 0; i < 5; i++) {
      await page.reload();
      await page.waitForSelector("table");
      
      // Filter by order code so it remains visible even after moving from unpaid to paid sorting group
      await page.locator('input[placeholder="Tìm kiếm đơn hàng, khách hàng..."]').fill(orderCodeText);
      await page.waitForTimeout(500); // Wait for the search filter to apply
      
      const updatedRow = page.locator(`tr:has-text('${orderCodeText}')`).first();
      try {
        await expect(updatedRow.locator("text=Đã Thanh Toán")).toBeVisible({ timeout: 1000 });
        statusUpdated = true;
        break;
      } catch (e) {
        await page.waitForTimeout(1000);
      }
    }
    expect(statusUpdated).toBe(true);

    // Make sure search box is still filled before locating updatedRow for actions
    await page.locator('input[placeholder="Tìm kiếm đơn hàng, khách hàng..."]').fill(orderCodeText);
    await page.waitForTimeout(500);
    const updatedRow = page.locator(`tr:has-text('${orderCodeText}')`).first();

    // Now edit this order (the 2nd button in the actions cell is PencilIcon for edit)
    await updatedRow.locator('.order-row__actions button').nth(1).click();
    
    // Wait for the edit form
    await page.waitForSelector(".edit-order-shell form");

    // Let's change the contact link/phone
    await page.locator('.edit-order-shell form input[name="contact"]').fill("0999999999");
    
    // Click save
    await page.locator('.edit-order-shell form button[type="submit"]:has-text("Lưu thay đổi")').click();

    // Verify updated contact is displayed in the table
    await page.waitForSelector("table");
    await expect(page.locator("tr:has-text('0999999999')")).toBeVisible();
  });
});
