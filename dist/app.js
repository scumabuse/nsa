'use strict';

const { metrics, validate, assess, demoEntries } = OrbitModel;
const $ = (id) => document.getElementById(id);
const modes = ['demo', 'personal'];
const prefix = 'orbit-health.v1.';
const contexts = { fasting: 'Fasting', postmeal: 'After a meal', unspecified: 'Unspecified' };
const colors = ['#aac5ff', '#7de0bd'];
const dateTime = new Intl.DateTimeFormat('en-GB', { dateStyle: 'short', timeStyle: 'short' });
const shortDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const number = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 });
const day = 86_400_000;
const routes = ['overview', 'journal', 'radiation', 'guide'];
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
    storageWarning('The journal could not be opened. Check browser storage permissions. Stored records were left intact.');
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
    ok: mode === 'demo' ? 'Within demo range' : 'Near personal baseline',
    watch: 'Review needed',
    urgent: 'Serious symptoms',
    stale: 'Reading out of date',
    unknown: 'Insufficient data',
  }[level];
}

function badge(level) {
  return element('span', statusText(level), 'status ' + level);
}

function reading(entry) {
  return metrics[entry.metric].fields.map(({ key }) => number.format(entry.values[key])).join(' / ');
}

function renderOverview() {
  $('review-scenario').hidden = mode !== 'demo';
  const latest = latestReadings();
  const urgent = latest.filter((item) => item.level === 'urgent');
  const watch = latest.filter((item) => item.level === 'watch');
  const attention = $('attention');
  attention.className = 'banner';
  attention.replaceChildren();
  if (urgent.length) {
    attention.classList.add('urgent');
    attention.append(element('strong', 'Serious symptoms reported'), element('p', urgent[0].action));
  } else if (watch.length) {
    attention.classList.add('watch');
    attention.append(element('strong', 'Review needed'), element('p', watch.map(({ metric }) => metrics[metric].label).join(', ') + '. See the metric cards for next steps.'));
  } else {
    attention.append(element('strong', entries.length ? 'Latest readings' : 'No readings yet'),
      element('p', entries.length ? 'Check reading dates and the status shown for each metric.' : 'Add a reading to start tracking.'));
  }
  $('mode-description').textContent = mode === 'demo' ? 'Training mode · Synthetic crew records' : 'Personal log · On this device';
  $('metrics').replaceChildren(...latest.map(({ metric, entry, level, reason, action }) => {
    const card = element('article', undefined, 'card');
    const head = element('div', undefined, 'metric-head');
    head.append(element('h3', metrics[metric].label), badge(level));
    const value = element('p', entry ? reading(entry) : '—', 'metric-value');
    if (entry) value.append(element('span', metrics[metric].unit, 'metric-unit'));
    const meta = element('p', entry ? dateTime.format(new Date(entry.at)) : 'No reading', 'hint');
    if (metric === 'glucose' && entry) meta.append(' · ' + contexts[entry.context ?? 'unspecified']);
    const actions = element('div', undefined, 'card-actions');
    actions.append(button('Add reading', () => openEntry(metric)), button('View trend', () => showTrend(metric, entry)));
    card.append(head, value, meta, element('p', reason, 'hint'), element('p', action), actions);
    return card;
  }));
  renderTrend();
}

function showTrend(metric, entry) {
  $('trend-metric').value = metric;
  if (metric === 'glucose' && entry) $('trend-context').value = entry.context ?? 'unspecified';
  renderTrend();
  $('trend-metric').focus({ preventScroll: true });
  $('trend-title').scrollIntoView();
}

function svg(tag, attrs, content) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  if (content !== undefined) node.textContent = content;
  return node;
}

