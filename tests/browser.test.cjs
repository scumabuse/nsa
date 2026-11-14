const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const { chromium } = require(process.env.ORBIT_PLAYWRIGHT || 'playwright');

const base = process.env.ORBIT_URL || 'http://127.0.0.1:8787/';

async function run() {
  const browser = await chromium.launch({
    ...(process.env.ORBIT_BROWSER ? { executablePath: process.env.ORBIT_BROWSER } : {}),
  });
  try {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const id = (name) => page.locator('#' + name);
    const visible = (locator) => locator.waitFor({ state: 'visible', timeout: 5000 });
    const add = async (metric, values, note = '') => {
      await page.locator('[data-add]:visible').click();
      await id('entry-metric').selectOption(metric);
      for (const [key, value] of Object.entries(values)) {
        await page.locator('#entry-values [name="' + key + '"]').fill(String(value));
      }
      await id('entry-note').fill(note);
    };
    const save = async () => {
      await id('entry-dialog').getByRole('button', { name: 'Save' }).click();
      await id('entry-dialog').waitFor({ state: 'hidden', timeout: 5000 });
    };
    await page.goto(base);
    assert.equal(await id('metrics').locator('.metric-row').count(), 6);
    assert.match(await id('attention').innerText(), /Sleep/);
    assert.equal(await id('trend').locator('polyline').count(), 2);
    await id('period').selectOption('all');
    assert.match(await id('trend').innerText(), /Readings: 10/);
    await id('review-scenario').click();
    assert.equal(await id('trend-metric').inputValue(), 'sleep');
    assert.match(await id('trend').innerText(), /Latest: 5.8 h/);
    await page.getByRole('link', { name: 'NASA data', exact: true }).click();
    await visible(id('radiation-title'));
    assert.match(await id('rad-reading').innerText(), /8\.9826 µGy\/h/);
    await id('rad-detector').selectOption('e');
    assert.match(await id('rad-reading').innerText(), /8\.53545 µGy\/h/);
    await id('rad-observation').selectOption('01');
    assert.match(await id('rad-reading').innerText(), /02:57:25 UTC · 8\.48693/);
    assert.equal(await id('rad-table').locator('tr').count(), 14);
    assert.equal(await id('rad-chart').locator('circle').count(), 14);
    await page.getByRole('link', { name: 'Overview', exact: true }).click();
    await id('trend-metric').selectOption('glucose');
    await id('trend-context').selectOption('postmeal');
    assert.match(await id('trend').innerText(), /No readings match/);
    await page.getByRole('link', { name: 'Log', exact: true }).click();
    await visible(id('journal-title'));
    assert.equal(await id('entries').locator('.entry').count(), 8);
    const firstPageDate = await id('entries').locator('time').first().getAttribute('datetime');
    await id('entries').getByRole('button', { name: '2', exact: true }).click();
    assert.equal(await id('entries').locator('[aria-current="page"]').innerText(), '2');
    assert.notEqual(await id('entries').locator('time').first().getAttribute('datetime'), firstPageDate);
    await id('mode').selectOption('personal');
    assert.equal(await id('export').isDisabled(), true);

    await add('bp', { systolic: 80, diastolic: 90 });
    await id('entry-dialog').getByRole('button', { name: 'Save' }).click();
    await visible(id('entry-error'));
    assert.match(await id('entry-error').innerText(), /Systolic pressure/);
    await page.locator('[name=systolic]').fill('125');
    await save();

    await add('glucose', { value: 95 }, '<img src=x onerror=alert(1)>');
    await id('entry-context').selectOption('fasting');
    await save();
    await id('journal-filter').selectOption('glucose');
    assert.equal(await id('entries').locator('.entry').count(), 1);
    assert.equal(await id('entries').locator('img').count(), 0);
    assert.match(await id('entries').innerText(), /<img src=x/);
    await id('entries').getByLabel('Reading actions').click();
    await id('entries').getByRole('button', { name: 'Edit' }).click();
    await page.locator('[name=value]').fill('97');
    await id('entry-urgent').check();
    await visible(id('urgent-hint'));
    await save();
    await page.getByRole('link', { name: 'Overview', exact: true }).click();
    await visible(id('overview-title'));
    assert.match(await id('attention').innerText(), /onboard medic/);
    await id('metrics').locator('[data-metric="glucose"]').click();
    const glucose = id('metric-detail').locator('article').filter({ has: page.getByRole('heading', { name: 'Glucose', exact: true }) });
    await glucose.getByRole('button', { name: 'View trend' }).click();
    assert.equal(await id('trend-context').inputValue(), 'fasting');
    assert.match(await id('trend').innerText(), /97/);
    await page.reload();
    assert.equal(await id('mode').inputValue(), 'personal');
    assert.match(await id('attention').innerText(), /Serious symptoms/);

    await page.getByRole('link', { name: 'Log', exact: true }).click();
    const downloadEvent = page.waitForEvent('download');
    await id('export').click();
    const download = await downloadEvent;
    const report = JSON.parse(await readFile(await download.path(), 'utf8'));
    assert.equal(report.mode, 'personal');
    assert.equal(report.entries.length, 2);
    assert.equal(report.entries.find((entry) => entry.metric === 'glucose').values.value, 97);
    assert.equal(report.latest.find((entry) => entry.metric === 'glucose').level, 'urgent');
    const handoffEvent = page.waitForEvent('download');
    await id('export-handoff').click();
    const handoff = await readFile(await (await handoffEvent).path(), 'utf8');
    assert.match(handoff, /PERSONAL LOG/);
    assert.match(handoff, /Glucose · 97 mg\/dL/);
    assert.ok(handoff.indexOf('Glucose') < handoff.indexOf('Blood pressure'));
    assert.doesNotMatch(handoff, /8\.53545|RAD_RDR/);
    const glucoseEntry = id('entries').locator('.entry').filter({ hasText: 'Glucose' });
    await glucoseEntry.getByLabel('Reading actions').click();
    await glucoseEntry.getByRole('button', { name: 'Delete' }).click();
    await id('delete-dialog').getByRole('button', { name: 'Cancel' }).click();
    assert.equal(await glucoseEntry.count(), 1);
    await glucoseEntry.getByLabel('Reading actions').click();
    await glucoseEntry.getByRole('button', { name: 'Delete' }).click();
    await id('delete-dialog').getByRole('button', { name: 'Delete', exact: true }).click();
    assert.equal(await glucoseEntry.count(), 0);

    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await context.setOffline(true);
    await page.reload();
    assert.equal(await id('entries').locator('.entry').count(), 1);
    await add('sleep', { value: 0 });
    await save();
    assert.match(await id('entries').locator('.entry').filter({ hasText: 'Sleep' }).innerText(), /0 h/);
    await page.getByRole('link', { name: 'Guide', exact: true }).click();
    await visible(id('guide-title'));
    assert.equal(await id('guide').locator('dt').count(), 5);
    await page.getByText('Blood pressure · mmHg', { exact: true }).click();
    assert.equal(await id('measurement-guide').locator('details[open]').count(), 1);
    await page.getByRole('link', { name: 'NASA data', exact: true }).click();
    await visible(id('radiation-title'));
    await page.reload();
    assert.match(await id('rad-reading').innerText(), /8\.9826 µGy\/h/);
    await context.setOffline(false);
    await id('mode').selectOption('demo');
    await page.getByRole('link', { name: 'Overview', exact: true }).click();
    assert.match(await id('attention').innerText(), /Sleep/);
    await add('pulse', { value: 84 });
    await save();
    await add('temp', { value: 36.8 });
    await save();
    await add('mood', { value: 5 });
    await save();
    await id('metrics').locator('[data-metric="mood"]').click();
    const moodCard = id('metric-detail').locator('article').filter({ has: page.getByRole('heading', { name: 'Mood', exact: true }) });
    await visible(moodCard);
    assert.match(await moodCard.locator('.metric-value').innerText(), /5/);
    await id('mode').selectOption('personal');
    await page.getByRole('link', { name: 'Log', exact: true }).click();
    assert.equal(await id('entries').locator('.entry').count(), 2);

    for (const width of [320, 390, 768, 1366]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ['overview', 'journal', 'guide', 'radiation']) {
        await page.evaluate((name) => { location.hash = name; }, route);
        await visible(id(route));
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route + ' overflows at ' + width);
      }
    }
    assert.deepEqual(errors, []);
    if (process.env.ORBIT_SCREENSHOT) {
      await id('mode').selectOption('demo');
      await page.goto(base + '#radiation');
      await page.screenshot({ path: process.env.ORBIT_SCREENSHOT, fullPage: true });
    }
    console.log('Browser checks passed: demo, form validation, CRUD, export, isolation, offline writes, navigation and 4 viewport sizes.');
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
