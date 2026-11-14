'use strict';

const { metrics, validate, assess, demoEntries } = OrbitModel;
const $ = (id) => document.getElementById(id);
const modes = ['demo', 'personal'];
const prefix = 'orbit-health.v1.';
const contexts = { fasting: 'Натощак', postmeal: 'После еды', unspecified: 'Условия не указаны' };
const colors = ['#aac5ff', '#7de0bd'];
const dateTime = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
const shortDate = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });
const number = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
const day = 86_400_000;
const routes = ['overview', 'journal', 'guide'];
const demoSeed = demoEntries(Date.now() - 3_600_000);
let mode = 'demo';
let entries = [];
let editing = null;
let deleting = null;
let page = 1;
let section = 'overview';

function element(tag, content, className) {
  const node = document.createElement(tag);
  if (content !== undefined) node.textContent = content;
  if (className) node.className = className;
  return node;
}

function button(text, action, className = 'small-button') {
  const node = element('button', text, className);
  node.type = 'button';
  node.addEventListener('click', action);
  return node;
}

function notify(message) {
  $('notice').textContent = message;
}

function storageWarning(message = '') {
  $('storage-warning').hidden = !message;
  $('storage-warning').textContent = message;
}

function storageKey() {
  return prefix + mode;
}

function readJournal() {
  const raw = localStorage.getItem(storageKey());
  if (raw === null) return mode === 'demo' ? [...demoSeed] : [];
  const saved = JSON.parse(raw);
  const ids = new Set();
  if (!Array.isArray(saved) || saved.some((row) => {
    if (validate(row, Infinity) || (row.demo === true) !== (mode === 'demo') || ids.has(row.id)) return true;
    ids.add(row.id);
    return false;
  })) throw new Error('Invalid saved journal');
  return saved.sort((a, b) => b.at.localeCompare(a.at));
}

function reloadJournal() {
  try {
    entries = readJournal();
    storageWarning();
  } catch {
    entries = mode === 'demo' ? [...demoSeed] : [];
    storageWarning('Журнал недоступен. Проверьте доступ браузера к локальному хранилищу. Исходные записи сохранены в прежнем виде.');
  }
}

function updateJournal(change) {
  const next = change(readJournal()).sort((a, b) => b.at.localeCompare(a.at));
  localStorage.setItem(storageKey(), JSON.stringify(next));
  entries = next;
  storageWarning();
}

function statusText(level) {
  return {
    ok: mode === 'demo' ? 'В демодиапазоне' : 'Близко к истории',
    watch: 'Требует внимания',
    urgent: 'Серьёзные симптомы',
    stale: 'Обновите замер',
    unknown: 'Недостаточно данных',
  }[level];
}

function badge(level) {
  return element('span', statusText(level), 'status ' + level);
}

function reading(entry) {
  return metrics[entry.metric].fields.map(({ key }) => number.format(entry.values[key])).join(' / ');
}

function renderOverview() {
  const latest = Object.keys(metrics).map((metric) => {
    const entry = entries.find((row) => row.metric === metric);
    return { metric, entry, ...assess(entry, entries) };
  });
  const urgent = latest.filter((item) => item.level === 'urgent');
  const watch = latest.filter((item) => item.level === 'watch');
  const attention = $('attention');
  attention.className = 'banner';
  attention.replaceChildren();
  if (urgent.length) {
    attention.classList.add('urgent');
    attention.append(element('strong', 'Отмечены серьёзные симптомы'), element('p', urgent[0].action));
  } else if (watch.length) {
    attention.classList.add('watch');
    attention.append(element('strong', 'Требует внимания'), element('p', watch.map(({ metric }) => metrics[metric].label).join(', ') + '. Подробности и действия указаны в карточках.'));
  } else {
    attention.append(element('strong', entries.length ? 'Последние измерения' : 'В журнале пока нет измерений'),
      element('p', entries.length ? 'Проверьте наличие свежих данных и пояснения к статусам.' : 'Добавьте первый замер, чтобы начать наблюдение.'));
  }
  $('mode-description').textContent = mode === 'demo' ? 'Демонстрация · Синтетические данные' : 'Личный журнал · На этом устройстве';
  $('metrics').replaceChildren(...latest.map(({ metric, entry, level, reason, action }) => {
    const card = element('article', undefined, 'card');
    const head = element('div', undefined, 'metric-head');
    head.append(element('h3', metrics[metric].label), badge(level));
    const value = element('p', entry ? reading(entry) : '—', 'metric-value');
    if (entry) value.append(element('span', metrics[metric].unit, 'metric-unit'));
    const meta = element('p', entry ? dateTime.format(new Date(entry.at)) : 'Нет записи', 'hint');
    if (metric === 'glucose' && entry) meta.append(' · ' + contexts[entry.context ?? 'unspecified']);
    const actions = element('div', undefined, 'card-actions');
    actions.append(button('Добавить замер', () => openEntry(metric)), button('График', () => {
      $('trend-metric').value = metric;
      if (metric === 'glucose' && entry) $('trend-context').value = entry.context ?? 'unspecified';
      renderTrend();
      $('trend-metric').focus({ preventScroll: true });
      $('trend-title').scrollIntoView();
    }));
    card.append(head, value, meta, element('p', reason, 'hint'), element('p', action), actions);
    return card;
  }));
  renderTrend();
}

