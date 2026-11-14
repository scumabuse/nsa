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
      await id('entry-dialog').getByRole('button', { name: 'Сохранить' }).click();
      await id('entry-dialog').waitFor({ state: 'hidden', timeout: 5000 });
    };
    await page.goto(base);
    assert.equal(await id('metrics').locator('.card').count(), 6);
    assert.match(await id('attention').innerText(), /Сон/);
    assert.equal(await id('trend').locator('polyline').count(), 2);
    await id('period').selectOption('all');
    assert.match(await id('trend').innerText(), /Записей: 10/);
    await id('trend-metric').selectOption('glucose');
    await id('trend-context').selectOption('postmeal');
    assert.match(await id('trend').innerText(), /нет измерений/);
    await page.getByRole('link', { name: 'Журнал', exact: true }).click();
    await visible(id('journal-title'));
    assert.equal(await id('entries').locator('.entry').count(), 20);
    await id('entries').getByRole('button', { name: 'Далее' }).click();
    assert.match(await id('entries').innerText(), /2 \/ 3/);
    await id('mode').selectOption('personal');
    assert.equal(await id('export').isDisabled(), true);

    await add('bp', { systolic: 80, diastolic: 90 });
    await id('entry-dialog').getByRole('button', { name: 'Сохранить' }).click();
    await visible(id('entry-error'));
    assert.match(await id('entry-error').innerText(), /Систолическое давление/);
    await page.locator('[name=systolic]').fill('125');
    await save();

    await add('glucose', { value: 95 }, '<img src=x onerror=alert(1)>');
    await id('entry-context').selectOption('fasting');
    await save();
    await id('journal-filter').selectOption('glucose');
    assert.equal(await id('entries').locator('.entry').count(), 1);
    assert.equal(await id('entries').locator('img').count(), 0);
    assert.match(await id('entries').innerText(), /<img src=x/);
    await id('entries').getByRole('button', { name: 'Изменить' }).click();
    await page.locator('[name=value]').fill('97');
    await id('entry-urgent').check();
    await visible(id('urgent-hint'));
    await save();
    await page.getByRole('link', { name: 'Обзор', exact: true }).click();
    await visible(id('overview-title'));
    assert.match(await id('attention').innerText(), /бортового медика/);
    const glucose = id('metrics').locator('article').filter({ has: page.getByRole('heading', { name: 'Глюкоза', exact: true }) });
    await glucose.getByRole('button', { name: 'График' }).click();
    assert.equal(await id('trend-context').inputValue(), 'fasting');
    assert.match(await id('trend').innerText(), /97/);
    await page.reload();
    assert.equal(await id('mode').inputValue(), 'personal');
    assert.match(await id('attention').innerText(), /серьёзные симптомы/);

    await page.getByRole('link', { name: 'Журнал', exact: true }).click();
    const downloadEvent = page.waitForEvent('download');
    await id('export').click();
    const download = await downloadEvent;
    const report = JSON.parse(await readFile(await download.path(), 'utf8'));
    assert.equal(report.mode, 'personal');
    assert.equal(report.entries.length, 2);
    assert.equal(report.entries.find((entry) => entry.metric === 'glucose').values.value, 97);
    assert.equal(report.latest.find((entry) => entry.metric === 'glucose').level, 'urgent');
    const glucoseEntry = id('entries').locator('.entry').filter({ hasText: 'Глюкоза' });
    await glucoseEntry.getByRole('button', { name: 'Удалить' }).click();
    await id('delete-dialog').getByRole('button', { name: 'Отмена' }).click();
    assert.equal(await glucoseEntry.count(), 1);
    await glucoseEntry.getByRole('button', { name: 'Удалить' }).click();
    await id('delete-dialog').getByRole('button', { name: 'Удалить', exact: true }).click();
    assert.equal(await glucoseEntry.count(), 0);

    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await context.setOffline(true);
    await page.reload();
    assert.equal(await id('entries').locator('.entry').count(), 1);
    await add('sleep', { value: 0 });
    await save();
    assert.match(await id('entries').innerText(), /Сон · 0 ч/);
    await page.getByRole('link', { name: 'Справочник', exact: true }).click();
    await visible(id('guide-title'));
    assert.equal(await id('guide').locator('dt').count(), 5);
    await page.getByText('Давление · мм рт. ст.', { exact: true }).click();
    assert.equal(await id('measurement-guide').locator('details[open]').count(), 1);
    await context.setOffline(false);
    await id('mode').selectOption('demo');
    await page.getByRole('link', { name: 'Обзор', exact: true }).click();
    assert.match(await id('attention').innerText(), /Сон/);
    await add('pulse', { value: 84 });
    await save();
    await add('temp', { value: 36.8 });
    await save();
    await add('mood', { value: 5 });
    await save();
    const moodCard = id('metrics').locator('article').filter({ has: page.getByRole('heading', { name: 'Настроение', exact: true }) });
    assert.match(await moodCard.locator('.metric-value').innerText(), /5/);
    await id('mode').selectOption('personal');
    await page.getByRole('link', { name: 'Журнал', exact: true }).click();
    assert.equal(await id('entries').locator('.entry').count(), 2);

    for (const width of [320, 390, 768, 1366]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ['overview', 'journal', 'guide']) {
        await page.evaluate((name) => { location.hash = name; }, route);
        await visible(id(route));
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route + ' overflows at ' + width);
      }
    }
    assert.deepEqual(errors, []);
    if (process.env.ORBIT_SCREENSHOT) {
      await id('mode').selectOption('demo');
      await page.goto(base + '#overview');
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