function renderRadiation() {
  const { observations, unit } = OrbitRadData;
  const detector = $('rad-detector').value;
  const selected = observations.find((row) => row.id === $('rad-observation').value);
  const detectorLabel = 'Detector ' + detector.toUpperCase();
  const utcTime = (row) => row.utc.slice(11, 19);
  const rate = (row) => row[detector] === null ? 'Unavailable' :
    new Intl.NumberFormat('en-GB', { maximumFractionDigits: 5 }).format(row[detector]) + ' ' + unit;
  $('rad-reading').textContent = detectorLabel + ' · ' + utcTime(selected) + ' UTC · ' + rate(selected);
  $('rad-table-unit').textContent = detectorLabel + ' (' + unit + ')';
  $('rad-table').replaceChildren(...observations.map((row) => {
    const tr = element('tr');
    if (row === selected) tr.classList.add('selected-row');
    const th = element('th', utcTime(row));
    th.scope = 'row';
    tr.append(th, element('td', rate(row)));
    return tr;
  }));
  const valid = observations.filter((row) => row[detector] !== null);
  const min = Math.floor(Math.min(...valid.map((row) => row[detector])));
  const max = Math.ceil(Math.max(...valid.map((row) => row[detector])));
  const start = Date.parse(observations[0].utc);
  const duration = Date.parse(observations.at(-1).utc) - start;
  const x = (row) => 55 + 489 * (Date.parse(row.utc) - start) / duration;
  const y = (value) => 155 - 130 * (value - min) / Math.max(max - min, 1);
  const plot = svg('svg', { viewBox: '0 0 600 191', class: 'plot', role: 'img',
    'aria-label': detectorLabel + ' absorbed dose rate over observation start time in UTC. Values are also available in the table.' });
  for (let tick = 0; tick <= 4; tick++) {
    const value = min + (max - min) * tick / 4;
    plot.append(svg('line', { x1: 55, x2: 544, y1: y(value), y2: y(value), stroke: '#40516e' }),
      svg('text', { x: 47, y: y(value) + 4, 'text-anchor': 'end', fill: '#c7d3e9', 'font-size': 12 }, number.format(value)));
  }
  for (const row of [observations[0], observations.at(-1)]) {
    plot.append(svg('text', { x: x(row), y: 177, 'text-anchor': row === observations[0] ? 'start' : 'end',
      fill: '#c7d3e9', 'font-size': 12 }, utcTime(row) + ' UTC'));
  }
  for (const row of valid) {
    const current = row === selected;
    const point = svg('circle', { cx: x(row), cy: y(row[detector]), r: current ? 6 : 3.6,
      fill: current ? '#ffda91' : colors[0] });
    point.append(svg('title', {}, utcTime(row) + ' UTC · ' + rate(row)));
    plot.append(point);
  }
  $('rad-chart').replaceChildren(plot);
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
    target.append(element('p', 'No readings match these filters.', 'empty'));
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
  target.append(plot, legend, element('p', 'Readings: ' + rows.length + ' · Latest: ' + reading(last) + ' ' + unit, 'hint'));
}