function svg(tag, attrs, content) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  if (content !== undefined) node.textContent = content;
  return node;
}

function renderTrend() {
  const metric = $('trend-metric').value;
  const period = $('period').value;
  const context = $('trend-context').value;
  $('trend-context-label').hidden = metric !== 'glucose';
  const limit = period === 'all' ? -Infinity : Date.now() - Number(period) * day;
  const rows = entries.filter((entry) => entry.metric === metric && Date.parse(entry.at) >= limit &&
    (metric !== 'glucose' || (entry.context ?? 'unspecified') === context)).reverse();
  const target = $('trend');
  target.replaceChildren();
  if (!rows.length) {
    target.append(element('p', 'За выбранный период нет измерений с этими условиями.', 'empty'));
    return;
  }
  const { fields, unit, label } = metrics[metric];
  let min = Infinity;
  let max = -Infinity;
  for (const { values } of rows) {
    for (const { key } of fields) {
      min = Math.min(min, values[key]);
      max = Math.max(max, values[key]);
    }
  }
  const pad = Math.max((max - min) * .13, fields[0].step);
  min -= pad;
  max += pad;
  const start = Date.parse(rows[0].at);
  const end = Date.parse(rows.at(-1).at);
  const x = (row) => start === end ? 301 : 54 + 494 * ((Date.parse(row.at) - start) / (end - start));
  const y = (value) => 159 - 137 * ((value - min) / (max - min));
  const plot = svg('svg', { viewBox: '0 0 600 191', class: 'plot', role: 'img', 'aria-label': label + ' · ' + unit });
  for (const fraction of [0, .25, .5, .75, 1]) {
    const value = min + (max - min) * fraction;
    plot.append(svg('line', { x1: 54, x2: 548, y1: y(value), y2: y(value), stroke: '#40516e' }),
      svg('text', { x: 47, y: y(value) + 4, 'text-anchor': 'end', fill: '#c7d3e9', 'font-size': 12 }, number.format(value)));
  }
  plot.append(svg('text', { x: x(rows[0]), y: 180, 'text-anchor': start === end ? 'middle' : 'start', fill: '#c7d3e9', 'font-size': 12 }, shortDate.format(start)));
  if (start !== end) plot.append(svg('text', { x: 548, y: 180, 'text-anchor': 'end', fill: '#c7d3e9', 'font-size': 12 }, shortDate.format(end)));
  const legend = element('div', undefined, 'legend');
  fields.forEach(({ key, label: fieldLabel }, index) => {
    const color = colors[index];
    const item = element('span');
    const swatch = element('span', undefined, 'swatch');
    swatch.style.setProperty('--series', color);
    item.append(swatch, fieldLabel + ' · ' + unit);
    legend.append(item);
    const points = rows.map((row) => x(row) + ',' + y(row.values[key])).join(' ');
    plot.append(svg('polyline', { points, fill: 'none', stroke: color, 'stroke-width': 2.3 }));
    for (const row of rows.length <= 120 ? rows : [rows.at(-1)]) {
      const point = svg('circle', { cx: x(row), cy: y(row.values[key]), r: 3.8, fill: color });
      point.append(svg('title', {}, dateTime.format(new Date(row.at)) + ' · ' + fieldLabel + ' ' + number.format(row.values[key]) + ' ' + unit));
      plot.append(point);
    }
  });
  const last = rows.at(-1);
  target.append(plot, legend, element('p', 'Записей: ' + rows.length + ' · Последнее значение: ' + reading(last) + ' ' + unit, 'hint'));
}

