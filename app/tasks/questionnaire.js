// Questionnaire step: renders a questionnaire file (sections of items) and stores one answer row per item.
// Item types: single_choice, dropdown, checkboxes, text, number. Choice answers are also coded 1..k in option order.
import { questionnaireFor } from '../protocol.js';
import { clear, h, StepAborted } from '../util.js';

function field(item, idx) {
  const name = `q_${idx}`;
  const opts = item.type === 'scale' ? Array.from({ length: item.points || 5 }, (_, i) => String(i + 1)) : item.options || [];
  if (item.type === 'scale') {
    return h('div', { class: 'likert' },
      item.labels?.[0] ? h('span', { class: 'likert-end' }, item.labels[0]) : null,
      h('div', { class: 'likert-points' }, ...opts.map((o) => h('label', { class: 'likert-point' }, h('input', { type: 'radio', name, value: o }), h('span', {}, o)))),
      item.labels?.[1] ? h('span', { class: 'likert-end' }, item.labels[1]) : null);
  }
  if (item.type === 'dropdown') {
    return h('select', { name, id: name }, h('option', { value: '' }, 'Choose'), ...opts.map((o) => h('option', { value: o }, o)));
  }
  if (item.type === 'single_choice' || item.type === 'checkboxes') {
    const kind = item.type === 'checkboxes' ? 'checkbox' : 'radio';
    const scale = item.labels ? h('div', { class: 'scale-labels small muted' }, h('span', {}, item.labels[0] || ''), h('span', {}, item.labels[1] || '')) : null;
    return h('div', { class: `choices ${opts.length <= 7 && opts.every((o) => String(o).length < 4) ? 'inline' : ''}` },
      ...opts.map((o) => h('label', { class: 'choice' }, h('input', { type: kind, name, value: o }), h('span', {}, o))), scale);
  }
  return h('input', { name, id: name, type: item.type === 'number' ? 'number' : 'text', autocomplete: 'off' });
}

function value(form, item, idx) {
  const name = `q_${idx}`;
  if (item.type === 'checkboxes') return [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((i) => i.value);
  if (item.type === 'single_choice' || item.type === 'scale') return form.querySelector(`input[name="${name}"]:checked`)?.value ?? '';
  return form.elements[name]?.value.trim() ?? '';
}

export async function run(ctx) {
  const q = await questionnaireFor(ctx.step);
  const items = [];
  const form = h('form', { class: 'questionnaire', novalidate: true });
  form.append(h('h1', {}, ctx.step.title || q.title));
  if (q.description) form.append(h('p', { class: 'muted' }, q.description));
  for (const sec of q.sections) {
    const box = h('section', {}, sec.title ? h('h3', {}, sec.title) : null, sec.description ? h('p', { class: 'muted pre' }, sec.description) : null);
    for (const item of sec.items) {
      const idx = items.length;
      items.push(item);
      box.append(h('div', { class: 'item', 'data-idx': idx },
        h('label', { class: 'item-text pre', for: `q_${idx}` }, item.text, item.required ? h('span', { class: 'req' }, ' *') : null),
        item.help ? h('p', { class: 'small muted pre' }, item.help) : null, field(item, idx)));
    }
    form.append(box);
  }
  const submit = h('button', { class: 'btn primary', type: 'submit' }, 'Submit');
  const msg = h('p', { class: 'warn' });
  form.append(msg, submit);
  clear(ctx.stage).append(form);
  ctx.stage.scrollTop = 0;
  const started = performance.now();
  await new Promise((resolve, reject) => {
    const onAbort = () => reject(new StepAborted());
    ctx.signal.addEventListener('abort', onAbort, { once: true });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let missing = 0;
      items.forEach((it, i) => {
        const v = value(form, it, i);
        const empty = Array.isArray(v) ? !v.length : v === '';
        form.querySelector(`[data-idx="${i}"]`).classList.toggle('missing', it.required && empty);
        if (it.required && empty) missing++;
      });
      if (missing) {
        msg.textContent = `Please answer the ${missing} question${missing > 1 ? 's' : ''} marked in red.`;
        form.querySelector('.missing')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      ctx.signal.removeEventListener('abort', onAbort);
      const duration = Math.round(performance.now() - started);
      items.forEach((it, i) => {
        const v = value(form, it, i);
        const code = it.type === 'scale' && v !== '' ? Number(v)
          : ['single_choice', 'dropdown'].includes(it.type) && v !== '' ? (it.options || []).indexOf(v) + 1 : '';
        ctx.answer({ questionnaire_id: q.id, item_id: it.id, question: it.text.replace(/\s+/g, ' ').trim(),
          answer: Array.isArray(v) ? v.join('; ') : v, code, completion_ms: duration });
      });
      resolve();
    });
  });
}
