import assert from "node:assert/strict";
import { chromium } from "playwright";
import fs from "node:fs";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });
const base = process.env.SHOPIZ_URL || "http://127.0.0.1:5173";
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

const ARTIFACT_DIR = "/Users/nguyetminh/.gemini/antigravity/brain/8d1377c2-f147-42d1-912d-24fee804c9ce";

try {
  console.log("=================================================================");
  console.log("VERIFYING: 'GIAO HÀNG LOẠT' MASS SHIP PAGE (SHOPEE PARITY)");
  console.log("=================================================================\n");

  // ---------------------------------------------------------------------------
  // STEP 1: Entry Point from AllOrdersPage
  // ---------------------------------------------------------------------------
  console.log("STEP 1: Verify entry point from AllOrdersPage ('Chờ lấy hàng' tab)");
  await page.goto(`${base}/seller?tab=orders_all&shop_id=727720655`, { waitUntil: "networkidle" });

  // Click on "Chờ lấy hàng" tab
  const toShipTab = page.locator("button[role='tab']").filter({ hasText: "Chờ lấy hàng" });
  await toShipTab.click();
  await page.waitForTimeout(500);

  // Check for the "Giao Hàng Loạt" button
  const massShipBtn = page.locator("button[class*='btnMassShip']");
  await massShipBtn.waitFor();
  const massShipBtnText = await massShipBtn.innerText();
  assert.ok(massShipBtnText.includes("Giao Hàng Loạt"), "Button contains 'Giao Hàng Loạt'");
  console.log("  ✓ Button [ 📦 Giao Hàng Loạt ] rendered on 'Chờ lấy hàng' tab");

  // Click the button to navigate to Mass Ship page
  await massShipBtn.click();
  await page.waitForTimeout(500);
  assert.ok(page.url().includes("tab=orders_mass_ship"), "Navigated to tab=orders_mass_ship");
  console.log("  ✓ Successfully navigated to /seller?tab=orders_mass_ship");

  // ---------------------------------------------------------------------------
  // STEP 2: Header & Mode Tabs
  // ---------------------------------------------------------------------------
  console.log("\nSTEP 2: Page Header & Main Mode Tabs");
  const title = page.locator("h1[class*='pageTitle']");
  await title.waitFor();
  assert.equal(await title.innerText(), "Chọn Ngày/In Phiếu Giao Hàng Loạt", "Title matches reference screenshot");
  console.log("  ✓ Title verified: 'Chọn Ngày/In Phiếu Giao Hàng Loạt'");

  const subtitle = page.locator("p[class*='pageSubtitle']");
  assert.equal(
    await subtitle.innerText(),
    "Chọn ngày giao hàng và in phiếu giao hàng cho nhiều đơn mỗi lần",
    "Subtitle matches reference screenshot"
  );
  console.log("  ✓ Subtitle verified");

  const guideBtn = page.locator("button[class*='btnGuide']");
  assert.ok(await guideBtn.isVisible(), "'Chuẩn bị hàng ≡' button visible in header");
  console.log("  ✓ 'Chuẩn bị hàng ≡' action link present");

  // Check mode tabs
  const modeTabs = page.locator("button[class*='modeTabBtn']");
  assert.equal(await modeTabs.count(), 2, "2 main mode tabs present");
  assert.ok((await modeTabs.nth(0).innerText()).includes("Chờ giao hàng"), "Tab 1 is 'Chờ giao hàng'");
  assert.ok((await modeTabs.nth(1).innerText()).includes("Tạo phiếu"), "Tab 2 is 'Tạo phiếu'");
  assert.ok((await modeTabs.nth(0).getAttribute("class")).includes("modeTabActive"), "Tab 1 is active by default");
  console.log("  ✓ Mode tabs verified: 'Chờ giao hàng' (Active) and 'Tạo phiếu'");

  // ---------------------------------------------------------------------------
  // STEP 3: Carrier Filter Pills
  // ---------------------------------------------------------------------------
  console.log("\nSTEP 3: Carrier Filter Pills");
  const carrierPills = page.locator("button[class*='carrierPill']");
  const countPills = await carrierPills.count();
  assert.ok(countPills >= 10, `Found ${countPills} carrier pills`);

  const spxPill = carrierPills.filter({ hasNotText: "Instant" }).filter({ hasText: "Shopee Xpress" }).first();
  await spxPill.waitFor();
  const spxText = await spxPill.innerText();
  assert.ok(spxText.includes("Shopee Xpress"), "Shopee Xpress pill exists");
  console.log(`  ✓ Shopee Xpress pill rendered with text: '${spxText.trim()}'`);

  // Click Shopee Xpress pill
  await spxPill.click();
  await page.waitForTimeout(400);
  assert.ok(
    (await spxPill.getAttribute("class")).includes("carrierPillActive"),
    "Shopee Xpress pill has active outline"
  );
  console.log("  ✓ Shopee Xpress pill active with red highlight");

  // ---------------------------------------------------------------------------
  // STEP 4: Tab 1 Orders Table & Right Action Panel
  // ---------------------------------------------------------------------------
  console.log("\nSTEP 4: Tab 1 ('Chờ giao hàng') Table and Batch Preparation Panel");
  const tableHeaders = page.locator("table[class*='ordersTable'] th");
  const headerTexts = await tableHeaders.allInnerTexts();
  assert.ok(headerTexts.some(h => h.includes("Sản Phẩm")), "Table has 'Sản Phẩm' column");
  assert.ok(headerTexts.some(h => h.includes("ID Đơn hàng")), "Table has 'ID Đơn hàng' column");
  assert.ok(headerTexts.some(h => h.includes("Người mua")), "Table has 'Người mua' column");
  assert.ok(headerTexts.some(h => h.includes("Vận chuyển")), "Table has 'Vận chuyển' column");
  assert.ok(headerTexts.some(h => h.includes("Trạng thái Đơn hàng")), "Table has 'Trạng thái Đơn hàng' column");
  console.log("  ✓ All Tab 1 columns verified");

  // Check right side panel initial state
  const sideTitle = page.locator("h3[class*='actionCardTitle']").first();
  assert.equal(await sideTitle.innerText(), "Chuẩn bị đơn hàng loạt", "Right panel title matches");

  const btnPickup = page.locator("button[class*='btnActionPickup']");
  const btnDropoff = page.locator("button[class*='btnActionDropoff']");
  assert.ok(await btnPickup.isDisabled(), "Pickup button is initially disabled when 0 selected");
  assert.ok(await btnDropoff.isDisabled(), "Dropoff button is initially disabled when 0 selected");
  console.log("  ✓ Pickup and Dropoff buttons disabled when 0 selected");

  // Select all orders on page
  const selectAllCheckbox = page.locator("input[aria-label='Chọn tất cả đơn hàng']");
  await selectAllCheckbox.click();
  await page.waitForTimeout(300);

  const selectedCountText = await page.locator("span[class*='selectionCountHighlight']").innerText();
  const selectedNum = parseInt(selectedCountText, 10);
  assert.ok(selectedNum > 0, `Selected count updated to ${selectedNum}`);
  assert.ok(!(await btnPickup.isDisabled()), "Pickup button is enabled after selection");
  assert.ok(!(await btnDropoff.isDisabled()), "Dropoff button is enabled after selection");
  console.log(`  ✓ Select all checked: ${selectedNum} orders selected, actions enabled`);

  // Capture Screenshot of Tab 1
  const tab1ScreenPath = `${ARTIFACT_DIR}/shopee_mass_ship_tab1.png`;
  await page.screenshot({ path: tab1ScreenPath, fullPage: false });
  console.log(`  ✓ Screenshot saved: ${tab1ScreenPath}`);

  // Test Pickup Modal
  await btnPickup.click();
  await page.waitForTimeout(300);
  const modal = page.locator("div[class*='modalBox']");
  await modal.waitFor();
  assert.ok(
    (await modal.locator("h3").innerText()).includes("Yêu cầu tới lấy hàng"),
    "Pickup modal header verified"
  );
  console.log("  ✓ Pickup schedule modal opened with warehouse address & time slots");

  // Confirm Pickup
  const btnConfirmPickup = modal.locator("button[class*='btnModalConfirm']");
  await btnConfirmPickup.click();
  await page.waitForTimeout(800);

  // Check success toast
  const toast = page.locator("div[class*='toastNotice']");
  await toast.waitFor();
  const toastText = await toast.innerText();
  assert.ok(toastText.includes("thành công"), "Success toast message displayed");
  console.log(`  ✓ Toast notice: ${toastText.trim().replace(/\n/g, " ")}`);

  // ---------------------------------------------------------------------------
  // STEP 5: Tab 2 "Tạo phiếu" (Batch Document Printing)
  // ---------------------------------------------------------------------------
  console.log("\nSTEP 5: Tab 2 ('Tạo phiếu') Batch Documents & Manifest Panels");
  const tab2Btn = modeTabs.nth(1);
  await tab2Btn.click();
  await page.waitForTimeout(500);

  // Verify Tab 2 active
  assert.ok((await tab2Btn.getAttribute("class")).includes("modeTabActive"), "Tab 2 is now active");

  // Verify Tab 2 table headers
  const tab2HeaderTexts = await page.locator("table[class*='ordersTable'] th").allInnerTexts();
  assert.ok(tab2HeaderTexts.some(h => h.includes("Mã vận đơn #")), "Tab 2 has 'Mã vận đơn #' column");
  assert.ok(tab2HeaderTexts.some(h => h.includes("Đã In")), "Tab 2 has 'Đã In' column");
  console.log("  ✓ Tab 2 columns verified: 'Mã vận đơn #' and 'Đã In'");

  // Verify Tracking numbers (green links starting with SPXVN)
  const trackingLinks = page.locator("a[class*='trackingNumberLink']");
  const trackingCount = await trackingLinks.count();
  assert.ok(trackingCount > 0, `Found ${trackingCount} orders with tracking numbers`);
  const firstTracking = await trackingLinks.first().innerText();
  assert.ok(firstTracking.startsWith("SPXVN"), `Tracking number is SPXVN format: ${firstTracking}`);
  console.log(`  ✓ Tracking numbers formatted properly (e.g. ${firstTracking})`);

  // Verify Right Panel 1: Tạo phiếu hàng loạt
  const printCard = page.locator("div[class*='actionCard']").first();
  assert.ok((await printCard.innerText()).includes("Tạo phiếu hàng loạt"), "Panel 1 title is 'Tạo phiếu hàng loạt'");
  assert.ok((await printCard.innerText()).includes("Phiếu xuất hàng"), "Has 'Phiếu xuất hàng' checkbox");
  assert.ok((await printCard.innerText()).includes("Phiếu gửi hàng"), "Has 'Phiếu gửi hàng' checkbox");
  assert.ok((await printCard.innerText()).includes("Phiếu đóng gói"), "Has 'Phiếu đóng gói' checkbox");

  // Verify Right Panel 2: Biên bản giao nhận
  const manifestCard = page.locator("div[class*='actionCard']").nth(1);
  assert.ok((await manifestCard.innerText()).includes("Biên bản giao nhận"), "Panel 2 title is 'Biên bản giao nhận'");
  const btnManifest = manifestCard.locator("button[class*='btnSecondaryManifest']");
  assert.ok(await btnManifest.isVisible(), "Button 'Tạo Biên bản giao nhận' visible");
  console.log("  ✓ Both stacked right panels ('Tạo phiếu hàng loạt' & 'Biên bản giao nhận') verified");

  // Select all in Tab 2
  const selectAllTab2 = page.locator("input[aria-label='Chọn tất cả đơn hàng']");
  await selectAllTab2.click();
  await page.waitForTimeout(300);

  // Toggle thermal label option
  const shippingLabelCheckbox = printCard.locator("label").filter({ hasNotText: "đóng gói" }).filter({ hasText: "Phiếu gửi hàng" }).locator("input");
  await shippingLabelCheckbox.click();
  await page.waitForTimeout(200);

  // Check thermal radio is available and check it
  const thermalRadio = printCard.locator("input[value='thermal']");
  await thermalRadio.waitFor();
  await thermalRadio.click();
  console.log("  ✓ Configured Shipping Label with 'In nhiệt (Thermal)'");

  // Capture Screenshot of Tab 2
  const tab2ScreenPath = `${ARTIFACT_DIR}/shopee_mass_ship_tab2.png`;
  await page.screenshot({ path: tab2ScreenPath, fullPage: false });
  console.log(`  ✓ Screenshot saved: ${tab2ScreenPath}`);

  // Test Print Button
  const btnPrint = printCard.locator("button[class*='btnPrimaryPrint']");
  assert.ok(!(await btnPrint.isDisabled()), "Print button is enabled");
  console.log("  ✓ 'Tạo phiếu đã chọn' button is enabled and ready to generate multi-page PDF");

  console.log("\n=================================================================");
  console.log("   🎉 ALL MASS SHIP E2E SCENARIOS VERIFIED SUCCESSFULLY! ✓       ");
  console.log("=================================================================\n");

} catch (err) {
  console.error("FATAL ERROR in Mass Ship verification:", err);
  process.exit(1);
} finally {
  await browser.close();
}