function renderJournal() {
  const filter = $('journal-filter').value;
  const rows = entries.filter((row) => filter === 'all' || row.metric === filter);
  const pages = Math.max(1, Math.ceil(rows.length / 20));
  page = Math.min(page, pages);
  $('export').disabled = !entries.length;
  $('export-handoff').disabled = !entries.length;
  const target = $('entries');
  target.replaceChildren();
  if (!rows.length) {
    target.append(element('p', 'No readings match this filter.', 'empty'));
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
    actions.append(button('Edit', () => openEntry(row.metric, row)), button('Delete', () => openDelete(row)));
    item.append(time, info, actions);
    target.append(item);
  }
  if (pages > 1) {
    const controls = element('div', undefined, 'card-actions');
    const prev = button('Previous', () => changePage(page - 1));
    const next = button('Next', () => changePage(page + 1));
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

function drawStarField() {
  let seed = 2026;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const stars = document.createDocumentFragment();
  for (let index = 0; index < 310; index++) {
    const star = document.createElement('span');
    star.style.left = `${random() * 100}%`;
    star.style.top = `${random() * 100}%`;
    star.style.opacity = String(.24 + random() * .69);
    if (index % 13 === 0) {
      star.className = 'star-bright';
      star.style.opacity = '.95';
    }
    stars.append(star);
  }
  $('star-field').append(stars);
}

const flightMotion = window.matchMedia('(prefers-reduced-motion: no-preference)');
let routeAnimations = [];
let sectorArrival;

function showSector(name) {
  document.body.dataset.sector = name;
  window.dispatchEvent(new Event('sectorchange'));
}

function animateRoute(destination, direction) {
  clearTimeout(sectorArrival);
  for (const animation of routeAnimations) animation.cancel();
  routeAnimations = [];
  if (!flightMotion.matches || !destination.animate) {
    showSector(destination.id);
    return;
  }

  routeAnimations = [
    $('space-scene').animate([
      { transform: 'scale(1)', opacity: 1 },
      { transform: `scale(1.35) translateX(${direction * 5}%)`, opacity: 0, offset: .34 },
      { transform: `scale(.92) translateX(${-direction * 4}%)`, opacity: 0, offset: .43 },
      { transform: 'scale(1)', opacity: 1 },
    ], { duration: 820, easing: 'ease-in-out' }),
    $('space-flight').animate([
      { opacity: 0, transform: 'scale(.64)' },
      { opacity: .95, transform: 'scale(1.05)', offset: .43 },
      { opacity: 0, transform: 'scale(2.2)' },
    ], { duration: 820, easing: 'ease-in-out' }),
    destination.animate([
      { opacity: 0, transform: 'translateY(12px) scale(.985)' },
      { opacity: 0, offset: .36 },
      { opacity: 1, transform: 'none' },
    ], { duration: 820 }),
  ];
  sectorArrival = setTimeout(() => showSector(destination.id), 350);
}

function route(focus = false) {
  const name = location.hash.slice(1);
  if (name === 'main') return;
  const previous = section;
  section = routes.includes(name) ? name : 'overview';
  for (const id of routes) $(id).hidden = id !== section;
  for (const link of document.querySelectorAll('nav a')) {
    if (link.hash === '#' + section) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  render();
  if (!focus) showSector(section);
  if (focus) {
    window.scrollTo(0, 0);
    const heading = $(section).querySelector('h1');
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
    if (section !== previous) {
      animateRoute($(section), Math.sign(routes.indexOf(section) - routes.indexOf(previous)));
    }
  }
}

function render() {
  if (section === 'overview') renderOverview();
  if (section === 'journal') renderJournal();
  if (section === 'radiation') renderRadiation();
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
    const label = element('label', 'Measurement context');
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
  $('entry-title').textContent = row ? 'Edit reading' : 'New reading';
  $('entry-mode').textContent = mode === 'demo' ? 'Training log' : 'Personal log';
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
    return showError('entry-error', failure.message === 'missing' ? 'This reading has already been deleted. Close the form and reload the log.' : 'Could not save the reading. Check browser storage permissions.');
  }
  if (!editing) page = 1;
  $('entry-dialog').close();
  render();
  if (section === 'journal') $('journal-filter').focus();
  notify('Reading saved.');
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
    return showError('delete-error', 'Could not delete the reading. Check browser storage permissions.');
  }
  $('delete-dialog').close();
  renderJournal();
  $('journal-filter').focus();
  notify('Reading deleted.');
}

function latestReadings() {
  return Object.keys(metrics).map((metric) => {
    const entry = entries.find((row) => row.metric === metric);
    return { metric, entry, ...assess(entry, entries) };
  });
}

function downloadFile(content, mimeType, filename) {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = element('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify('Report downloaded.');
}

function exportJournal() {
  const exportedAt = new Date().toISOString();
  const latest = latestReadings().map(({ metric, entry, ...assessment }) => ({
    metric, label: metrics[metric].label, unit: metrics[metric].unit, entryId: entry?.id ?? null, ...assessment,
  }));
  const report = { format: 'orbit-health-report', version: 1, mode, exportedAt, latest, entries };
  downloadFile(JSON.stringify(report, null, 2), 'application/json;charset=utf-8',
    'orbit-health-' + mode + '-' + exportedAt.slice(0, 10) + '.json');
}

function exportHandoff() {
  const exportedAt = new Date().toISOString();
  const priority = { urgent: 0, watch: 1, stale: 2, unknown: 3, ok: 4 };
  const blocks = latestReadings().filter(({ entry }) => entry)
    .sort((a, b) => priority[a.level] - priority[b.level])
    .map(({ metric, entry, level, reason, action }) => [
      metrics[metric].label + ' · ' + reading(entry) + ' ' + metrics[metric].unit,
      'Recorded (UTC): ' + entry.at,
      'Status: ' + statusText(level),
      reason,
      'Next step: ' + action,
      ...(metric === 'glucose' ? ['Meal context: ' + contexts[entry.context ?? 'unspecified']] : []),
      ...(entry.note ? ['Crew note: ' + entry.note] : []),
    ].join('\n'));
  const header = mode === 'demo' ? 'TRAINING EXERCISE · SYNTHETIC CREW READINGS' : 'PERSONAL LOG · SHARE THROUGH THE MISSION CHANNEL';
  downloadFile(['ORBIT HEALTH CREW HANDOFF', header, 'Prepared (UTC): ' + exportedAt,
    'Latest recorded value per metric. This file is saved locally for manual sharing.', '', blocks.join('\n\n')].join('\n'),
  'text/plain;charset=utf-8', 'orbit-health-handoff-' + mode + '-' + exportedAt.slice(0, 10) + '.txt');
}

for (const row of OrbitRadData.observations) {
  $('rad-observation').add(new Option(row.utc.slice(11, 19), row.id));
}
$('rad-source').href = OrbitRadData.source;
$('rad-label').href = OrbitRadData.label;

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
drawStarField();
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
    storageWarning('The browser could not remember the selected mode. Check local storage permissions.');
  }
  render();
  notify(mode === 'demo' ? 'Training log opened.' : 'Personal log opened.');
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
$('export-handoff').addEventListener('click', exportHandoff);
$('review-scenario').addEventListener('click', () => showTrend('sleep'));
for (const id of ['rad-detector', 'rad-observation']) $(id).addEventListener('change', renderRadiation);
for (const trigger of document.querySelectorAll('[data-add]')) trigger.addEventListener('click', () => openEntry());
for (const trigger of document.querySelectorAll('[data-close]')) trigger.addEventListener('click', () => trigger.closest('dialog').close());

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').then(() => navigator.serviceWorker.ready).then(() => {
    $('offline').textContent = 'Available offline · Data stays on this device';
  }).catch(() => {});
}