function renderJournal() {
  const filter = $('journal-filter').value;
  const rows = entries.filter((row) => filter === 'all' || row.metric === filter);
  const pages = Math.max(1, Math.ceil(rows.length / 20));
  page = Math.min(page, pages);
  $('export').disabled = !entries.length;
  const target = $('entries');
  target.replaceChildren();
  if (!rows.length) {
    target.append(element('p', 'Измерений по выбранному фильтру нет.', 'empty'));
    return;
  }
  for (const row of rows.slice((page - 1) * 20, page * 20)) {
    const item = element('article', undefined, 'entry');
    const time = element('time', dateTime.format(new Date(row.at)), 'hint');
    time.dateTime = row.at;
    const info = element('div');
    const meta = metrics[row.metric];
    info.append(element('h3', meta.label + ' · ' + reading(row) + ' ' + meta.unit),
      badge(assess(row, entries, Date.parse(row.at)).level));
    if (row.metric === 'glucose') info.append(element('p', contexts[row.context ?? 'unspecified'], 'hint'));
    if (row.note) info.append(element('p', row.note, 'hint'));
    const actions = element('div', undefined, 'card-actions');
    actions.append(button('Изменить', () => openEntry(row.metric, row)), button('Удалить', () => openDelete(row)));
    item.append(time, info, actions);
    target.append(item);
  }
  if (pages > 1) {
    const controls = element('div', undefined, 'card-actions');
    const prev = button('Назад', () => changePage(page - 1));
    const next = button('Далее', () => changePage(page + 1));
    prev.disabled = page === 1;
    next.disabled = page === pages;
    controls.append(prev, element('span', page + ' / ' + pages, 'hint'), next);
    target.append(controls);
  }
}

function changePage(next) {
  page = next;
  renderJournal();
  $('journal-filter').focus();
}

function route(focus = false) {
  const name = location.hash.slice(1);
  if (name === 'main') return;
  section = routes.includes(name) ? name : 'overview';
  for (const id of routes) $(id).hidden = id !== section;
  for (const link of document.querySelectorAll('nav a')) {
    if (link.hash === '#' + section) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  render();
  if (focus) {
    window.scrollTo(0, 0);
    const heading = $(section).querySelector('h1');
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
}

function render() {
  if (section === 'overview') renderOverview();
  if (section === 'journal') renderJournal();
}

function localTime(date = new Date()) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 19);
}

function renderFields(values = {}, context = 'unspecified') {
  const metric = $('entry-metric').value;
  const meta = metrics[metric];
  $('entry-guide').textContent = meta.guide;
  const target = $('entry-values');
  target.replaceChildren();
  for (const field of meta.fields) {
    const label = element('label', field.label + ', ' + meta.unit);
    const input = element('input');
    input.type = 'number';
    input.required = true;
    input.min = field.min;
    input.max = field.max;
    input.step = field.step;
    input.name = field.key;
    input.value = values[field.key] ?? '';
    label.append(input);
    target.append(label);
  }
  if (metric === 'glucose') {
    const label = element('label', 'Условия измерения');
    const select = element('select');
    select.id = 'entry-context';
    for (const [value, label] of Object.entries(contexts)) select.add(new Option(label, value));
    select.value = context;
    label.append(select);
    target.append(label);
  }
}

function openEntry(metric = 'bp', row = null) {
  editing = row;
  $('entry-form').reset();
  $('entry-title').textContent = row ? 'Изменить измерение' : 'Новое измерение';
  $('entry-mode').textContent = mode === 'demo' ? 'Демонстрационный журнал' : 'Личный журнал';
  $('entry-metric').value = metric;
  $('entry-time').value = localTime(row ? new Date(row.at) : new Date());
  $('entry-time').max = localTime();
  $('entry-note').value = row?.note ?? '';
  $('entry-urgent').checked = row?.urgent === true;
  $('urgent-hint').hidden = !$('entry-urgent').checked;
  $('entry-error').hidden = true;
  renderFields(row?.values, row?.context);
  $('entry-dialog').showModal();
}

function showError(id, message) {
  $(id).textContent = message;
  $(id).hidden = false;
}

