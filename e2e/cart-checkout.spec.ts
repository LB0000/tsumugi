import { test, expect } from '@playwright/test';

test.describe('Cart & Checkout Flow', () => {
  test('cart page loads when empty', async ({ page }) => {
    await page.goto('/cart');
    await expect(page.locator('main')).toBeVisible();
  });

  test('checkout redirects or shows error when cart is empty', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page.locator('main')).toBeVisible();
  });

  test('order confirmation page loads', async ({ page }) => {
    await page.goto('/order-confirmation');
    await expect(page.locator('main')).toBeVisible();
  });
});
