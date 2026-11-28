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

test('axe finds no WCAG 2.2 AA violations across initial, drawer, postcard, and tutorial views', async ({ browser }) => {
  const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

  // 1. Fresh context with Tutorial modal visible
  const freshCtx = await browser.newContext();
  const tutorialPage = await freshCtx.newPage();
  await tutorialPage.goto('/index.html');
  await expect(tutorialPage.locator('#tutorialOverlay')).toBeVisible();
  const tutAxe = await new AxeBuilder({ page: tutorialPage }).withTags(tags).analyze();
  expect(tutAxe.violations).toEqual([]);
  await freshCtx.close();

  // 2. Main playfield, Customizer drawer, and Serene Postcard interactive views
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('gb:tutorial-seen', 'true');
    localStorage.setItem('gb:schema', '3');
  });
  await page.goto('/index.html');
  const startAxe = await new AxeBuilder({ page }).withTags(tags).analyze();
  expect(startAxe.violations).toEqual([]);

  await page.locator('#drawerToggle').click();
  await expect(page.locator('#customizerDrawer')).toBeVisible();
  const drawerAxe = await new AxeBuilder({ page }).withTags(tags).analyze();
  expect(drawerAxe.violations).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(page.locator('#customizerDrawer')).toBeHidden();

  await page.locator('#game').focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('KeyP');
  await expect(page.locator('#postcardCopyBtn')).toBeVisible();
  const postcardAxe = await new AxeBuilder({ page }).withTags(tags).analyze();
  expect(postcardAxe.violations).toEqual([]);
  await ctx.close();
});

test('tutorial modal blocks global shortcuts and dismisses cleanly on Escape', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/index.html');
  const overlay = page.locator('#tutorialOverlay');
  await expect(overlay).toBeVisible();
  // Clicking the card backdrop moves focus off the button; global shortcuts must still stay blocked.
  await page.locator('.tutorial-card h3').click();
  await page.keyboard.press('KeyR');
  await expect(overlay).toBeVisible();
  await expect(page.locator('#pauseToggle')).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(overlay).toBeHidden();
  await expect(page.locator('#game')).toBeFocused();
  await context.close();
});

test('Serene Postcard pauses on P, stays paused on Escape, and clears on restart', async ({ page }) => {
  await page.goto('/index.html');
  await page.locator('#game').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#srStatus')).toContainText(/Run started/i);
  await page.keyboard.press('KeyP');
  await expect(page.locator('#postcardButton')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#postcardCopyBtn')).toBeVisible();
  await expect(page.locator('#pauseToggle')).toHaveAttribute('aria-pressed', 'true');
  // Escape exits Postcard while remaining safely paused.
  await page.keyboard.press('Escape');
  await expect(page.locator('#postcardButton')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#postcardCopyBtn')).toBeHidden();
  await expect(page.locator('#pauseToggle')).toHaveAttribute('aria-pressed', 'true');
  // Restart while in Postcard clears Postcard and hides the Copy button.
  await page.keyboard.press('KeyP');
  await expect(page.locator('#postcardCopyBtn')).toBeVisible();
  await page.keyboard.press('KeyR');
  await expect(page.locator('#postcardButton')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#postcardCopyBtn')).toBeHidden();
});

test('earned achievements persist and stay visually unlocked across reload', async ({ page }) => {
  await page.goto('/index.html');
  await page.locator('#drawerToggle').click();
  for (const theme of ['midnight', 'rain', 'aurora', 'meadow']) {
    await page.locator(`.theme-btn[data-theme="${theme}"]`).click();
  }
  await expect(page.locator('#achThemeExplorer')).toHaveClass(/\bunlocked\b/);
  await page.reload();
  await page.locator('#drawerToggle').click();
  await expect(page.locator('#achThemeExplorer')).toHaveClass(/\bunlocked\b/);
});
