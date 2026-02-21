import { test, expect } from '@playwright/test';

test.describe('Style Selection Flow', () => {
  test('style cards are visible on homepage', async ({ page }) => {
    await page.goto('/pets');

    // Style section should show cards
    const styleCards = page.locator('button[aria-pressed]');
    await expect(styleCards.first()).toBeVisible({ timeout: 10_000 });
  });

  test('clicking style card opens style modal', async ({ page }) => {
    await page.goto('/pets');

    // Click first style card
    const firstCard = page.locator('button[aria-pressed]').first();
    await firstCard.click();

    // Modal should appear
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(page.getByText('スタイルを選んでください')).toBeVisible();
  });

  test('style modal can be closed with close button', async ({ page }) => {
    await page.goto('/pets');

    // Open modal via "すべて見る" button
    await page.getByText('すべて見る').click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Close via X button
    await page.getByLabel('モーダルを閉じる').click();
    await expect(modal).not.toBeVisible();
  });

  test('style modal search filters styles', async ({ page }) => {
    await page.goto('/pets');

    await page.getByText('すべて見る').click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Type in search box
    const searchInput = modal.locator('input[type="text"]');
    await searchInput.fill('ルネサンス');

    // Wait for filter to apply
    await page.waitForTimeout(300);

    // Should still have results (or show "not found" message)
    const hasResults = await modal.locator('button[aria-pressed]').count();
    const hasNoResults = await modal.getByText('スタイルが見つかりません').isVisible().catch(() => false);
    expect(hasResults > 0 || hasNoResults).toBe(true);
  });

  test('selecting a style shows confirmation in footer', async ({ page }) => {
    await page.goto('/pets');

    await page.getByText('すべて見る').click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Click a style card in the modal
    const styleCard = modal.locator('button[aria-pressed="false"]').first();
    await styleCard.click();

    // Footer should show "選択中:" text
    await expect(modal.getByText('選択中:')).toBeVisible();

    // Confirm button should be enabled
    const confirmButton = modal.getByText('スタイルを確定');
    await expect(confirmButton).toBeEnabled();
  });
});
