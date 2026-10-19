const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'));
let server;
let browser;
let origin;

const dateOffset = days => {
  const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + days);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

test.before(async () => {
  server = http.createServer((request, response) => {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(html);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
});
test.after(async () => {
  await browser?.close();
  if (server?.listening) await new Promise(resolve => server.close(resolve));
});

test('real Chromium layout stays inside its grid at desktop, tablet, and phone widths', async t => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  t.after(() => page.close());
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(origin);

  for (const width of [1440, 1100, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    if (width <= 960) await page.waitForFunction(() => document.querySelector('#side-nav').getAttribute('aria-hidden') === 'true');
    const report = await page.evaluate(viewportWidth => {
      const rect = element => {
        const r = element.getBoundingClientRect();
        return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
      };
      const intersection = (a, b) => Math.min(a.right, b.right) - Math.max(a.x, b.x) > 1
        && Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > 1;
      const panel = document.querySelector('.panel');
      const heading = panel.querySelector('.panel-head > div:first-child');
      const tools = panel.querySelector('.list-tools');
      const visibleChildren = [...document.querySelector('.case').children]
        .filter(element => getComputedStyle(element).display !== 'none');
      const childRects = visibleChildren.map(rect);
      return {
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        headingToolsOverlap: intersection(rect(heading), rect(tools)),
        listToolsWidth: rect(tools).width,
        panelWidth: rect(panel).width,
        caseColumnOverlap: childRects.some((a, i) => childRects.slice(i + 1).some(b => intersection(a, b))),
        dueTextClipped: (() => {
          const due = document.querySelector('.case-action');
          return getComputedStyle(due).display !== 'none' && due.scrollWidth > due.clientWidth + 1;
        })(),
        smallScreenMenuVisible: viewportWidth > 960 || getComputedStyle(document.querySelector('#nav-toggle')).display !== 'none',
        drawerStartsClosed: viewportWidth > 960 || document.querySelector('#side-nav').getAttribute('aria-hidden') === 'true',
      };
    }, width);
    assert.equal(report.scrollWidth, width, `${width}px viewport should not have horizontal page overflow`);
    assert.equal(report.headingToolsOverlap, false, `${width}px panel title and search should not overlap`);
    assert.equal(report.caseColumnOverlap, false, `${width}px case fields should occupy separate columns`);
    assert.equal(report.dueTextClipped, false, `${width}px due label should fit its column`);
    assert.equal(report.smallScreenMenuVisible, true, 'small screens expose a visible menu control');
    assert.equal(report.drawerStartsClosed, true, 'navigation drawer starts closed on small screens');
    if (width <= 700) assert.ok(report.listToolsWidth >= report.panelWidth - 40, 'phone search uses the panel width');
  }
  assert.deepEqual(errors, [], 'page has no uncaught browser errors');
});

test('responsive navigation drawer opens, traps focus, filters, and closes accessibly', async t => {
  const page = await browser.newPage({ viewport: { width: 768, height: 900 } });
  t.after(() => page.close());
  await page.goto(origin);
  const menu = page.locator('#nav-toggle');
  await menu.click();
  await page.waitForFunction(() => document.querySelector('#side-nav').classList.contains('is-open'));
  await page.waitForFunction(() => document.activeElement?.id === 'nav-close');
  assert.equal(await page.locator('#side-nav').getAttribute('aria-modal'), 'true');
  assert.equal(await page.locator('#main-content').getAttribute('aria-hidden'), 'true');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'nav-close');
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).overflow), 'hidden');

  await page.locator('#reset-demo').focus();
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'nav-close', 'Tab wraps within the drawer');
  await page.locator('[data-filter="partial"]').click();
  await page.waitForFunction(() => !document.querySelector('#side-nav').classList.contains('is-open'));
  assert.equal(await page.locator('[data-filter="partial"]').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'nav-toggle');
  assert.equal(await page.locator('#main-content').getAttribute('aria-hidden'), 'false');

  await menu.click();
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.querySelector('#side-nav').getAttribute('aria-hidden') === 'true');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'nav-toggle');
  await menu.click();
  await page.locator('#nav-backdrop').click({ position: { x: 350, y: 450 } });
  await page.waitForFunction(() => !document.querySelector('#side-nav').classList.contains('is-open'));
});

