import { test, expect } from '@playwright/test';

// Helper: bypass the password gate by injecting the session flag directly.
async function bypassAuth(page) {
  await page.goto('/');
  await page.evaluate(() => sessionStorage.setItem('scouting_auth', '1'));
}

test.describe('Admin → Analytics E2E', () => {
  test('loading test data in admin shows match records in analytics', async ({ page }) => {
    // ── Step 1: authenticate ─────────────────────────────────────────────
    await bypassAuth(page);

    // ── Step 2: navigate to admin ────────────────────────────────────────
    await page.goto('/admin');
    await expect(page.locator('.admin-page, .manager-page, main').first()).toBeVisible();

    // ── Step 3: click "Load Test Data" on the Event Setup tab ────────────
    const loadBtn = page.getByRole('button', { name: /load test data/i });
    await expect(loadBtn).toBeVisible();
    await loadBtn.click();

    // Confirm test data is now active (button label flips to "Unload")
    await expect(page.getByRole('button', { name: /unload test data/i })).toBeVisible();

    // ── Step 4: navigate to analytics ───────────────────────────────────
    await page.goto('/analytics');

    // ── Step 5: verify match records are present ─────────────────────────
    // The "Match Records" stat card should show 72 (12 qual matches × 6 teams)
    const matchRecordsStat = page
      .locator('.stat-card')
      .filter({ has: page.locator('.stat-label', { hasText: 'Match Records' }) })
      .locator('.stat-value');
    await expect(matchRecordsStat).toHaveText('72');

    // The "Match Scouted" stat card should show 12 unique teams
    const matchScoutedStat = page
      .locator('.stat-card')
      .filter({ has: page.locator('.stat-label', { hasText: 'Match Scouted' }) })
      .locator('.stat-value');
    await expect(matchScoutedStat).toHaveText('12');

    // ── Step 6: verify team rankings table is populated ──────────────────
    // At least one team row should be visible in the rankings table
    const rankingsTable = page.locator('.rankings-table table tbody tr').first();
    await expect(rankingsTable).toBeVisible();

    // Team 107 (always in the test event) should appear in the rankings
    await expect(page.locator('.rankings-table').getByText('107')).toBeVisible();

    // The "No event loaded" empty state should NOT appear
    await expect(page.locator('text=No event loaded')).not.toBeVisible();
  });
});