function saveEntry(event) {
  event.preventDefault();
  const metric = $('entry-metric').value;
  const timestamp = new Date($('entry-time').value);
  const row = {
    id: editing?.id ?? (crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint32Array(4)), (value) => value.toString(16)).join('-')),
    metric,
    at: Number.isFinite(timestamp.getTime()) ? timestamp.toISOString() : '',
    values: Object.fromEntries(metrics[metric].fields.map(({ key }) => [key, $('entry-form').elements.namedItem(key).valueAsNumber])),
    note: $('entry-note').value.trim(),
    urgent: $('entry-urgent').checked,
    demo: mode === 'demo',
    ...(metric === 'glucose' ? { context: $('entry-context').value } : {}),
  };
  if (editing && $('entry-time').value === localTime(new Date(editing.at))) row.at = editing.at;
  const error = validate(row);
  if (error) return showError('entry-error', error);
  try {
    updateJournal((current) => {
      if (editing && !current.some((item) => item.id === editing.id)) throw new Error('missing');
      return [row, ...current.filter((item) => item.id !== row.id)];
    });
  } catch (failure) {
    return showError('entry-error', failure.message === 'missing' ? 'Эта запись уже удалена. Закройте форму и обновите журнал.' : 'Сохранение не удалось. Проверьте доступность хранилища браузера.');
  }
  if (!editing) page = 1;
  $('entry-dialog').close();
  render();
  if (section === 'journal') $('journal-filter').focus();
  notify('Измерение сохранено.');
}

function openDelete(row) {
  deleting = row.id;
  $('delete-description').textContent = metrics[row.metric].label + ' · ' + dateTime.format(new Date(row.at));
  $('delete-error').hidden = true;
  $('delete-dialog').showModal();
}

function deleteEntry(event) {
  event.preventDefault();
  try {
    updateJournal((current) => current.filter((row) => row.id !== deleting));
  } catch {
    return showError('delete-error', 'Не удалось удалить запись. Проверьте доступность хранилища браузера.');
  }
  $('delete-dialog').close();
  renderJournal();
  $('journal-filter').focus();
  notify('Измерение удалено.');
}

function exportJournal() {
  const latest = Object.keys(metrics).map((metric) => {
    const entry = entries.find((row) => row.metric === metric);
    return { metric, label: metrics[metric].label, unit: metrics[metric].unit, entryId: entry?.id ?? null, ...assess(entry, entries) };
  });
  const report = { format: 'orbit-health-report', version: 1, mode, exportedAt: new Date().toISOString(), latest, entries };
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' }));
  const link = element('a');
  link.href = url;
  link.download = 'orbit-health-' + mode + '-' + report.exportedAt.slice(0, 10) + '.json';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify('Сводка выгружена.');
}

for (const [metric, meta] of Object.entries(metrics)) {
  for (const id of ['entry-metric', 'trend-metric', 'journal-filter']) $(id).add(new Option(meta.label, metric));
  const details = element('details');
  details.append(element('summary', meta.label + ' · ' + meta.unit), element('p', meta.guide), element('p', meta.context, 'muted'));
  $('measurement-guide').append(details);
}
try {
  const remembered = localStorage.getItem(prefix + 'mode');
  if (modes.includes(remembered)) mode = remembered;
} catch {
  // reloadJournal surfaces storage errors.
}
$('mode').value = mode;
reloadJournal();
route();
window.addEventListener('hashchange', () => route(true));
window.addEventListener('storage', (event) => {
  if (event.key === storageKey() || event.key === null) {
    reloadJournal();
    render();
  }
});
for (const id of ['trend-metric', 'trend-context', 'period']) $(id).addEventListener('change', renderTrend);
$('mode').addEventListener('change', () => {
  mode = $('mode').value;
  page = 1;
  reloadJournal();
  try {
    localStorage.setItem(prefix + 'mode', mode);
  } catch {
    storageWarning('Браузер не может запомнить выбранный режим. Проверьте доступ к локальному хранилищу.');
  }
  render();
  notify(mode === 'demo' ? 'Открыт демонстрационный журнал.' : 'Открыт личный журнал.');
});
$('journal-filter').addEventListener('change', () => { page = 1; renderJournal(); });
$('entry-metric').addEventListener('change', () => {
  $('entry-error').hidden = true;
  renderFields();
});
$('entry-form').addEventListener('input', () => {
  $('entry-time').max = localTime();
  $('entry-error').hidden = true;
});
$('entry-urgent').addEventListener('change', () => { $('urgent-hint').hidden = !$('entry-urgent').checked; });
$('entry-form').addEventListener('submit', saveEntry);
$('delete-form').addEventListener('submit', deleteEntry);
$('export').addEventListener('click', exportJournal);
for (const trigger of document.querySelectorAll('[data-add]')) trigger.addEventListener('click', () => openEntry());
for (const trigger of document.querySelectorAll('[data-close]')) trigger.addEventListener('click', () => trigger.closest('dialog').close());

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').then(() => navigator.serviceWorker.ready).then(() => {
    $('offline').textContent = 'Журнал доступен без сети · Данные на этом устройстве';
  }).catch(() => {});
}
