/* global window */
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const root = path.resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const artifacts = new URL('../artifacts/', import.meta.url);
await mkdir(artifacts, { recursive: true });
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (!pathname.startsWith('/reef/')) {
      res.writeHead(404).end();
      return;
    }
    const file = path.resolve(root, pathname.slice(6) || 'index.html');
    if (!file.startsWith(root + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    const data = await readFile(file);
    res.writeHead(200, {
      'Content-Type':
        { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[
          path.extname(file)
        ] ?? 'application/octet-stream',
    });
    res.end(data);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 915, height: 412 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  const badResponses = [];
  page.on('response', (response) => {
    if (response.status() >= 400) badResponses.push(response.url());
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/reef/`);
  await page.getByRole('button', { name: '开始航行' }).waitFor();
  await page.screenshot({ path: fileURLToPath(new URL('production-start.png', artifacts)) });
  assert.equal(await page.evaluate(() => '__tidebreak' in window), false);
  await page.getByRole('button', { name: '开始航行' }).click();
  await context.setOffline(true);
  await page.mouse.move(455, 160);
  await page.mouse.down();
  await page.waitForTimeout(1200);
  await page.mouse.up();
  assert.equal(await page.getByLabel('开发性能统计').count(), 0);
  assert.notEqual(await page.getByTestId('timer').textContent(), '3:00');
  for (const [width, height] of [
    [740, 360],
    [915, 412],
    [1280, 720],
  ]) {
    await page.setViewportSize({ width, height });
    await page.screenshot({
      path: fileURLToPath(new URL(`production-${width}x${height}.png`, artifacts)),
    });
    const controls = await page.locator('.bottom button').evaluateAll((buttons) =>
      buttons.map((button) => {
        const r = button.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom };
      }),
    );
    assert.equal(controls.length, 9);
    for (const r of controls)
      assert.ok(
        r.w >= 44 &&
          r.h >= 44 &&
          r.x >= 0 &&
          r.y >= 0 &&
          r.right <= width + 0.5 &&
          r.bottom <= height + 0.5,
      );
  }
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  await page.getByRole('button', { name: '海域手册', exact: true }).click();
  await page.getByRole('dialog', { name: '海域手册' }).waitFor();
  assert.equal(await page.locator('.fish-guide > div').count(), 8);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '继续航行' }).click();
  assert.deepEqual(errors, []);
  assert.deepEqual(badResponses, []);
  const report = {
    subdirectory: '/reef/',
    offlineAfterLoad: true,
    debugExcluded: true,
    androidSizes: ['740x360', '915x412', '1280x720'],
    consoleErrors: errors,
    failedResponses: badResponses,
  };
  await writeFile(new URL('production-report.json', artifacts), JSON.stringify(report, null, 2));
  console.log('Production static checks passed:', JSON.stringify(report));
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
