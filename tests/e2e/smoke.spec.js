import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('gb:tutorial-seen', 'true');
    localStorage.setItem('gb:schema', '3');
  });
});

test('playfield loads, flaps from the keyboard, and pauses', async ({ page }) => {
  await page.goto('/index.html');
  const canvas = page.locator('#game');
  await expect(canvas).toBeVisible();
  await expect(page.locator('#srStatus')).toContainText(/glide/i);
  await canvas.focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#srStatus')).toContainText(/Run started/i);
  await page.keyboard.press('Escape');
  await expect(page.locator('#pauseToggle')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('#pauseToggle')).toHaveAttribute('aria-pressed', 'false');
});

test('customizer traps focus and announces the daily seed', async ({ page }) => {
  await page.goto('/index.html');
  await page.locator('#drawerToggle').click();
  const drawer = page.locator('#customizerDrawer');
  await expect(drawer).toBeVisible();
  await expect(page.locator('#drawerClose')).toBeFocused();
  await page.locator('#dailySeedToggle').click();
  await expect(page.locator('#dailySeedStatus')).toContainText(/On/);
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
});

test('reduced motion is honored and gamepad help is exposed', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/index.html');
  await expect(page.locator('#controlHelp')).toContainText(/gamepad/i);
  const duration = await page.evaluate(() => getComputedStyle(document.body, '::before').animationDuration);
  expect(duration === '0.01ms' || duration === '0s').toBeTruthy();
});

test('axe finds no WCAG 2.2 AA violations', async ({ page }) => {
  await page.goto('/index.html');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