test('case can be reconciled through the real Chromium interface', async t => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  t.after(() => page.close());
  await page.goto(origin);
  await page.locator('#add-top').click();
  await page.locator('#item').fill('Canvas backpack');
  await page.locator('#store').fill('Field Supply');
  await page.locator('#purchased').fill(dateOffset(-5));
  await page.locator('#deadline').fill(dateOffset(10));
  await page.locator('#expected').fill('120.00');
  await page.locator('#currency').fill('USD');
  await page.getByRole('button', { name: 'Save case' }).click();
  const caseButton = page.getByRole('button', { name: /Open Canvas backpack from Field Supply/ });
  await caseButton.waitFor();
  await caseButton.click();
  await page.getByRole('button', { name: /Record the return|Record return/ }).click();
  await page.locator('#returned-on').fill(dateOffset(-2));
  await page.locator('#tracking').fill('Locker receipt 12');
  await page.getByRole('button', { name: 'Save return' }).click();

  await page.getByRole('button', { name: /Open Canvas backpack from Field Supply/ }).click();
  await page.getByRole('button', { name: /Record refund/ }).click();
  await page.locator('#received-amount').fill('100');
  await page.locator('#received-date').fill(dateOffset(-1));
  await page.getByRole('button', { name: 'Save payment' }).click();
  await page.getByRole('button', { name: /Open Canvas backpack from Field Supply/ }).waitFor();
  await page.getByRole('button', { name: /Open Canvas backpack from Field Supply/ }).click();
  await page.getByText('$20.00', { exact: true }).waitFor();
  assert.match(await page.locator('#detail-content').innerText(), /Still owed\s+\$20\.00/);
  assert.match(await page.locator('#detail-content').innerText(), /Locker receipt 12/);
  await page.getByRole('button', { name: /Record refund/ }).click();
  await page.locator('#received-amount').fill('20');
  await page.locator('#received-date').fill(dateOffset(0));
  await page.getByRole('button', { name: 'Save payment' }).click();
  await page.locator('.case[aria-label*="Canvas backpack"][aria-label*="Resolved"]').waitFor();
});

test('case search includes payment-history text without clearing the active filter', async t => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  t.after(() => page.close());
  await page.goto(origin);
  const partialFilter = page.locator('[data-filter="partial"]');
  await partialFilter.click();
  assert.equal(await partialFilter.getAttribute('aria-pressed'), 'true');
  await page.locator('#case-search').fill('Partial refund received');
  const camera = page.getByRole('button', { name: /Open Compact camera from Frame & Field/ });
  await camera.waitFor();
  assert.equal(await page.locator('#case-list button.case').count(), 1);
  assert.equal(await partialFilter.getAttribute('aria-pressed'), 'true', 'search preserves the selected outstanding-refunds filter');
  await page.locator('#case-search').fill('');
  assert.equal(await partialFilter.getAttribute('aria-pressed'), 'true', 'clearing search does not reset the filter');
  assert.equal(await page.getByRole('button', { name: /Open Desk lamp/ }).count(), 0, 'resolved cases remain excluded by the active filter');
});

test('copied factual follow-up is visible for review with reconciled amounts', async t => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  t.after(() => page.close());
  await page.goto(origin);
  await page.getByRole('button', { name: /Open Compact camera from Frame & Field/ }).click();
  await page.getByRole('button', { name: 'Copy factual follow-up' }).click();
  const preview = page.locator('#followup-preview');
  await preview.waitFor({ state: 'visible' });
  const message = await page.locator('#followup-text').innerText();
  assert.match(message, /Hello Frame & Field/);
  assert.match(message, /expected \$279\.00/);
  assert.match(message, /received \$250\.00/);
  assert.match(message, /remaining amount is \$29\.00/);
});

test('export downloads a versioned JSON backup with the payment ledger', async t => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  t.after(() => page.close());
  await page.goto(origin);
  await page.locator('#data-menu summary').click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#export-cases').click(),
  ]);
  assert.match(download.suggestedFilename(), /^returnsignal-backup-v1-\d{4}-\d{2}-\d{2}\.json$/);
  const filePath = await download.path();
  const payload = JSON.parse(await fs.promises.readFile(filePath, 'utf8'));
  assert.equal(payload.format, 'returnsignal-backup');
  assert.equal(payload.version, 1);
  assert.equal(payload.cases.length, 3);
  const camera = payload.cases.find(item => item.item === 'Compact camera');
  assert.equal(camera.received, 250);
  assert.deepEqual(camera.payments.map(payment => [payment.amount, payment.note]), [[250, 'Partial refund received']]);
});

test('restore accepts the known-good refund fixture and replaces the casebook after confirmation', async t => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  t.after(() => page.close());
  await page.goto(origin);
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#backup-file').setInputFiles(path.join(__dirname, 'fixtures', 'testsprite-refund-case.json'));
  await page.waitForFunction(() => document.querySelectorAll('#case-list button.case').length === 1);
  const restored = page.getByRole('button', { name: /Open Sample travel mug from Example Outfitters/ });
  await restored.waitFor();
  await restored.click();
  assert.match(await page.locator('#detail-content').innerText(), /Still owed\s+\$20\.00/);
  assert.match(await page.locator('#detail-content').innerText(), /First partial refund/);
  assert.match(await page.locator('#detail-content').innerText(), /Refund overdue/);
});

test('dialog keeps keyboard focus inside and returns focus to its trigger', async t => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  t.after(() => page.close());
  await page.goto(origin);
  const trigger = page.locator('#add-top');
  await trigger.click();
  await page.locator('#item').waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.activeElement?.id === 'item');
  await page.locator('#case-form button[type="submit"]').focus();
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Close', 'Tab wraps from the last control to the dialog close control');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('#case-overlay').classList.contains('open'));
  assert.equal(await page.evaluate(() => document.activeElement.id), 'add-top', 'Escape restores focus to the opener');
});
