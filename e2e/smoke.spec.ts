import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('homepage loads and shows header', async ({ page }) => {
    await page.goto('/pets');
    await expect(page).toHaveTitle(/TSUMUGI/);
    await expect(page.locator('header')).toBeVisible();
  });

  test('category navigation works', async ({ page }) => {
    await page.goto('/pets');
    await expect(page.locator('main')).toBeVisible();

    await page.goto('/family');
    await expect(page.locator('main')).toBeVisible();

    await page.goto('/kids');
    await expect(page.locator('main')).toBeVisible();
  });

  test('info pages load', async ({ page }) => {
    for (const path of ['/pricing', '/faq', '/support', '/contact']) {
      await page.goto(path);
      await expect(page.locator('main')).toBeVisible();
    }
  });

  test('legal pages load', async ({ page }) => {
    for (const path of ['/legal', '/terms', '/privacy', '/shipping', '/returns', '/company']) {
      await page.goto(path);
      await expect(page.locator('main')).toBeVisible();
    }
  });

  test('404 page for unknown route', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    await expect(page.getByText('ページが見つかりません')).toBeVisible();
  });

  test('root redirects to /pets', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('/pets');
    await expect(page).toHaveURL('/pets');
  });
});
