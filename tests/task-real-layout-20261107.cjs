'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const { createInterface } = require('node:readline');
const { chromium } = require('playwright');

const mock = fs.readFileSync('tests/duty-ui.cjs', 'utf8')
  .split('const mock=')[1].split('\n(async()=>')[0].replace(/;\s*$/, '');

function serverAddress(server) {
  return new Promise((resolve, reject) => {
    const output = createInterface({ input: server.stdout });
    output.on('line', line => {
      const address = line.match(/port (\d+)/);
      if (address) {
        output.close();
        resolve(`http://127.0.0.1:${address[1]}/`);
      }
    });
    server.once('error', reject);
    server.once('exit', code => reject(new Error('Tasks fixture server exited with status ' + code)));
  });
}

(async () => {
  const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], {
    stdio: ['ignore', 'pipe', 'ignore']
  });
  let browser;
  try {
    const address = await serverAddress(server);
    browser = await chromium.launch({
      executablePath: process.env.FFH_CHROMIUM || '/usr/bin/google-chrome',
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block',
      geolocation: { latitude: 3.139, longitude: 101.687 }, permissions: ['geolocation']
    });
    page.setDefaultTimeout(10000);
    await page.route('https://cdn.jsdelivr.net/npm/@supabase/**', route => route.fulfill({
      contentType: 'text/javascript', body: `(${mock})("M21954",true)`
    }));
    await page.route('https://cdn.onesignal.com/**', route => route.fulfill({
      contentType: 'text/javascript', body: ''
    }));
    await page.goto(address, { waitUntil: 'domcontentloaded' });
    const launch = page.locator('.homeGrid [data-page=tasks]');
    await launch.waitFor();
    if (await page.locator('#ffhEntryAllow').isVisible()) {
      await page.locator('#ffhEntryAllow').click();
      await page.locator('#ffhEntryPermissions').waitFor({ state: 'hidden' });
    }
    await launch.click();

    const panel = page.getByRole('region', { name: 'Tasks & Actions' });
    await panel.waitFor();
    for (const label of ['Zone', 'Assigned To']) {
      await panel.getByRole('button', { name: label, exact: true }).click();
      const search = page.locator('.ffPickerSearch');
      await search.waitFor();
      assert.ok(await page.locator('.ffPickerOption').count(), label + ' options');
      await page.locator('.ffTaskArtworkPicker').getByRole('button', { name: 'CLOSE', exact: true }).click();
      await search.waitFor({ state: 'hidden' });
    }
    await panel.getByRole('button', { name: 'Date Range', exact: true }).click();
    const dates = page.getByRole('dialog', { name: 'Date Range' });
    await dates.waitFor();
    await dates.getByRole('button', { name: 'Close' }).click();
    await dates.waitFor({ state: 'hidden' });

    const status = panel.getByRole('combobox', { name: 'Task Status' });
    await status.selectOption('done');
    const search = panel.getByRole('searchbox', { name: 'Search task, outlet or SR', exact: true });
    await status.selectOption('');
    await search.fill('no match in the test fixture');
    assert.equal(await panel.locator('.ffTaskArtRow').count(), 0);
    await search.clear();
    await panel.getByRole('button', { name: /QA live pending visit/i }).waitFor();

    for (const scope of ['My Tasks', 'Team Tasks']) {
      const button = panel.getByRole('button', { name: scope, exact: true });
      await button.click();
      assert.equal(await button.getAttribute('aria-pressed'), 'true');
    }
    for (const label of ['Expand task categories and details', 'Expand task list and details']) {
      await panel.getByRole('button', { name: label, exact: true }).click();
      const expanded = page.getByRole('dialog', { name: 'Task List and Details' });
      await expanded.getByRole('heading', { name: 'QA live pending visit' }).waitFor();
      await expanded.getByRole('button', { name: 'Close', exact: true }).click();
      await expanded.waitFor({ state: 'hidden' });
    }
    await panel.getByRole('button', { name: 'Assign New Task', exact: true }).click();
    await page.locator('.ffTaskModalBody [name=title]').waitFor();
    await page.getByRole('button', { name: 'Close editor', exact: true }).click();
    await page.locator('.ffTaskModalBody').waitFor({ state: 'hidden' });
    await panel.getByRole('button', { name: 'Update Status', exact: true }).click();
    const update = page.getByRole('dialog', { name: 'Update Status' });
    await update.getByRole('button', { name: 'Close', exact: true }).click();
    await update.waitFor({ state: 'hidden' });

    const nav = await page.locator('nav.bottom').boundingBox();
    const main = await page.locator('main.wrap').boundingBox();
    assert.ok(main.y + main.height <= nav.y + 1, 'Task content stays above navigation');
    await page.screenshot({ path: '/tmp/ffh-actual-task-layout-debug.png' });
    console.log('PASS Tasks artwork, filters, search, scope, full-screen views, assign and update forms, and shared navigation clearance');
  } finally {
    server.kill();
    await browser?.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
