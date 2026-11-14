'use strict';
(() => {
  const dialog = element('dialog');
  dialog.setAttribute('aria-label', 'Daily crew check-in');
  const form = element('form');
  form.append(element('h2', 'Daily crew check-in'), element('p', 'Record today’s readings and symptoms together. All fields use the units shown.', 'hint'));
  const fields = ['pulse', 'bp', 'temp', 'sleep', 'mood'];
  const inputs = {};
  for (const metric of fields) {
    const group = element('div', undefined, 'form-grid');
    for (const field of metrics[metric].fields) {
      const label = element('label', field.label + ' · ' + metrics[metric].unit);
      const input = element('input');
      Object.assign(input, { type: 'number', min: field.min, max: field.max, step: field.step, required: true });
      inputs[metric + field.key] = input;
      label.append(input);
      group.append(label);
    }
    form.append(group);
  }
  const notesLabel = element('label', 'Symptoms and context');
  const notes = element('textarea');
  notes.maxLength = 500;
  notes.placeholder = 'Describe symptoms, recent activity or sleep interruptions';
  notesLabel.append(notes);
  const urgentLabel = element('label', undefined, 'checkbox');
  const urgent = element('input');
  urgent.type = 'checkbox';
  urgentLabel.append(urgent, 'Serious symptoms — contact the onboard medic immediately');
  const error = element('p', '', 'urgent-text');
  error.setAttribute('role', 'alert');
  const actions = element('div', undefined, 'dialog-actions');
  const submit = element('button', 'Save daily check-in', 'primary');
  submit.type = 'submit';
  actions.append(button('Cancel', () => dialog.close(), 'secondary'), submit);
  form.append(notesLabel, urgentLabel, error, actions);
  dialog.append(form);
  document.body.append(dialog);
  const trigger = button('Daily check-in', () => {
    form.reset();
    error.textContent = '';
    dialog.showModal();
  }, 'primary');
  trigger.dataset.checkin = '';
  document.querySelector('.hero-actions').prepend(trigger);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const at = new Date().toISOString();
    const rows = fields.map((metric) => ({
      id: crypto.randomUUID(), metric, at, demo: mode === 'demo', urgent: urgent.checked,
      note: notes.value.trim(),
      values: Object.fromEntries(metrics[metric].fields.map(({ key }) => [key, inputs[metric + key].valueAsNumber])),
    }));
    const invalid = rows.map((row) => validate(row)).find(Boolean);
    if (invalid) { error.textContent = invalid; return; }
    try { updateJournal((current) => [...rows, ...current]); }
    catch { error.textContent = 'Could not save. Check browser storage and try again.'; return; }
    dialog.close();
    render();
    notify('Daily check-in saved.');
  });
})();
