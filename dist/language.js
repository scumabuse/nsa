(() => {
  'use strict';

  const pairs = `
Skip to content|Перейти к содержимому
Crew health log|Журнал здоровья экипажа
Overview|Обзор
Log|Журнал
NASA data|Данные NASA
Guide|Руководство
Mode|Режим
Training|Обучение
Personal log|Личный журнал
Crew health|Здоровье экипажа
Reading assistant|Помощник по показателям
Dismiss health alert|Закрыть предупреждение о здоровье
Explain my readings|Объяснить мои показатели
Import readings|Импорт измерений
Imported readings:|Загружено измерений:
Duplicates skipped:|Пропущено дубликатов:
Import failed.|Ошибка импорта.
The JSON file is invalid.|Некорректный файл JSON.
Import file exceeds 5 MB.|Размер файла превышает 5 МБ.
Journal mode changed. Select the file again.|Режим журнала изменился. Выберите файл снова.
Select a JSON report or an array of readings.|Выберите отчёт JSON или файл с массивом измерений.
Open the journal mode that matches this report.|Переключитесь в режим журнала, соответствующий отчёту.
Invalid reading in the import file.|В файле есть некорректное измерение.
ORBIT HEALTH CREW HANDOFF|ORBIT HEALTH · СВОДКА ДЛЯ МЕДИКА
TRAINING EXERCISE · SYNTHETIC CREW READINGS|УЧЕБНЫЙ РЕЖИМ · ВЫМЫШЛЕННЫЕ ИЗМЕРЕНИЯ
PERSONAL LOG · SHARE THROUGH THE MISSION CHANNEL|ЛИЧНЫЙ ЖУРНАЛ · ПЕРЕДАЧА ПО КАНАЛУ МИССИИ
Prepared (UTC):|Подготовлено (UTC):
Recorded (UTC):|Записано (UTC):
Snapshot (UTC):|Снимок истории (UTC):
Status:|Статус:
Next step:|Следующий шаг:
Crew note:|Заметка экипажа:
Meal context:|Контекст приёма пищи:
RECORDED SYMPTOMS|ЗАПИСАННЫЕ СИМПТОМЫ
Latest recorded value per metric. This file is saved locally for manual sharing.|Последнее записанное значение каждого показателя. Файл сохранён на устройстве для ручной передачи.
Change from personal baseline|Отклонение от личной нормы
Small change from personal baseline|Небольшое отклонение от личной нормы
This reading contains invalid data.|Измерение содержит некорректные данные.
Check the timestamp and values.|Проверьте дату и значения.
Mission timeline|Хронология миссии
Current readings|Текущие измерения
Return to current readings|Вернуться к текущим измерениям
Why this alert?|Почему появилось предупреждение?
Review comparison|Посмотреть сравнение
Symptom note|Описание симптома
Save symptom|Записать симптом
Symptom saved.|Симптом записан.
Personal baseline:|Личная норма:
More comparison days needed:|Не хватает дней для сравнения:
Training comparison uses the exercise range.|Учебные значения сравниваются с диапазоном сценария.
Local assessment|Локальная оценка
Gemini · Training example|Gemini · Учебный пример
Preparing the training explanation…|Готовим пояснение учебного примера…
Gemini is unavailable. The local assessment is shown above.|Gemini недоступен. Локальная оценка показана выше.
Personal readings stay on this device.|Личные измерения остаются на этом устройстве.
Log readings, review changes and prepare a handoff for the onboard medic.|Записывайте показатели, отслеживайте изменения и готовьте отчёт для бортового медика.
New reading|Новое измерение
Review training scenario|Открыть учебный сценарий
Health metrics|Показатели здоровья
Latest readings|Последние измерения
Trends|Динамика
Metric|Показатель
Period|Период
7 days|7 дней
30 days|30 дней
All time|За всё время
Measurement context|Условия измерения
Fasting|Натощак
After a meal|После еды
Unspecified|Не указано
Measurement log|Журнал измерений
Review readings and download a report to share through the mission channel.|Просматривайте измерения и скачивайте отчёт для передачи по каналу связи миссии.
All metrics|Все показатели
Download crew handoff|Скачать отчёт для медика
Download JSON report|Скачать отчёт JSON
Mars radiation archive|Архив радиации Марса
Curiosity’s Radiation Assessment Detector · Sol 1 · 7 August 2012 UTC|Детектор радиации RAD марсохода Curiosity · Сол 1 · 7 августа 2012 г., UTC
Historical instrument data|Архивные данные прибора
These are absorbed dose rates in the rover’s detectors. Crew exposure requires onboard dosimetry. The archive stays separate from crew readings and health status.|Это мощность поглощённой дозы в детекторах марсохода. Для оценки облучения экипажа нужна бортовая дозиметрия. Архив хранится отдельно от журнала здоровья экипажа.
Absorbed dose rate|Мощность поглощённой дозы
Detector|Детектор
Silicon|Кремний
Plastic scintillator|Пластиковый сцинтиллятор
Observation (UTC)|Наблюдение (UTC)
View observation table|Открыть таблицу наблюдений
UTC time|Время UTC
Dose rate|Мощность дозы
Source and method|Источник и метод
NASA Planetary Data System dataset|Набор данных NASA Planetary Data System
. The chart uses all 14 observations from|. На графике показаны все 14 наблюдений из
. The dose-rate values come directly from the archive. The extraction converts ordinal dates to UTC calendar timestamps and checks each value against the label’s byte offsets.|. Значения взяты из архива. Даты переведены в календарный формат UTC, а значения проверены по смещениям байтов в метаданных.
NASA PDS dataset record|Описание набора NASA PDS
Source data (TXT)|Исходные данные (TXT)
Product label (LBL)|Метаданные (LBL)
Instrument data format and detector design|Формат данных и конструкция детекторов
Crew guide|Руководство экипажа
Measurement instructions and what to do when readings change.|Как проводить измерения и что делать, когда показатели меняются.
Taking measurements|Как проводить измерения
Five spaceflight hazards|Пять опасностей космического полёта
Space radiation|Космическая радиация
Use onboard dosimetry and mission event records to review exposure.|Оценивайте облучение по бортовой дозиметрии и журналу событий миссии.
Explore NASA’s Mars radiation measurements.|Посмотреть измерения радиации на Марсе.
Isolation and confinement|Изоляция и замкнутое пространство
Sleep and mood records can help crew members notice and discuss changes.|Записи сна и настроения помогают экипажу замечать и обсуждать изменения.
Distance from Earth|Удалённость от Земли
Follow the onboard protocol when communications are delayed. Download a report for the next contact window.|При задержке связи следуйте бортовому протоколу. Скачайте отчёт для следующего сеанса связи.
Altered gravity|Изменённая гравитация
Compare heart rate and blood pressure at similar activity levels and postures. Follow the mission plan for separate bone health measurements.|Сравнивайте пульс и давление при схожей активности и одинаковом положении тела. Оценку состояния костей проводите по плану миссии.
Hostile or closed environments|Неблагоприятная или замкнутая среда
Review changes in sleep or well-being alongside cabin conditions. Tell the crew if several people report similar changes.|Учитывайте условия в кабине при изменениях сна или самочувствия. Сообщите экипажу, если несколько человек заметили похожие изменения.
NASA Human Research Program|Программа исследований человека NASA
Reading the status labels|Что означают статусы
Training uses synthetic crew readings. The personal log compares recent measurements with your own history. If a reading changes, check the conditions, log the context and follow the mission medical protocol. Report serious symptoms to the onboard medic immediately.|В обучении используются вымышленные измерения. Личный журнал сравнивает свежие показатели с вашей историей. При изменении показателя проверьте условия измерения, запишите их и следуйте медицинскому протоколу миссии. При серьёзных симптомах сразу сообщите бортовому медику.
Hackathon prototype|Прототип хакатона
Moon maps:|Карты Луны:
Mars relief:|Рельеф Марса:
Planet colors:|Цветовые карты планет:
Data stored in this browser|Данные хранятся в этом браузере
Available offline · Data stays on this device|Доступно офлайн · Данные остаются на устройстве
Measurement date and time|Дата и время измерения
Notes|Заметки
Posture, recent activity or how you feel|Положение тела, недавняя активность или самочувствие
Report serious symptoms|Сообщить о серьёзных симптомах
Contact the onboard medic immediately using the mission protocol. Logging this reading sends no message.|Сразу свяжитесь с бортовым медиком по протоколу миссии. Запись показателя сама по себе не отправляет сообщение.
Cancel|Отмена
Save|Сохранить
Delete this reading?|Удалить это измерение?
Delete|Удалить
Edit|Редактировать
Edit reading|Редактирование измерения
Add reading|Добавить измерение
View trend|Посмотреть динамику
Next|Далее
Previous|Назад
Blood pressure|Артериальное давление
Systolic|Систолическое
Diastolic|Диастолическое
Heart rate|Пульс
Glucose|Глюкоза
Temperature|Температура
Sleep|Сон
Sleep duration|Продолжительность сна
Mood|Настроение
Mood rating|Оценка настроения
mmHg|мм рт. ст.
mg/dL|мг/дл
bpm|уд/мин
Within demo range|В пределах учебного диапазона
Near personal baseline|Близко к личной норме
Review needed|Нужно проверить
Serious symptoms|Серьёзные симптомы
Serious symptoms reported|Отмечены серьёзные симптомы
Serious symptoms reported.|Отмечены серьёзные симптомы.
Reading out of date|Измерение устарело
Insufficient data|Недостаточно данных
No readings yet|Измерений пока нет
No readings yet.|Измерений пока нет.
No reading|Нет измерения
Add a reading to start tracking.|Добавьте измерение, чтобы начать наблюдение.
Check reading dates and the status shown for each metric.|Проверьте даты измерений и статус каждого показателя.
See the metric cards for next steps.|Следующие шаги указаны в карточках показателей.
Training mode · Synthetic crew records|Учебный режим · Вымышленные записи экипажа
Personal log · On this device|Личный журнал · На этом устройстве
Training log|Учебный журнал
No readings match these filters.|По этим фильтрам измерений нет.
No readings match this filter.|По этому фильтру измерений нет.
Readings:|Измерений:
Latest:|Последнее:
Reading saved.|Измерение сохранено.
Reading deleted.|Измерение удалено.
Report downloaded.|Отчёт скачан.
Daily check-in|Ежедневный осмотр
Daily crew check-in|Ежедневный осмотр экипажа
Record today’s readings and symptoms together. All fields use the units shown.|Запишите сегодняшние показатели и симптомы. Для каждого поля указаны единицы измерения.
Symptoms and context|Симптомы и обстоятельства
Describe symptoms, recent activity or sleep interruptions|Опишите симптомы, недавнюю активность или прерывания сна
Serious symptoms — contact the onboard medic immediately|При серьёзных симптомах немедленно свяжитесь с бортовым медиком
Save daily check-in|Сохранить осмотр
Daily check-in saved.|Осмотр сохранён.
Body map|Карта тела
Body area|Часть тела
Organs|Органы
Skeleton|Скелет
Hands|Кисти
Feet|Стопы
Leg nerves|Нервы ног
Record symptoms|Записать симптомы
Zoom|Масштаб
Zoom in|Увеличить
Zoom out|Уменьшить
Anatomy zoom|Масштаб карты тела
Anatomy view|Вид карты тела
Viewing angle|Ракурс
Rotate anatomy model|Вращение анатомической модели
Front|Спереди
Side|Сбоку
Back|Назад
Drag to rotate. Use the arrows when the model has focus.|Перетащите модель для вращения. Когда модель в фокусе, используйте клавиши со стрелками.
Interactive anatomical zones|Интерактивные зоны тела
Interactive body illustration|Интерактивная фигура
Sections|Разделы
Language|Язык
Close|Закрыть
Head|Голова
Neck|Шея
Chest|Грудная клетка
Abdomen|Живот
Pelvis|Таз
Brain|Мозг
Trachea|Трахея
Heart|Сердце
Liver|Печень
Stomach|Желудок
Small intestine|Тонкая кишка
Large intestine|Толстая кишка
Bladder|Мочевой пузырь
Skull|Череп
Spine|Позвоночник
Sternum|Грудина
Part of the skeletal system.|Часть скелета.
Part of the foot skeleton.|Часть скелета стопы.
Pumps blood through the body.|Перекачивает кровь по организму.
Exchanges oxygen and carbon dioxide.|Обеспечивает обмен кислорода и углекислого газа.
Filters blood and helps regulate fluid balance.|Фильтрует кровь и помогает поддерживать водный баланс.
Add a reading to the log.|Добавьте измерение в журнал.
This reading is within the training range.|Показатель в пределах учебного диапазона.
This reading is outside the training range.|Показатель вне учебного диапазона.
Continue scheduled readings for the exercise.|Продолжайте измерения по учебному расписанию.
Meal context is missing.|Не указано время относительно еды.
Add meal context to select the demo range.|Укажите, было ли измерение до или после еды.
Add meal context to compare against personal history.|Укажите, было ли измерение до или после еды, чтобы сравнить с личной историей.
This reading is more than 48 hours old.|Измерение сделано более 48 часов назад.
Take a new reading per the mission monitoring schedule.|Сделайте новое измерение по расписанию миссии.
The baseline needs readings on at least three previous days within the last 30 days.|Для личной нормы нужны измерения минимум за три предыдущих дня из последних 30.
Keep logging in comparable conditions. Contact the onboard medic if you have symptoms.|Продолжайте запись в сопоставимых условиях. При симптомах свяжитесь с бортовым медиком.
Notify the crew and onboard medic immediately. Follow the mission emergency medical protocol without waiting for Earth.|Немедленно сообщите экипажу и бортовому медику. Следуйте экстренному медицинскому протоколу миссии без ожидания ответа с Земли.
Check measurement conditions and repeat per mission procedure. Contact the onboard medic if the change persists or you have symptoms.|Проверьте условия и повторите измерение по протоколу. Если изменение сохраняется или есть симптомы, свяжитесь с бортовым медиком.
Review measurement conditions, repeat per mission procedure and contact the crew medic if the change persists.|Проверьте условия измерения, повторите его по протоколу и обратитесь к медику, если изменение сохраняется.
Continue scheduled readings. Contact the onboard medic if you have symptoms.|Продолжайте измерения по расписанию. При симптомах свяжитесь с бортовым медиком.
Systolic pressure must be higher than diastolic pressure.|Систолическое давление должно быть выше диастолического.
Enter a valid date and time. A reading cannot be in the future.|Укажите корректные дату и время. Измерение не может быть в будущем.
Could not save. Check browser storage and try again.|Не удалось сохранить. Проверьте хранилище браузера и попробуйте снова.
`;
  const dictionary = new Map(pairs.trim().split('\n').map(line => line.trim().split('|')));
  const anatomy = {
    lung: ['лёгкое', 'n'], kidney: ['почка', 'f'], 'upper arm': ['плечо', 'n'],
    forearm: ['предплечье', 'n'], hand: ['кисть', 'f'], thigh: ['бедро', 'n'],
    'lower leg': ['голень', 'f'], foot: ['стопа', 'f'], palm: ['ладонь', 'f'],
    thumb: ['большой палец руки', 'm'], 'big toe': ['большой палец стопы', 'm'],
    'index finger': ['указательный палец', 'm'], 'middle finger': ['средний палец', 'm'],
    'ring finger': ['безымянный палец', 'm'], 'little finger': ['мизинец', 'm'],
    clavicle: ['ключица', 'f'], humerus: ['плечевая кость', 'f'], radius: ['лучевая кость', 'f'],
    ulna: ['локтевая кость', 'f'], femur: ['бедренная кость', 'f'],
    kneecap: ['коленная чашечка', 'f'], tibia: ['большеберцовая кость', 'f'],
    fibula: ['малоберцовая кость', 'f'], 'heel bone': ['пяточная кость', 'f'],
    'ankle bones': ['кости голеностопа', 'p'], metatarsals: ['кости плюсны', 'p'],
    'sciatic nerve': ['седалищный нерв', 'm'], 'tibial nerve': ['большеберцовый нерв', 'm'],
    'fibular nerve': ['малоберцовый нерв', 'm'],
  };
  const phrases = [...dictionary].filter(([english]) => english.length > 5).sort((a, b) => b[0].length - a[0].length);
  const original = new WeakMap();
  const attributes = ['aria-label', 'placeholder', 'title'];
  let language = 'en';
  try { if (localStorage.getItem('orbit-health.language') === 'ru') language = 'ru'; } catch {}

  function translate(text) {
    const trimmed = text.trim();
    if (!trimmed) return text;
    let result = dictionary.get(trimmed);
    const side = /^(Right|Left) (.+)$/.exec(trimmed);
    if (!result && side) {
      const [, direction, part] = side;
      const numbered = /^(rib|toe) (\d+)$/.exec(part);
      const item = anatomy[part] || (numbered && [numbered[1] === 'rib' ? 'ребро ' + numbered[2] : 'палец стопы ' + numbered[2], numbered[1] === 'rib' ? 'n' : 'm']);
      if (item) {
        const endings = { m: 'ый', f: 'ая', n: 'ое', p: 'ые' };
        result = (direction === 'Right' ? 'Прав' : 'Лев') + endings[item[1]] + ' ' + item[0];
      }
    }
    if (!result) {
      result = trimmed;
      for (const [from, to] of phrases) result = result.replaceAll(from, to);
      result = result.replace(/(.+) trend$/, 'Динамика: $1').replace(/^＋ New reading$/, '＋ Новое измерение');
    }
    return text.replace(trimmed, result);
  }

  function update(node, key, value, write) {
    if (!value) return;
    let entries = original.get(node);
    if (!entries) original.set(node, entries = new Map());
    const previous = entries.get(key);
    const source = previous?.output === value ? previous.source : value;
    const output = language === 'ru' ? translate(source) : source;
    entries.set(key, { source, output });
    if (value !== output) write(output);
  }

  window.OrbitTranslate = text => language === 'ru' ? translate(text) : text;

  function visit(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.parentElement?.closest('script, style, [translate="no"]')) return;
      update(node, 'text', node.data, value => { node.data = value; });
    } else if (node.nodeType === Node.ELEMENT_NODE && !node.closest('script, style, [translate="no"]')) {
      for (const name of attributes) update(node, name, node.getAttribute(name), value => node.setAttribute(name, value));
      for (const child of node.childNodes) visit(child);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const control = document.getElementById('language');
    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'childList') record.addedNodes.forEach(visit);
        else visit(record.target);
      }
    });
    function apply() {
      document.documentElement.lang = language;
      control.value = language;
      visit(document.body);
      document.title = language === 'ru' ? 'Orbit Health — Здоровье экипажа' : 'Orbit Health — Crew health monitoring';
    }
    apply();
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: attributes });
    control.addEventListener('change', () => {
      language = control.value;
      try { localStorage.setItem('orbit-health.language', language); } catch {}
      apply();
    });
  });
})();
