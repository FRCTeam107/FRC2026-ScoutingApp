const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://frc-2026-scouting-app-cbba.vercel.app/');

  // Fill setup stage
  await page.fill('input[placeholder="107"]', '1234'); // Team #
  await page.fill('input[type="number"]:nth-of-type(2)', '1'); // Match #
  await page.click('button:has-text("Start Match")');

  // Fill auto stage
  await page.click('input[name="autonFocus"][value="shooting"]');
  await page.fill('input[type="range"]', '75'); // Auto Accuracy (if slider)
  await page.click('button:has-text("Teleop")');

  // Fill teleop stage
  await page.click('input[name="endgameFocus"][value="climb"]');
  await page.click('button:has-text("Finish")');

  // Fill post-match stage and submit
  await page.fill('textarea[placeholder*="Match observations"]', 'Great match!');
  await page.click('button:has-text("Save & Next Match")');

  await browser.close();
})();
