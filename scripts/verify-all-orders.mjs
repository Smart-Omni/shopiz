import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();
const base = process.env.SHOPIZ_URL || "http://127.0.0.1:5173";
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

// 8 Official Shopee tabs
const EXPECTED_TABS = [
  "Tất cả",
  "Chờ xác nhận",
  "Chờ lấy hàng",
  "Đang giao",
  "Đã giao",
  "Đơn Huỷ",
  "Trả hàng/Hoàn tiền",
  "Giao không thành công",
];

// Expected column names
const EXPECTED_COLUMNS = [
  "Sản phẩm",
  "Tổng cộng",
  "Trạng thái",
  "Đếm ngược",
  "Tất cả ĐVVC",
  "Thao tác",
];

try {
  console.log("=================================================================");
  console.log("VERIFYING: 'TẤT CẢ' ALL ORDERS MANAGEMENT PAGE (SHOPEE PARITY)");
  console.log("=================================================================");

  // 1. Navigate to /seller?tab=orders_all&shop_id=727720655
  await page.goto(`${base}/seller?tab=orders_all&shop_id=727720655`, { waitUntil: "networkidle" });
  console.log("PASS Navigated to /seller?tab=orders_all&shop_id=727720655");

  // 2. Verify all 8 status tabs in exact order
  const tabs = page.locator("div[role='tablist'] button[role='tab']");
  const tabCount = await tabs.count();
  assert.equal(tabCount, 8, `Expected 8 status tabs, got ${tabCount}`);

  for (let i = 0; i < EXPECTED_TABS.length; i++) {
    const text = await tabs.nth(i).innerText();
    assert.ok(
      text.includes(EXPECTED_TABS[i]),
      `Tab ${i + 1} mismatch: expected '${EXPECTED_TABS[i]}', got '${text.trim()}'`,
    );
  }
  console.log("PASS All 8 status tabs verified in exact order");

  // 3. Verify initial active tab is 'Tất cả'
  const activeTab = page.locator("button[role='tab'][class*='tabActive']");
  assert.ok((await activeTab.innerText()).includes("Tất cả"), "Initial active tab must be 'Tất cả'");
  console.log("PASS Initial selected tab is 'Tất cả'");

  // 4. Verify Date range filter, Xuất button, and Advanced Filter icon
  const dateInput = page.locator("input[aria-label='Khoảng ngày đặt hàng']");
  await dateInput.waitFor();
  const dateVal = await dateInput.inputValue();
  assert.ok(dateVal.length > 5, "Date range input has default date range");
  console.log(`PASS Date range filter rendered with: '${dateVal}'`);

  const exportBtn = page.locator("button[class*='btnExport']");
  await exportBtn.waitFor();
  console.log("PASS 'Xuất' button rendered next to date range");

  const filterSettingsBtn = page.locator("button[class*='btnFilterSettings']");
  await filterSettingsBtn.waitFor();
  const dotBadge = await page.locator("span[class*='filterDotBadge']").innerText();
  assert.equal(dotBadge, "1", "Filter icon badge shows count 1");
  console.log("PASS Filter settings icon with red badge '1' verified");

  // 5. Verify Search Toolbar: Dropdown, Input, solid cam button "Tìm kiếm", and "Đặt lại"
  const searchSelect = page.locator("select[class*='searchSelect']");
  await searchSelect.waitFor();
  const searchSubmitBtn = page.locator("button[class*='btnSearch']");
  await searchSubmitBtn.waitFor();
  const searchBtnText = await searchSubmitBtn.innerText();
  assert.equal(searchBtnText.trim(), "Tìm kiếm", "Search button must have label 'Tìm kiếm'");
  const resetBtn = page.locator("button[class*='btnReset']");
  await resetBtn.waitFor();
  console.log("PASS Search toolbar verified with solid 'Tìm kiếm' button and 'Đặt lại'");

  // 6. Verify Sub-tabs when switching to "Chờ lấy hàng"
  const toShipTab = page.locator("button[role='tab']", { hasText: "Chờ lấy hàng" });
  await toShipTab.click();
  await page.waitForTimeout(300);

  const subTabs = page.locator("div[class*='subTabsRow'] button[class*='subTabBtn']");
  const subCount = await subTabs.count();
  assert.equal(subCount, 3, `Expected 3 sub-tabs under Chờ lấy hàng, got ${subCount}`);
  assert.ok((await subTabs.nth(0).innerText()).includes("Tất cả"), "Sub-tab 1 is 'Tất cả'");
  assert.ok((await subTabs.nth(1).innerText()).includes("Chưa xử lý"), "Sub-tab 2 is 'Chưa xử lý'");
  assert.ok((await subTabs.nth(2).innerText()).includes("Đã xử lý"), "Sub-tab 3 is 'Đã xử lý'");
  console.log("PASS 3 Sub-tabs verified under 'Chờ lấy hàng' (Tất cả, Chưa xử lý, Đã xử lý)");

  // Test clicking "Chưa xử lý"
  await subTabs.nth(1).click();
  await page.waitForTimeout(200);
  const unprocOrders = page.locator("tr[class*='orderDataRow']");
  const unprocCount = await unprocOrders.count();
  console.log(`Unprocessed orders count: ${unprocCount}`);

  // Switch back to "Tất cả" status tab
  await page.locator("button[role='tab']", { hasText: "Tất cả" }).first().click();
  await page.waitForTimeout(200);

  // 7. Verify Summary & Action Bar: Order Count, Sort dropdown, and Giao Hàng Loạt
  const countElement = page.locator("div[class*='countNumber'] strong");
  await countElement.waitFor();
  const countText = await countElement.innerText();
  console.log(`Live Order Count: '${countText}'`);
  assert.match(countText, /\d+\s+Đơn hàng/, "Order count must be dynamic format '{N} Đơn hàng'");

  const sortSelect = page.locator("select[class*='sortSelect']");
  await sortSelect.waitFor();
  console.log("PASS '⇅ Sắp xếp theo' dropdown rendered");

  const massShipBtn = page.locator("button[class*='btnMassShip']");
  await massShipBtn.waitFor();
  const massShipText = await massShipBtn.innerText();
  assert.ok(massShipText.includes("Giao Hàng Loạt"), "Mass shipping button has text 'Giao Hàng Loạt'");
  console.log("PASS '📦 Giao Hàng Loạt' button rendered");

  // 8. Verify Table Column Headers in exact order
  const tableHeaders = page.locator("table[class*='ordersTable'] th");
  const colCount = await tableHeaders.count();
  assert.equal(colCount, 6, `Expected 6 table headers, got ${colCount}`);

  for (let i = 0; i < EXPECTED_COLUMNS.length; i++) {
    const headerText = await tableHeaders.nth(i).innerText();
    assert.ok(
      headerText.includes(EXPECTED_COLUMNS[i]),
      `Header ${i + 1} mismatch: expected '${EXPECTED_COLUMNS[i]}', got '${headerText.trim()}'`,
    );
  }
  console.log("PASS All 6 table columns verified ('Sản phẩm', 'Tổng cộng', 'Trạng thái', 'Đếm ngược', 'Tất cả ĐVVC', 'Thao tác')");

  // 9. Verify In-Column Carrier Dropdown inside <th>
  const thCarrierSelect = page.locator("th select[class*='thCarrierSelect']");
  await thCarrierSelect.waitFor();
  const carrierOptions = await thCarrierSelect.locator("option").allInnerTexts();
  assert.ok(carrierOptions.includes("Tất cả ĐVVC"), "Carrier dropdown has 'Tất cả ĐVVC'");
  console.log("PASS In-column carrier dropdown filter embedded in <th> header");

  // 10. Verify Order Card Layout & Elements
  const firstCardHeader = page.locator("tr[class*='orderMetaRow']").first();
  await firstCardHeader.waitFor();

  // Avatar + Buyer Username + Chat Icon
  const buyerAvatar = firstCardHeader.locator("div[class*='buyerAvatar']");
  assert.ok(await buyerAvatar.isVisible(), "Buyer avatar icon circle is visible");

  const buyerUsername = firstCardHeader.locator("span[class*='buyerUsername']");
  const buyerNameText = await buyerUsername.innerText();
  assert.ok(buyerNameText.length > 0, "Buyer username displayed");

  const chatBtn = firstCardHeader.locator("button[class*='buyerChatBtn']");
  assert.ok(await chatBtn.isVisible(), "Chat icon button next to buyer is visible");

  // Order SN on right
  const orderSnBtn = firstCardHeader.locator("button[class*='orderSnBtn']");
  const orderSnText = await orderSnBtn.innerText();
  assert.ok(orderSnText.length > 0, `Order SN displayed on card header: ${orderSnText}`);
  console.log(`PASS Card header verified: Avatar + ${buyerNameText} + Chat Icon | Mã đơn hàng ${orderSnText}`);

  // Verify first order data row
  const firstDataRow = page.locator("tr[class*='orderDataRow']").first();
  const firstPayment = await firstDataRow.locator("td[class*='paymentCol']").innerText();
  assert.ok(firstPayment.includes("₫"), "Order payment total formatted in VND (₫)");

  // Check Blue Action Links
  const actionLinks = firstDataRow.locator("td[class*='actionCol'] button");
  const actionLinkCount = await actionLinks.count();
  assert.ok(actionLinkCount >= 1, "Order card has action links");
  const firstActionText = await actionLinks.first().innerText();
  console.log(`PASS Action links verified (First action: '${firstActionText}')`);

  // 11. Test SLA Warning message on orders in READY_TO_SHIP
  const slaWarning = page.locator("p[class*='slaWarningText']").first();
  if (await slaWarning.isVisible()) {
    const slaText = await slaWarning.innerText();
    assert.ok(
      slaText.includes("Để tránh việc giao hàng trễ, vui lòng giao hàng/chuẩn bị hàng trước"),
      "SLA warning note contains exact Shopee reference text",
    );
    console.log(`PASS SLA warning text verified: '${slaText}'`);
  }

  // 12. Test Search by order SN
  const searchInput = page.locator("input[class*='searchInput']");
  await searchInput.fill(orderSnText);
  await searchSubmitBtn.click();
  await page.waitForTimeout(300);

  const searchCount = await page.locator("tr[class*='orderDataRow']").count();
  assert.equal(searchCount, 1, `Search by exact SN should return 1 order, got ${searchCount}`);
  console.log("PASS Search by order SN successfully filtered results");

  // Reset filter
  await resetBtn.click();
  await page.waitForTimeout(300);
  const resetCount = await page.locator("tr[class*='orderDataRow']").count();
  assert.ok(resetCount > 1, "Reset filter restores order list");
  console.log("PASS Reset filter restored full order list");

  // 13. Test Empty State message when filter matches nothing
  await searchInput.fill("NON_EXISTENT_ORDER_99999");
  await searchSubmitBtn.click();
  await page.waitForTimeout(300);

  const emptyMsg = page.locator("p[class*='emptyMessage']");
  await emptyMsg.waitFor();
  const emptyText = await emptyMsg.innerText();
  assert.equal(
    emptyText,
    "Vui lòng Xuất báo cáo để xem các đơn hàng trước 24/10/2024.",
    "Empty state message matches reference specification",
  );
  console.log("PASS Empty state displayed with exact reference message");

  // Reset filter back
  await resetBtn.click();
  await page.waitForTimeout(300);

  // 14. Test CSV Export download
  const downloadPromise = page.waitForEvent("download");
  await exportBtn.click();
  const download = await downloadPromise;
  assert.ok(download.suggestedFilename().endsWith(".csv"), "Export should trigger CSV download");
  console.log(`PASS CSV Export successful: ${download.suggestedFilename()}`);

  console.log("=================================================================");
  console.log("   🎉 ALL 14 E2E SPECIFICATION TESTS PASSED SUCCESSFULLY!        ");
  console.log("=================================================================");
} catch (err) {
  console.error("Test failed with error:", err);
  if (errors.length) {
    console.error("Page errors detected:", errors);
  }
  process.exit(1);
} finally {
  await browser.close();
}
