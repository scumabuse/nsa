(() => {
  'use strict';

  const timeline = $('mission-day');
  const alertButton = $('health-alert-details');
  const dialog = element('dialog');
  dialog.setAttribute('aria-labelledby', 'alert-explanation-title');
  const title = element('h2', 'Why this alert?');
  title.id = 'alert-explanation-title';
  const explanation = element('div');
  dialog.append(title, explanation, button('Close', () => dialog.close(), 'secondary'));
  document.body.append(dialog);
  let days = [];

  function symptoms() {
    try {
      const rows = JSON.parse(localStorage.getItem(prefix + 'symptoms.' + mode) || '[]');
      return Array.isArray(rows) ? rows : [];
    } catch { return []; }
  }

  function visibleSymptoms() {
    return symptoms().filter(row => !snapshotDay || row.at.slice(0, 10) <= snapshotDay);
  }

  function zoneDetails(container, zone, title, readings) {
    container.replaceChildren();
    const rows = visibleSymptoms().filter(row => row.zone === zone);
    if (rows.length) {
      const guidance = element('div', undefined, 'symptom-guidance');
      guidance.tabIndex = -1;
      guidance.setAttribute('role', 'group');
      guidance.setAttribute('aria-label', 'Next step:');
      guidance.append(
        element('strong', 'Next step:'),
        element('p', readings.length
          ? 'Review the related readings and note when the symptom started. Share this information with the onboard medic.'
          : 'Note when the symptom started and what you were doing. Share this information with the onboard medic.'),
        element('p', 'Serious symptoms — contact the onboard medic immediately')
      );
      const recommendations = element('a', 'Recommendations', 'secondary symptom-recommendations');
      recommendations.href = '#assistant';
      recommendations.addEventListener('click', () => {
        window.OrbitAssistant.selectSymptom(rows[0], readings);
      });
      guidance.append(recommendations);
      container.append(guidance);
    }
    for (const row of rows) {
      const note = element('p', row.note);
      note.translate = false;
      container.append(element('small', dateTime.format(new Date(row.at)), 'muted'), note);
    }
    if (snapshotDay) return;
    const form = element('form', undefined, 'symptom-form');
    const label = element('label', 'Symptom note');
    const input = element('textarea');
    input.required = true;
    input.maxLength = 500;
    input.rows = 2;
    label.append(input);
    const submit = element('button', 'Save symptom', 'secondary');
    const status = element('p', undefined, 'hint');
    status.setAttribute('role', 'status');
    form.append(label, submit, status);
    form.addEventListener('submit', event => {
      event.preventDefault();
      const note = input.value.trim();
      if (!note) return;
      try {
        localStorage.setItem(prefix + 'symptoms.' + mode, JSON.stringify([
          { zone, title, note, at: new Date().toISOString() }, ...symptoms(),
        ]));
      } catch {
        status.textContent = 'Could not save. Check browser storage and try again.';
        return;
      }
      render();
      const guidance = $('body-zone-actions').querySelector('.symptom-guidance');
      guidance?.focus({ preventScroll: true });
      guidance?.scrollIntoView({ block: 'center' });
      notify('Symptom saved.');
    });
    container.append(form);
  }

  function updateTimeline() {
    days = [...new Set([...entries, ...symptoms()].map(row => row.at.slice(0, 10)))].sort();
    if (snapshotDay && !days.includes(snapshotDay)) snapshotDay = '';
    timeline.max = days.length;
    timeline.value = snapshotDay ? days.indexOf(snapshotDay) : days.length;
    timeline.disabled = !days.length;
    $('mission-date').textContent = snapshotDay ? snapshotDay + ' UTC' : 'Current readings';
    timeline.setAttribute('aria-valuetext', $('mission-date').textContent);
    $('mission-live').hidden = !snapshotDay;
    $('overview-handoff').disabled = !latestReadings().some(item => item.entry) && !visibleSymptoms().length;
    $('export-handoff').disabled = $('overview-handoff').disabled;
  }
  timeline.addEventListener('input', () => {
    snapshotDay = days[Number(timeline.value)] || '';
    render();
  });
  $('mission-live').addEventListener('click', () => {
    snapshotDay = '';
    render();
    timeline.focus();
  });
  $('overview-handoff').addEventListener('click', exportHandoff);

  function comparison(item) {
    const { entry } = item;
    if (entry.demo) return ['Training comparison uses the exercise range.'];
    const rows = OrbitModel.comparisonDays(entry, entries);
    const baseline = OrbitModel.compareHistory(entry, entries);
    return [
      ...(baseline ? baseline.map(field => 'Personal baseline: ' + field.label + ' · ' + number.format(field.baseline) + ' ' + metrics[item.metric].unit)
        : ['More comparison days needed: ' + Math.max(0, 3 - rows.size)]),
      ...[...rows].sort(([a], [b]) => a.localeCompare(b)).map(([date, values]) =>
        date + ' UTC · ' + values.map(value => reading({ metric: item.metric, values: value })).join(', ') + ' ' + metrics[item.metric].unit),
    ];
  }

  function fillExplanation(target, items) {
    target.replaceChildren();
    for (const item of items) {
      const { entry } = item;
      target.append(element('h3', metrics[item.metric].label),
        element('p', reading(entry) + ' ' + metrics[item.metric].unit + ' · ' + dateTime.format(new Date(entry.at))),
        element('p', item.reason));
      const history = element('ul');
      history.append(...comparison(item).map(line => element('li', line)));
      target.append(history, element('p', item.action));
    }
  }
  alertButton.addEventListener('click', () => {
    fillExplanation(explanation, latestReadings().filter(row => ['urgent', 'watch'].includes(row.level)));
    dialog.showModal();
  });

  window.OrbitMission = {
    showExplanation(item) {
      const details = element('div', undefined, 'metric-comparison');
      fillExplanation(details, [item]);
      openMetricWorkspace(details);
    },
    zoneDetails,
    markedZones: () => new Set(visibleSymptoms().map(row => row.zone)),
    handoff() {
      const t = window.OrbitTranslate;
      const lines = [t('RECORDED SYMPTOMS'), ...visibleSymptoms().map(row => row.at + ' · ' + t(row.title) + ' · ' + row.note)];
      for (const item of latestReadings().filter(row => row.entry && row.level === 'watch')) {
        lines.push('', t(metrics[item.metric].label), ...comparison(item).map(t));
      }
      return lines;
    },
  };
  window.addEventListener('orbit-update', updateTimeline);
  window.addEventListener('storage', event => {
    if (event.key?.startsWith(prefix + 'symptoms.')) render();
  });
  render();
})();
