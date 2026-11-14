(() => {
  'use strict';

  const output = $('reading-explanation');
  const cards = $('assistant-metrics');
  const symptomPanel = $('assistant-symptom');
  const icons = { bp: '∿', pulse: '♡', glucose: '♢', temp: '°', sleep: '☾', mood: '☺' };
  let pending;
  let symptomRequest;

  $('mode').addEventListener('change', () => {
    pending?.abort();
    symptomRequest?.abort();
    symptomPanel.replaceChildren();
    symptomPanel.hidden = true;
    output.replaceChildren();
    if (document.body.dataset.sector === 'assistant' && section === 'assistant') explain();
  });

  window.OrbitAssistant = {
    selectSymptom(row, readings) {
      symptomRequest?.abort();
      const note = element('p', row.note);
      note.translate = false;
      symptomPanel.replaceChildren(
        element('h2', 'Symptom recommendations'),
        element('strong', row.title),
        note,
        element('p', readings.length
          ? 'Review the related readings and note when the symptom started. Share this information with the onboard medic.'
          : 'Note when the symptom started and what you were doing. Share this information with the onboard medic.')
      );
      const related = [];
      for (const metric of readings) {
        const item = latestReadings().find(item => item.metric === metric);
        const line = element('p');
        const value = item.entry ? reading(item.entry) + ' ' + metrics[metric].unit : '';
        if (value) related.push({ metric, value });
        line.append(element('strong', metrics[metric].label), ' · ', value || element('span', 'No reading'));
        symptomPanel.append(line);
      }
      const result = element('p', undefined, 'hint');
      result.setAttribute('role', 'status');
      const analyze = button('Get recommendation', async () => {
        const request = new AbortController();
        symptomRequest = request;
        analyze.disabled = true;
        result.textContent = 'Preparing symptom recommendations…';
        try {
          const endpoint = '/api/training-explanation?lang=' + document.documentElement.lang;
          const options = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ zone: row.title, note: row.note, readings: related }),
            signal: AbortSignal.any([request.signal, AbortSignal.timeout(30000)]),
          };
          let response = await fetch(endpoint, options);
          if (['localhost', '127.0.0.1'].includes(location.hostname) &&
              [404, 405, 501].includes(response.status)) {
            response = await fetch('https://orbit-health-space-apps.vercel.app' + endpoint, options);
          }
          if (!response.ok) throw new Error('Symptom recommendations unavailable');
          const { explanation } = await response.json();
          if (typeof explanation !== 'string' || !explanation.trim()) throw new Error('Empty explanation');
          if (!request.signal.aborted) result.textContent = explanation;
        } catch {
          if (!request.signal.aborted) {
            result.textContent = 'Online explanation unavailable. The local assessment is shown above.';
          }
        } finally {
          analyze.disabled = false;
        }
      }, 'secondary');
      symptomPanel.append(
        element('p', 'The symptom note and related readings will be sent to the online assistant.', 'hint'),
        analyze,
        result
      );
      symptomPanel.hidden = false;
    },
  };

  async function explain() {
    pending?.abort();
    const request = new AbortController();
    pending = request;
    const summaries = latestReadings().filter(item => item.entry);
    output.replaceChildren();
    cards.replaceChildren();
    const good = summaries.filter(item => item.level === 'ok').length;
    $('assistant-counts').replaceChildren(element('span', 'Within range:'), ' ' + good + ' · ',
      element('span', 'Need attention:'), ' ' + (summaries.length - good));
    if (!summaries.length) {
      cards.append(element('p', 'No readings yet.'));
    }
    for (const item of summaries) {
      const card = element('article', undefined, 'assistant-metric');
      card.dataset.level = item.level;
      const icon = element('span', icons[item.metric], 'assistant-icon');
      icon.setAttribute('aria-hidden', 'true');
      const copy = element('div');
      const heading = element('h2', metrics[item.metric].label);
      const status = element('span', item.level === 'ok' ? '✓' : '△', 'assistant-indicator');
      status.setAttribute('aria-label', statusText(item.level));
      heading.append(status);
      const description = element('p');
      description.append(element('span', item.reason), ' ', element('span', item.action));
      copy.append(heading, description);
      card.append(icon, copy);
      cards.append(card);
    }
    if (mode === 'personal') {
      output.append(element('p', 'Personal readings stay on this device.', 'hint'));
      return;
    }

    const message = element('p', 'Preparing the training explanation…', 'hint');
    output.append(message);
    try {
      const path = '/api/training-explanation?lang=' + document.documentElement.lang;
      const hostedOrigin = 'https://orbit-health-space-apps.vercel.app';
      const signal = AbortSignal.any([request.signal, AbortSignal.timeout(35000)]);
      let response;
      if (location.origin === hostedOrigin) {
        response = await fetch(path, { signal });
      } else if (location.protocol !== 'file:') {
        response = await fetch(path, { signal: AbortSignal.any([signal, AbortSignal.timeout(4000)]) })
          .catch(() => undefined);
      }
      if (location.origin !== hostedOrigin && (!response?.ok || !response.headers.get('content-type')?.includes('application/json'))) {
        response = await fetch(hostedOrigin + path, { signal, credentials: 'omit' });
      }
      if (!response.ok) throw new Error('Training explanation unavailable');
      const { explanation } = await response.json();
      if (request.signal.aborted) return;
      if (typeof explanation !== 'string' || !explanation.trim()) throw new Error('Empty explanation');
      message.replaceWith(element('h2', 'Training explanation'), element('p', explanation));
    } catch {
      if (!request.signal.aborted) {
        message.textContent = 'Online explanation unavailable. The local assessment is shown above.';
      }
    }
  }
  $('refresh-explanation').addEventListener('click', explain);
  window.addEventListener('sectorchange', () => {
    if (document.body.dataset.sector === 'assistant') explain();
    else pending?.abort();
  });
  window.addEventListener('hashchange', () => {
    if (section === 'assistant') return;
    symptomRequest?.abort();
    symptomPanel.replaceChildren();
    symptomPanel.hidden = true;
  });
  if (section === 'assistant') explain();
})();
