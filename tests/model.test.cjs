const { test } = require('node:test');
const assert = require('node:assert/strict');
const { assess, demoEntries, metrics, validate } = require('../dist/model.js');

const DAY = 86_400_000;
const NOW = Date.parse('2026-11-14T12:00:00Z');

function reading(metric, values, daysAgo = 0, extra = {}) {
  return {
    id: `${metric}-${daysAgo}`,
    metric,
    at: new Date(NOW - daysAgo * DAY).toISOString(),
    values,
    note: '',
    ...extra,
  };
}

test('all demo entries are valid, uniquely identified and sorted latest first', () => {
  const rows = demoEntries(NOW);
  assert.equal(rows.length, 60);
  assert.equal(new Set(rows.map(row => row.id)).size, rows.length);
  assert.ok(rows.every(row => row.demo && !validate(row, NOW)));
  assert.ok(rows.every((row, index) => index === 0 || row.at <= rows[index - 1].at));
  for (const metric of Object.keys(metrics)) {
    assert.equal(rows.filter(row => row.metric === metric).length, 10);
  }
});

test('invalid values, timestamp, extra fields and pressure ordering are rejected', () => {
  const valid = reading('bp', { systolic: 118, diastolic: 75 });
  assert.equal(validate(valid, NOW), '');
  assert.match(validate({ ...valid, metric: 'toString' }, NOW), /показатель/);
  assert.match(validate({ ...valid, at: '2026-02-30T12:00:00.000Z' }, NOW), /дату/);
  assert.match(validate(reading('pulse', { value: 70 }, -1), NOW), /будущем/);
  assert.match(validate(reading('pulse', { value: '70' }), NOW), /число/);
  assert.match(validate(reading('temp', { value: 36.56 }), NOW), /шаг/);
  assert.equal(validate(reading('sleep', { value: 0 }), NOW), '');
  assert.match(validate(reading('sleep', { value: 24.1 }), NOW), /число/);
  assert.match(validate(reading('pulse', { value: 70, extra: 3 }), NOW), /поля/);
  assert.match(validate(reading('bp', { systolic: 75, diastolic: 75 }), NOW), /выше/);
  assert.match(validate({ ...valid, note: 'a'.repeat(501) }, NOW), /500/);
  assert.match(validate({ ...valid, urgent: 'false' }, NOW), /отметку/);
  assert.match(validate(reading('glucose', { value: 90 }, 0, { context: 'invalid' }), NOW), /условия/);
});

test('demo ranges are only used for demo measurements', () => {
  const rows = demoEntries(NOW);
  const sleep = rows.find(row => row.metric === 'sleep');
  assert.equal(assess(sleep, rows, NOW).level, 'watch');
  assert.equal(assess({ ...sleep, demo: false }, rows, NOW).level, 'unknown');
  const pulse = rows.find(row => row.metric === 'pulse');
  assert.equal(assess(pulse, rows, NOW).level, 'ok');
});

test('urgent flag takes precedence over staleness and history', () => {
  const row = reading('pulse', { value: 70 }, 3);
  assert.equal(assess(row, [], NOW).level, 'stale');
  assert.equal(assess({ ...row, urgent: true }, [], NOW).level, 'urgent');
  assert.equal(assess(null, [], NOW).level, 'unknown');
  assert.equal(assess(reading('pulse', { value: 70 }, 2), [], NOW).level, 'unknown');
});

test('real changes use prior daily medians and ignore future, old and demo data', () => {
  const row = reading('pulse', { value: 87 });
  const prior = [
    reading('pulse', { value: 69 }, 1),
    reading('pulse', { value: 71 }, 2),
    reading('pulse', { value: 70 }, 3),
    reading('pulse', { value: 150 }, 4, { demo: true }),
    reading('pulse', { value: 150 }, 35),
    reading('pulse', { value: 150 }, -0.1),
    reading('pulse', { value: 150 }, 5, { urgent: true }),
  ];
  assert.equal(assess(row, prior, NOW).level, 'watch');
  assert.match(assess(row, prior, NOW).reason, /\+17/);
  assert.equal(assess({ ...row, values: { value: 71 } }, prior, NOW).level, 'ok');
  assert.equal(assess(row, [...prior.slice(1), reading('pulse', { value: 70 }, 2.1)], NOW).level, 'unknown');
});

test('glucose comparison requires matching specified food context', () => {
  const row = reading('glucose', { value: 140 }, 0, { context: 'fasting' });
  const entries = [1, 2, 3].map(day => reading('glucose', { value: 91 }, day, { context: 'postmeal' }));
  assert.equal(assess(row, entries, NOW).level, 'unknown');
  assert.equal(assess({ ...row, context: 'postmeal' }, entries, NOW).level, 'watch');
  assert.equal(assess({ ...row, context: 'unspecified', demo: true }, [], NOW).level, 'unknown');
  assert.equal(assess({ ...row, context: 'postmeal', demo: true }, [], NOW).level, 'ok');
  assert.equal(assess({ ...row, demo: true }, [], NOW).level, 'watch');
});
