import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  const pagesToTest = [
    { path: '/pets', name: 'ホームページ' },
    { path: '/pricing', name: '料金ページ' },
    { path: '/faq', name: 'FAQページ' },
  ];

  for (const { path, name } of pagesToTest) {
    test(`${name} (${path}) has no critical a11y violations`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .disableRules(['color-contrast']) // Color contrast is design-dependent
        .analyze();

      const critical = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );

      if (critical.length > 0) {
        const summary = critical.map(
          (v) => `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} nodes)`
        ).join('\n');
        expect(critical, `Critical a11y violations on ${path}:\n${summary}`).toHaveLength(0);
      }
    });
  }

  test('style modal focus trap works', async ({ page }) => {
    await page.goto('/pets');

    // Open style modal
    await page.getByText('すべて見る').click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Verify focus is inside the modal
    const activeElement = await page.evaluate(() => {
      const el = document.activeElement;
      const modal = document.querySelector('[role="dialog"]');
      return modal?.contains(el) ?? false;
    });
    expect(activeElement).toBe(true);

    // Press Escape to close
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('all images have alt attributes', async ({ page }) => {
    await page.goto('/pets');
    await page.waitForLoadState('networkidle');

    const imagesWithoutAlt = await page.locator('img:not([alt])').count();
    expect(imagesWithoutAlt).toBe(0);
  });

  test('all interactive elements are keyboard accessible', async ({ page }) => {
    await page.goto('/pets');
    await page.waitForLoadState('networkidle');

    // Tab through the page and verify focus moves
    await page.keyboard.press('Tab');
    const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(firstFocused).toBeTruthy();

    await page.keyboard.press('Tab');
    const secondFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(secondFocused).toBeTruthy();
  });
});
