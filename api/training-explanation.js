'use strict';

const { metrics, assess, demoEntries } = require('../dist/model.js');
const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const cache = new Map();


async function explain(lang) {
  const now = Date.now();
  const synthetic = demoEntries(now - 3_600_000);
  const latest = synthetic.find(entry => entry.metric === 'sleep');
  const { reason, action } = assess(latest, synthetic, now);
  const example = { metric: 'sleep', unit: metrics.sleep.unit, latest: latest.values.value, reason, action };
  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      signal: AbortSignal.timeout(23000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: 'Explain a fixed, synthetic astronaut training example in two short sentences. Write the entire explanation in ' + (lang === 'ru' ? 'Russian' : 'English') + '. Use only the provided value, reason and action. Do not add predictions, treatments, diagnoses or new thresholds.' }] },
        contents: [{ parts: [{ text: JSON.stringify({ language: lang === 'ru' ? 'Russian' : 'English', example }) }] }],
        generationConfig: { maxOutputTokens: 256, thinkingConfig: { thinkingLevel: 'MINIMAL' },
          responseMimeType: 'application/json', responseSchema: {
          type: 'OBJECT', properties: { explanation: { type: 'STRING' } }, required: ['explanation'],
        } },
      }),
    },
  );
  if (!response.ok) throw new Error('Gemini HTTP ' + response.status);
  const data = await response.json();
  const { explanation } = JSON.parse(data.candidates?.[0]?.content?.parts?.map(part => part.text).join('') || '{}');
  if (typeof explanation !== 'string' || !explanation.trim() || explanation.length > 700) {
    throw new Error('Invalid explanation');
  }
  return { explanation };
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': status === 200 ? 'public, max-age=300, s-maxage=3600' : 'no-store',
  });
  response.end(JSON.stringify(body));
}

module.exports = async function trainingExplanation(request, response) {
  if (request.method !== 'GET') return sendJson(response, 405, { error: 'Method not allowed' });
  const url = new URL(request.url, 'http://localhost');
  if (!apiKey) return sendJson(response, 503, { error: 'Gemini is not configured' });
  const lang = url.searchParams.get('lang') === 'ru' ? 'ru' : 'en';
  if (!cache.has(lang)) {
    cache.set(lang, explain(lang).catch(error => {
      console.error(error.message);
      setTimeout(() => cache.delete(lang), 30000).unref();
      return null;
    }));
  }
  const result = await cache.get(lang);
  return sendJson(response, result ? 200 : 502, result || { error: 'Gemini unavailable' });
};
