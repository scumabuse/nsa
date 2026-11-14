(function () {
  'use strict';

  const DAY = 86_400_000;
  const glucoseContexts = ['fasting', 'postmeal', 'unspecified'];
  const metrics = {
    bp: {
      label: 'Blood pressure', unit: 'mmHg',
      fields: [
        { key: 'systolic', label: 'Systolic', min: 20, max: 350, step: 1 },
        { key: 'diastolic', label: 'Diastolic', min: 10, max: 250, step: 1 },
      ],
      guide: 'Use the onboard blood pressure monitor and a correctly sized cuff. Rest first and support the arm at heart level, following mission procedure.',
      context: 'Compare readings taken in the same posture and conditions. Changes in gravity affect fluid distribution and cardiovascular function.',
    },
    pulse: {
      label: 'Heart rate', unit: 'bpm',
      fields: [{ key: 'value', label: 'Heart rate', min: 1, max: 300, step: 1 }],
      guide: 'Use the onboard sensor as instructed. Take a resting reading and note any recent activity.',
      context: 'Activity, sleep and gravity changes can affect heart rate. Compare readings taken under similar conditions.',
    },
    glucose: {
      label: 'Glucose', unit: 'mg/dL',
      fields: [{ key: 'value', label: 'Glucose', min: 1, max: 1500, step: 1 }],
      guide: 'Follow the meter instructions and mission procedure. Wash and dry your hands first. Record whether the reading was taken after a meal or while fasting.',
      context: 'Compare readings with matching meal context. For after-meal readings, note the time since the meal.',
    },
    temp: {
      label: 'Temperature', unit: '°C',
      fields: [{ key: 'value', label: 'Temperature', min: 20, max: 50, step: 0.1 }],
      guide: 'Use the onboard thermometer as instructed. Repeat measurements using the same method and site.',
      context: 'Room temperature, activity, time of day and measurement method can affect the reading.',
    },
    sleep: {
      label: 'Sleep', unit: 'h',
      fields: [{ key: 'value', label: 'Sleep duration', min: 0, max: 24, step: 0.1 }],
      guide: 'Log total sleep in the past 24 hours, including naps. Use your sleep log or wearable record.',
      context: 'Light, noise and shift schedules can disrupt sleep. Note interruptions or recent schedule changes.',
    },
    mood: {
      label: 'Mood', unit: '/ 5',
      fields: [{ key: 'value', label: 'Mood rating', min: 1, max: 5, step: 1 }],
      guide: 'Rate your mood today from 1 (very low) to 5 (very good). Add context if helpful.',
      context: 'Isolation, confinement and sleep can affect mood. Self-reported mood can inform a conversation with a medical specialist.',
    },
  };

  const trendThresholds = {
    bp: { systolic: 15, diastolic: 10 },
    pulse: { value: 15 }, glucose: { value: 25 }, temp: { value: 0.7 },
    sleep: { value: 1.5 }, mood: { value: 2 },
  };

  function validate(entry, now = Date.now()) {
    if (!entry || typeof entry.id !== 'string' || !entry.id.trim()) {
      return 'Each reading needs an identifier.';
    }
    if (!Object.hasOwn(metrics, entry.metric)) return 'Select a metric.';
    const at = Date.parse(entry.at);
    if (!Number.isFinite(at) || new Date(at).toISOString() !== entry.at || at > now) {
      return 'Enter a valid date and time. A reading cannot be in the future.';
    }
    if (typeof entry.note !== 'string' || entry.note.length > 500) {
      return 'Notes are limited to 500 characters.';
    }
    if (entry.demo !== undefined && typeof entry.demo !== 'boolean' ||
        entry.urgent !== undefined && typeof entry.urgent !== 'boolean') {
      return 'Check the reading type and symptom flag.';
    }
    if (entry.context !== undefined &&
        (entry.metric !== 'glucose' || !glucoseContexts.includes(entry.context))) {
      return 'Check the glucose measurement context.';
    }
    const { fields } = metrics[entry.metric];
    const { values } = entry;
    if (!values || typeof values !== 'object' || Object.keys(values).length !== fields.length ||
        !fields.every(({ key }) => Object.hasOwn(values, key))) {
      return 'Complete all fields for the metric.';
    }
    for (const { key, label, min, max, step } of fields) {
      const value = values[key];
      if (!Number.isFinite(value) || value < min || value > max) {
        return `${label} — enter a number from ${min} to ${max}.`;
      }
      if (Math.abs(value / step - Math.round(value / step)) > 1e-8) {
        return `${label} — use increments of ${step}.`;
      }
    }
    if (entry.metric === 'bp' && values.systolic <= values.diastolic) {
      return 'Systolic pressure must be higher than diastolic pressure.';
    }
    return '';
  }

  function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }

  function comparisonDays(entry, entries) {
    const at = Date.parse(entry.at);
    const daily = new Map();
    for (const earlier of entries) {
      if (earlier?.id === entry.id || earlier?.metric !== entry.metric ||
          earlier.demo === true || earlier.urgent === true || validate(earlier, at)) continue;
      const time = Date.parse(earlier.at);
      if (time >= at || at - time > 30 * DAY || earlier.at.slice(0, 10) === entry.at.slice(0, 10)) {
        continue;
      }
      if (entry.metric === 'glucose' && earlier.context !== entry.context) continue;
      const date = earlier.at.slice(0, 10);
      if (!daily.has(date)) daily.set(date, []);
      daily.get(date).push(earlier.values);
    }
    return daily;
  }

  function compareHistory(entry, entries) {
    const daily = comparisonDays(entry, entries);
    if (daily.size < 3) return null;
    return metrics[entry.metric].fields.map(({ key, label }) => {
      const baseline = median([...daily.values()].map(values => median(values.map(value => value[key]))));
      const delta = Math.round((entry.values[key] - baseline) * 100) / 100;
      return { label, baseline, delta, large: Math.abs(delta) >= trendThresholds[entry.metric][key] };
    });
  }

  function assessDemo(entry) {
    const { metric, values } = entry;
    const outside = {
      bp: () => values.systolic > 130 || values.systolic < 100 ||
        values.diastolic > 85 || values.diastolic < 60,
      pulse: () => values.value > 90 || values.value < 55,
      glucose: () => values.value < 75 || values.value > (entry.context === 'postmeal' ? 145 : 110),
      temp: () => values.value < 36 || values.value > 37.4,
      sleep: () => values.value < 6.5 || values.value > 10,
      mood: () => values.value <= 2,
    };
    if (metric === 'glucose' && (!entry.context || entry.context === 'unspecified')) {
      return {
        level: 'unknown', reason: 'Meal context is missing.',
        action: 'Add meal context to select the demo range.',
      };
    }
    if (outside[metric]()) {
      return {
        level: 'watch', reason: 'This reading is outside the training range.',
        action: 'Review measurement conditions, repeat per mission procedure and contact the crew medic if the change persists.',
      };
    }
    return {
      level: 'ok', reason: 'This reading is within the training range.',
      action: 'Continue scheduled readings for the exercise.',
    };
  }

  function assess(entry, entries = [], now = Date.now()) {
    if (!entry) {
      return { level: 'unknown', reason: 'No readings yet.', action: 'Add a reading to the log.' };
    }
    if (entry.urgent === true) {
      return {
        level: 'urgent', reason: 'Serious symptoms reported.',
        action: 'Notify the crew and onboard medic immediately. Follow the mission emergency medical protocol without waiting for Earth.',
      };
    }
    if (validate(entry, now)) {
      return {
        level: 'unknown', reason: 'This reading contains invalid data.',
        action: 'Check the timestamp and values.',
      };
    }
    if (now - Date.parse(entry.at) > 2 * DAY) {
      return {
        level: 'stale', reason: 'This reading is more than 48 hours old.',
        action: 'Take a new reading per the mission monitoring schedule.',
      };
    }
    if (entry.demo === true) return assessDemo(entry);
    if (entry.metric === 'glucose' && (!entry.context || entry.context === 'unspecified')) {
      return {
        level: 'unknown', reason: 'Meal context is missing.',
        action: 'Add meal context to compare against personal history.',
      };
    }
    const comparison = compareHistory(entry, entries);
    if (!comparison) {
      return {
        level: 'unknown', reason: 'The baseline needs readings on at least three previous days within the last 30 days.',
        action: 'Keep logging in comparable conditions. Contact the onboard medic if you have symptoms.',
      };
    }
    const description = comparison.map(({ label, delta }) =>
      `${label} ${delta > 0 ? '+' : ''}${delta.toLocaleString('en-GB')}`).join(', ');
    if (comparison.some(({ large }) => large)) {
      return {
        level: 'watch', reason: `Change from personal baseline (${description} ${metrics[entry.metric].unit}).`,
        action: 'Check measurement conditions and repeat per mission procedure. Contact the onboard medic if the change persists or you have symptoms.',
      };
    }
    return {
      level: 'ok', reason: `Small change from personal baseline (${description} ${metrics[entry.metric].unit}).`,
      action: 'Continue scheduled readings. Contact the onboard medic if you have symptoms.',
    };
  }

  function demoEntries(now = Date.now()) {
    const samples = {
      bp: [[118, 74], [119, 76], [117, 75], [116, 73], [121, 76], [120, 78], [122, 76], [118, 75], [123, 78], [120, 77]],
      pulse: [64, 69, 67, 70, 66, 72, 70, 65, 67, 72],
      glucose: [88, 91, 86, 92, 95, 90, 87, 93, 90, 94],
      temp: [36.6, 36.5, 36.7, 36.6, 36.5, 36.8, 36.7, 36.5, 36.6, 36.7],
      sleep: [7.8, 7.2, 7.5, 7.7, 7.3, 6.8, 6.9, 7.4, 6.6, 5.8],
      mood: [4, 4, 5, 4, 3, 4, 3, 4, 3, 3],
    };
    return Object.entries(samples).flatMap(([metric, readings], index) =>
      readings.map((reading, day) => ({
        id: `demo-${metric}-${day}`,
        metric,
        at: new Date(now - (9 - day) * DAY - index * 60_000).toISOString(),
        values: metric === 'bp' ? { systolic: reading[0], diastolic: reading[1] } : { value: reading },
        note: metric === 'sleep' && day === 9 ? 'Two interruptions during the night shift.' : '',
        ...(metric === 'glucose' ? { context: 'fasting' } : {}),
        demo: true,
      }))
    ).sort((a, b) => b.at.localeCompare(a.at));
  }

  const api = { metrics, validate, assess, demoEntries, comparisonDays, compareHistory };
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    globalThis.OrbitModel = api;
  }
})();
