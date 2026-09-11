/* global window, document, Event */
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 844, height: 340 },
  screen: { width: 844, height: 390 },
  hasTouch: true,
  isMobile: true,
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const url = process.env.TEST_URL ?? 'http://localhost:43210';
// Playwright resets screen to viewport on rotation; keep a real phone's screen size.
await context.addInitScript(() => {
  Object.defineProperties(window.screen, {
    width: { configurable: true, get: () => 844 },
    height: { configurable: true, get: () => 390 },
  });
});
try {
  await page.goto(url);
  await page.getByRole('button', { name: '开始航行' }).waitFor();
  const button = page.getByRole('button', { name: '进入全屏', exact: true });
  await expect(button).toBeVisible();
  // Exercise the real browser API, including restoring the entry after exit.
  await button.tap();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await expect(button).toHaveCount(0);
  await page.evaluate(() => document.exitFullscreen());
  await expect(button).toBeVisible();
  await page.getByRole('button', { name: '开始航行' }).tap();
  await page.getByRole('button', { name: '暂停', exact: true }).tap();
  await button.tap();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await page.evaluate(() => document.exitFullscreen());
  await page.setViewportSize({ width: 390, height: 794 });
  await expect(button).toHaveCount(0);
  await page.setViewportSize({ width: 844, height: 340 });
  await expect(button).toBeVisible();

  // A rejected/unsupported request stays recoverable and does not interrupt play.
  await page.evaluate(() => {
    document.documentElement.requestFullscreen = () => Promise.reject(new Error('Denied'));
  });
  await button.tap();
  await expect(page.getByRole('status').filter({ hasText: '未能进入全屏' })).toBeVisible();
  await expect(button).toBeEnabled();
  await page.evaluate(() => {
    document.documentElement.requestFullscreen = undefined;
    document.documentElement.webkitRequestFullscreen = undefined;
  });
  await button.tap();
  await expect(page.getByRole('status').filter({ hasText: '不支持网页全屏' })).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.webkitRequestFullscreen = () => {
      Object.defineProperty(document, 'webkitFullscreenElement', {
        configurable: true,
        value: document.documentElement,
      });
      document.dispatchEvent(new Event('webkitfullscreenchange'));
    };
  });
  await button.tap();
  await expect(button).toHaveCount(0);
  await page.evaluate(() => {
    delete document.webkitFullscreenElement;
    document.dispatchEvent(new Event('webkitfullscreenchange'));
  });
  await expect(button).toBeVisible();

  // Native fullscreen has no DOM fullscreenElement. Check the screen-sized viewport.
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(button).toHaveCount(0);
  await page.setViewportSize({ width: 844, height: 340 });
  await page.evaluate(() => {
    Object.defineProperty(window.navigator, 'standalone', { configurable: true, value: true });
    window.dispatchEvent(new Event('resize'));
  });
  await expect(button).toHaveCount(0);

  // Browser embedding still needs fullscreen; an already fullscreen host does not.
  const hostUrl = new URL('/fullscreen-host', url).href;
  await page.route(hostUrl, (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<meta name="viewport" content="width=device-width,initial-scale=1"><iframe src="${url}" allow="fullscreen" style="position:absolute;inset:0;width:100%;height:290px;border:0"></iframe>`,
    }),
  );
  await page.goto(hostUrl);
  const frameButton = page.frameLocator('iframe').getByRole('button', { name: '进入全屏' });
  await expect(frameButton).toBeVisible();
  await frameButton.tap();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await expect(frameButton).toHaveCount(0);
  await page.evaluate(() => document.exitFullscreen());
  await expect(frameButton).toBeVisible();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(frameButton).toHaveCount(0);

  const desktop = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await desktop.goto(url);
  await desktop.getByRole('button', { name: '开始航行' }).waitFor();
  await expect(desktop.getByRole('button', { name: '进入全屏' })).toHaveCount(0);
  assert.deepEqual(errors, []);
  console.log(
    'Fullscreen: native API, exit, paused controls, rotation, failure, WebKit fallback, native/PWA, iframe and desktop passed.',
  );
} finally {
  await browser.close();
}
