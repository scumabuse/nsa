(function () {
  'use strict';

  const DAY = 86_400_000;
  const glucoseContexts = ['fasting', 'postmeal', 'unspecified'];
  const metrics = {
    bp: {
      label: 'Давление', unit: 'мм рт. ст.',
      fields: [
        { key: 'systolic', label: 'Систолическое', min: 20, max: 350, step: 1 },
        { key: 'diastolic', label: 'Диастолическое', min: 10, max: 250, step: 1 },
      ],
      guide: 'Используйте бортовой тонометр и манжету подходящего размера. Отдохните перед измерением и держите руку на уровне сердца, соблюдая протокол миссии.',
      context: 'Сопоставляйте измерения в одинаковом положении тела и условиях. Смена гравитации влияет на распределение жидкости и работу сердечно-сосудистой системы.',
    },
    pulse: {
      label: 'Пульс', unit: 'уд/мин',
      fields: [{ key: 'value', label: 'Пульс', min: 1, max: 300, step: 1 }],
      guide: 'Измерьте пульс в покое бортовым датчиком по инструкции. Если измерение сделано после нагрузки, отметьте это в заметке.',
      context: 'Нагрузка, сон и смена гравитации могут влиять на пульс. Для сравнения измеряйте его в сходных условиях.',
    },
    glucose: {
      label: 'Глюкоза', unit: 'мг/дл',
      fields: [{ key: 'value', label: 'Глюкоза', min: 1, max: 1500, step: 1 }],
      guide: 'Используйте глюкометр по инструкции прибора и протоколу миссии. Вымойте и высушите руки перед замером. Укажите связь с приёмом пищи.',
      context: 'Сопоставляйте замеры с одинаковой связью с приёмом пищи. Для записи после еды укажите время после приёма пищи в заметке.',
    },
    temp: {
      label: 'Температура', unit: '°C',
      fields: [{ key: 'value', label: 'Температура', min: 20, max: 50, step: 0.1 }],
      guide: 'Используйте бортовой термометр по инструкции. При повторном измерении сохраняйте способ и место замера.',
      context: 'Температура среды, физическая нагрузка, время суток и способ измерения могут влиять на показание.',
    },
    sleep: {
      label: 'Сон', unit: 'ч',
      fields: [{ key: 'value', label: 'Продолжительность сна', min: 0, max: 24, step: 0.1 }],
      guide: 'Укажите суммарное время сна за последние 24 часа, включая короткие периоды сна. Возьмите данные из журнала или носимого устройства.',
      context: 'Освещение, шум и график смен могут нарушать сон. В заметке можно отметить смену графика или прерывания сна.',
    },
    mood: {
      label: 'Настроение', unit: 'из 5',
      fields: [{ key: 'value', label: 'Оценка настроения', min: 1, max: 5, step: 1 }],
      guide: 'Оцените настроение за текущий день по шкале от 1 (очень плохое) до 5 (очень хорошее). При желании укажите обстоятельства в заметке.',
      context: 'Изоляция, замкнутая среда и качество сна могут отражаться на настроении. Самооценка даёт контекст для разговора с медицинским специалистом.',
    },
  };

  const trendThresholds = {
    bp: { systolic: 15, diastolic: 10 },
    pulse: { value: 15 }, glucose: { value: 25 }, temp: { value: 0.7 },
    sleep: { value: 1.5 }, mood: { value: 2 },
  };

  function validate(entry, now = Date.now()) {
    if (!entry || typeof entry.id !== 'string' || !entry.id.trim()) {
      return 'У записи должен быть идентификатор.';
    }
    if (!Object.hasOwn(metrics, entry.metric)) return 'Выберите показатель.';
    const at = Date.parse(entry.at);
    if (!Number.isFinite(at) || new Date(at).toISOString() !== entry.at || at > now) {
      return 'Укажите корректные дату и время замера. Замер не может быть в будущем.';
    }
    if (typeof entry.note !== 'string' || entry.note.length > 500) {
      return 'Заметка должна содержать не более 500 символов.';
    }
    if (entry.demo !== undefined && typeof entry.demo !== 'boolean' ||
        entry.urgent !== undefined && typeof entry.urgent !== 'boolean') {
      return 'Проверьте тип записи и отметку о симптомах.';
    }
    if (entry.context !== undefined &&
        (entry.metric !== 'glucose' || !glucoseContexts.includes(entry.context))) {
      return 'Укажите условия измерения глюкозы.';
    }
    const { fields } = metrics[entry.metric];
    const { values } = entry;
    if (!values || typeof values !== 'object' || Object.keys(values).length !== fields.length ||
        !fields.every(({ key }) => Object.hasOwn(values, key))) {
      return 'Заполните все поля показателя.';
    }
    for (const { key, label, min, max, step } of fields) {
      const value = values[key];
      if (!Number.isFinite(value) || value < min || value > max) {
        return `${label} — укажите число от ${min} до ${max}.`;
      }
      if (Math.abs(value / step - Math.round(value / step)) > 1e-8) {
        return `${label} — допустимый шаг ${step}.`;
      }
    }
    if (entry.metric === 'bp' && values.systolic <= values.diastolic) {
      return 'Систолическое давление должно быть выше диастолического.';
    }
    return '';
  }

  function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }

  function compareHistory(entry, entries) {
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
    if (daily.size < 3) return null;
    return metrics[entry.metric].fields.map(({ key, label }) => {
      const baseline = median([...daily.values()].map(values => median(values.map(value => value[key]))));
      const delta = Math.round((entry.values[key] - baseline) * 100) / 100;
      return { label, delta, large: Math.abs(delta) >= trendThresholds[entry.metric][key] };
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
        level: 'unknown', reason: 'Не указана связь замера глюкозы с приёмом пищи.',
        action: 'Укажите условия замера, чтобы выбрать учебный диапазон.',
      };
    }
    if (outside[metric]()) {
      return {
        level: 'watch', reason: 'Значение за пределами диапазона учебного сценария.',
        action: 'В сценарии следует проверить условия замера, повторить его по протоколу и сообщить медику экипажа, если отклонение подтвердится.',
      };
    }
    return {
      level: 'ok', reason: 'Значение в пределах диапазона учебного сценария.',
      action: 'Продолжайте плановые записи по графику учебной миссии.',
    };
  }

  function assess(entry, entries = [], now = Date.now()) {
    if (!entry) {
      return { level: 'unknown', reason: 'Измерений пока нет.', action: 'Добавьте запись в журнал.' };
    }
    if (entry.urgent === true) {
      return {
        level: 'urgent', reason: 'Отмечены острые симптомы.',
        action: 'Немедленно оповестите экипаж и бортового медика. Действуйте по аварийному медицинскому протоколу миссии и не ждите ответа с Земли.',
      };
    }
    if (validate(entry, now)) {
      return {
        level: 'unknown', reason: 'В записи есть некорректные данные.',
        action: 'Проверьте время и значения измерения.',
      };
    }
    if (now - Date.parse(entry.at) > 2 * DAY) {
      return {
        level: 'stale', reason: 'С момента записи прошло более 48 часов.',
        action: 'Обновите показатель по графику медицинского контроля миссии.',
      };
    }
    if (entry.demo === true) return assessDemo(entry);
    if (entry.metric === 'glucose' && (!entry.context || entry.context === 'unspecified')) {
      return {
        level: 'unknown', reason: 'Не указана связь замера глюкозы с приёмом пищи.',
        action: 'Уточните контекст, чтобы сопоставить запись с личной историей.',
      };
    }
    const comparison = compareHistory(entry, entries);
    if (!comparison) {
      return {
        level: 'unknown', reason: 'Для сравнения нужны замеры минимум за три предыдущих дня в пределах последних 30 дней.',
        action: 'Продолжайте вести журнал в сопоставимых условиях. При жалобах свяжитесь с бортовым медиком.',
      };
    }
    const description = comparison.map(({ label, delta }) =>
      `${label} ${delta > 0 ? '+' : ''}${delta.toLocaleString('ru-RU')}`).join(', ');
    if (comparison.some(({ large }) => large)) {
      return {
        level: 'watch', reason: `Заметное изменение относительно личной медианы (${description} ${metrics[entry.metric].unit}).`,
        action: 'Проверьте условия записи и повторите замер по протоколу. Если изменение сохраняется или есть жалобы, сообщите бортовому медику.',
      };
    }
    return {
      level: 'ok', reason: `Небольшое изменение относительно личной медианы (${description} ${metrics[entry.metric].unit}).`,
      action: 'Продолжайте плановые записи. При жалобах свяжитесь с бортовым медиком независимо от сравнения.',
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
        note: metric === 'sleep' && day === 9 ? 'Две паузы из-за ночной смены.' : '',
        ...(metric === 'glucose' ? { context: 'fasting' } : {}),
        demo: true,
      }))
    ).sort((a, b) => b.at.localeCompare(a.at));
  }

  const api = { metrics, validate, assess, demoEntries };
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    globalThis.OrbitModel = api;
  }
})();
