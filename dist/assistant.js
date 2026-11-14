(() => {
  'use strict';

  const output = $('reading-explanation');
  let pending;

  $('mode').addEventListener('change', () => {
    pending?.abort();
    output.replaceChildren();
  });

  $('explain-readings').addEventListener('click', async () => {
    pending?.abort();
    const request = new AbortController();
    pending = request;
    const summaries = latestReadings().filter(item => item.entry);
    output.replaceChildren(element('h3', 'Local assessment'));
    if (!summaries.length) {
      output.append(element('p', 'No readings yet.'));
    }
    for (const item of summaries) {
      const line = element('p');
      line.append(element('strong', metrics[item.metric].label), ' · ',
        element('span', item.reason), ' ', element('span', item.action));
      output.append(line);
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
      message.replaceWith(element('h3', 'Gemini · Training example'), element('p', explanation));
    } catch {
      if (!request.signal.aborted) {
        message.textContent = 'Gemini is unavailable. The local assessment is shown above.';
      }
    }
  });
})();
