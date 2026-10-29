// Experiment designer: build or edit a protocol (steps, questionnaires, conditions, soundscapes, display),
// preview single steps, test-run the whole session, save it in this browser or export/import it as a file.
// Unsaved work is kept as a draft in the browser, so a closed tab or a step preview loses nothing.
import { listAudio, saveAudio } from './audio_store.js';
import {
  BUILT_IN_PROTOCOLS, BUILT_IN_QUESTIONNAIRES, estimateSeconds, loadJson, newStep, slug, STEP_TYPES, validate,
} from './protocol.js';
import { AUDIO, BACKGROUNDS } from './stimuli.js';
import { deleteProtocol, getPref, listProtocols, saveProtocol, setPref } from './storage.js';
import { footer, nav } from './nav.js';
import { TEMPLATES } from './templates.js';
import { clear, deepCopy, download, h } from './util.js';

let P = null;            // protocol being edited
let root = null;
let saved = '';          // JSON of the last saved version (to show unsaved changes)
let ownAudio = [];       // names of audio files uploaded to this browser
const qCount = {};       // number of items of the built-in questionnaires (for duration estimates)

const ADVANCED = ['id', 'fixation_ms', 'iti_ms', 'time_limit_s', 'audio', 'background', 'shuffle_group', 'instructions', 'show_logos'];

export async function allProtocols() {
  const built = await Promise.all(BUILT_IN_PROTOCOLS.map(async (f) => ({ ...(await loadJson(f)), built_in: true })));
  return [...built, ...listProtocols()];
}

async function findProtocol(id) {
  return deepCopy((await allProtocols()).find((p) => p.id === id) || null);
}

export async function showDesigner(el, protocolId) {
  root = el;
  ownAudio = await listAudio();
  for (const [f] of Object.entries(BUILT_IN_QUESTIONNAIRES)) {
    if (!(f in qCount)) qCount[f] = (await loadJson(f)).sections.reduce((n, s) => n + s.items.length, 0);
  }
  const draft = getPref('draft', null);
  if (protocolId && protocolId !== 'draft') {
    P = await findProtocol(protocolId);
    saved = JSON.stringify(strip(P));
  } else if (draft) {
    P = draft.protocol;
    saved = draft.saved;
  }
  if (!P) return chooseStart();
  render();
}

// ---- helpers ------------------------------------------------------------------------------------------------
const strip = (p) => { const c = deepCopy(p); delete c._open; delete c.built_in; delete c._id_edited; return c; };
const dirty = () => JSON.stringify(strip(P)) !== saved;
const fmtMin = (sec) => (sec < 90 ? `${Math.round(sec)} s` : `${Math.round(sec / 60)} min`);
const stepSeconds = (s) => estimateSeconds(s, typeof s.questionnaire === 'string' ? qCount[s.questionnaire] : (s.questionnaire?.sections || []).reduce((n, x) => n + x.items.length, 0));

function touch() {
  setPref('draft', { protocol: P, saved });
  const bar = root.querySelector('.save-state');
  if (bar) { bar.textContent = dirty() ? '● Unsaved changes' : '✓ Saved'; bar.classList.toggle('unsaved', dirty()); }
  const total = root.querySelector('.total-time');
  if (total) total.textContent = fmtMin(P.steps.reduce((n, s) => n + stepSeconds(s), 0));
}

const field = (label, input, help) => h('label', { class: 'field' }, h('span', {}, label), input, help ? h('small', { class: 'muted' }, help) : null);

function input(obj, key, kind = 'text', extra = {}) {
  const el = kind === 'textarea' ? h('textarea', { rows: 3, placeholder: extra.placeholder || '' }) : h('input', { type: kind, ...extra });
  if (kind === 'checkbox') el.checked = !!obj[key]; else el.value = obj[key] ?? '';
  el.addEventListener(kind === 'checkbox' ? 'change' : 'input', () => {
    obj[key] = kind === 'checkbox' ? el.checked : kind === 'number' ? Number(el.value) : el.value;
    extra.onchange?.(el.value);
    touch();
  });
  if (extra.rerender) el.addEventListener('change', () => render());
  return el;
}

function select(obj, key, options, rerender = false) {
  const el = h('select', {}, ...Object.entries(options).map(([v, l]) => h('option', { value: v }, l)));
  el.value = obj[key] ?? '';
  el.addEventListener('change', () => { obj[key] = el.value; touch(); if (rerender) render(); });
  return el;
}

function soundOptions() {
  const o = { '': 'None' };
  for (const k of Object.keys(P.audio_slots || {})) o[k] = `Slot: ${k}`;
  for (const [k, v] of Object.entries(AUDIO)) o[k] = v.label;
  for (const n of ownAudio) o[`file:${n}`] = `Own file: ${n}`;
  return o;
}

// ---- start: templates ---------------------------------------------------------------------------------------
async function chooseStart() {
  const mine = listProtocols();
  clear(root).append(nav(), h('main', { class: 'page' },
    header('Experiment designer'),
    h('p', { class: 'lead-sm' }, 'Start from a template, open a saved experiment, or import a protocol file someone shared with you.'),
    h('div', { class: 'template-grid' },
      h('button', { class: 'template synapse', onclick: async () => start(await loadJson(BUILT_IN_PROTOCOLS[0]), true) },
        h('span', { class: 'tpl-icon' }, 'S'), h('strong', {}, 'SYNAPSE full session'), h('span', {}, 'The complete session of the SYNAPSE study: 3 questionnaires, baseline, 8 tasks, 2 soundscapes. About 40 minutes.')),
      ...TEMPLATES.map((t) => h('button', { class: 'template', onclick: () => start(t.make(), false) },
        h('span', { class: 'tpl-icon' }, t.icon), h('strong', {}, t.name), h('span', {}, t.about)))),
    mine.length ? h('section', { class: 'card' }, h('h2', {}, 'Your saved experiments'),
      ...mine.map((p) => h('div', { class: 'row space saved-row' }, h('span', {}, h('strong', {}, p.name), h('span', { class: 'muted small' }, ` · ${p.steps.length} steps`)),
        h('div', { class: 'row' }, h('button', { class: 'btn small', onclick: () => { P = deepCopy(p); saved = JSON.stringify(strip(P)); render(); } }, 'Edit'),
          h('a', { class: 'btn small primary', href: `#/start/${encodeURIComponent(p.id)}` }, 'Run'))))) : null,
    h('div', { class: 'row' }, importButton('Import a protocol file'))), footer());
}

function start(p, builtIn) {
  P = deepCopy(p);
  if (builtIn) P.built_in = true;
  saved = builtIn ? JSON.stringify(strip(P)) : '';
  P._open = null;
  render();
}

function importButton(label) {
  const fileIn = h('input', { type: 'file', accept: '.json,application/json', hidden: true });
  fileIn.addEventListener('change', async () => {
    try {
      const data = JSON.parse(await fileIn.files[0].text());
      const e = validate(data); if (e.length) throw new Error(e.join('\n'));
      delete data.built_in; P = data; saved = ''; render(); flash('Protocol imported. Save it to keep it in this browser.');
    } catch (e) { alert(`Cannot import this file:\n${e.message}`); }
  });
  return h('span', {}, h('button', { class: 'btn', onclick: () => fileIn.click() }, label), fileIn);
}

const header = (title) => h('div', { class: 'row space' }, h('h1', {}, title), h('a', { href: '#/guide', class: 'btn ghost' }, '? How to use the designer'));

// ---- step editor --------------------------------------------------------------------------------------------
function paramInput(step, key, spec) {
  if (spec.kind === 'number') return field(spec.label, input(step, key, 'number', { min: spec.min, max: spec.max, step: 'any', rerender: true }), spec.help);
  if (spec.kind === 'select') return field(spec.label, select(step, key, spec.options, true), spec.help);
  if (spec.kind === 'textarea') return field(spec.label, input(step, key, 'textarea', { placeholder: spec.help && key === 'instructions' ? 'Separate paragraphs with an empty line. Use {n} for the n-back level.' : '' }), key === 'instructions' ? spec.help : null);
  if (spec.kind === 'audio') return field(spec.label, select(step, key, soundOptions(), true), 'Plays in a loop during this step.');
  if (spec.kind === 'checkbox') return field(spec.label, input(step, key, 'checkbox'), spec.help);
  if (spec.kind === 'background') {
    return field(spec.label, select(step, key, { '': 'None', ...Object.fromEntries(Object.entries(BACKGROUNDS).map(([k, v]) => [k, v.label])) }));
  }
  if (spec.kind === 'levels') {
    const box = h('div', { class: 'inline-checks' }, ...[1, 2, 3, 4, 5].map((n) => {
      const c = h('input', { type: 'checkbox' });
      c.checked = (step.levels || []).includes(n);
      c.addEventListener('change', () => { step.levels = [1, 2, 3, 4, 5].filter((m) => (m === n ? c.checked : (step.levels || []).includes(m))); render(); });
      return h('label', {}, c, ` ${n}`);
    }));
    return field(spec.label, box);
  }
  if (spec.kind === 'questionnaire') {
    const custom = typeof step.questionnaire === 'object';
    const opts = { ...BUILT_IN_QUESTIONNAIRES, __custom: 'My own questions' };
    const sel = h('select', {}, ...Object.entries(opts).map(([v, l]) => h('option', { value: v }, l)));
    sel.value = custom ? '__custom' : step.questionnaire;
    sel.addEventListener('change', async () => {
      step.questionnaire = sel.value === '__custom'
        ? { id: step.id, title: step.title || 'Questionnaire', description: '', sections: [{ title: '', description: '', items: [
          { id: 'q1', text: 'How do you feel right now?', type: 'scale', points: 7, labels: ['Very bad', 'Very good'], required: true }] }] }
        : sel.value;
      render();
    });
    return h('div', { class: 'span-all' }, field(spec.label, sel), custom ? questionnaireEditor(step) : null);
  }
  return field(spec.label, input(step, key, 'text', key === 'title' ? { onchange: () => { const t = root.querySelector(`[data-step-title="${CSS.escape(step.id)}"]`); if (t) t.textContent = step.title; } } : {}), spec.help);
}

function questionnaireEditor(step) {
  const q = step.questionnaire;
  q.sections = q.sections?.length ? q.sections : [{ title: '', description: '', items: [] }];
  const box = h('div', { class: 'qedit' });
  const fileIn = h('input', { type: 'file', accept: '.json', hidden: true });
  fileIn.addEventListener('change', async () => {
    try {
      const data = JSON.parse(await fileIn.files[0].text());
      if (!Array.isArray(data.sections)) throw new Error('missing "sections"');
      step.questionnaire = data; render();
    } catch (e) { alert(`Not a questionnaire file: ${e.message}`); }
  });
  const n = q.sections.reduce((k, s) => k + s.items.length, 0);
  box.append(h('div', { class: 'row space' }, h('strong', {}, `My own questions · ${n} item${n === 1 ? '' : 's'}`),
    h('div', { class: 'row' },
      h('button', { class: 'btn small', onclick: () => download(`${q.id || 'questionnaire'}.json`, JSON.stringify(q, null, 2), 'application/json') }, 'Export'),
      h('button', { class: 'btn small', onclick: () => fileIn.click() }, 'Import'), fileIn)),
  field('Text shown above the questions', input(q, 'description', 'textarea')));
  q.sections.forEach((sec, si) => {
    const secBox = h('div', { class: 'qsection' });
    if (q.sections.length > 1 || sec.title) {
      secBox.append(h('div', { class: 'row' }, field(`Section ${si + 1} heading`, input(sec, 'title')),
        h('button', { class: 'btn ghost small', onclick: () => { if (!sec.items.length || confirm('Remove this section and its questions?')) { q.sections.splice(si, 1); render(); } } }, 'Remove section')));
    }
    sec.items.forEach((it, i) => {
      const opts = h('textarea', { rows: 3, placeholder: 'One option per line' });
      opts.value = (it.options || []).join('\n');
      opts.addEventListener('input', () => { it.options = opts.value.split('\n').map((s) => s.trim()).filter(Boolean); touch(); });
      const move = (d) => { const j = i + d; if (j < 0 || j >= sec.items.length) return; [sec.items[i], sec.items[j]] = [sec.items[j], sec.items[i]]; render(); };
      const typeSel = select(it, 'type', { single_choice: 'Single choice', dropdown: 'Dropdown', checkboxes: 'Multiple choice', scale: 'Rating scale (1…k)', text: 'Text', number: 'Number' }, true);
      const extra = [];
      if (['single_choice', 'dropdown', 'checkboxes'].includes(it.type)) extra.push(field('Options', opts));
      if (it.type === 'scale') {
        it.points ||= 7; it.labels ||= ['', ''];
        extra.push(h('div', { class: 'grid3' }, field('Points', input(it, 'points', 'number', { min: 2, max: 11 })),
          field('Label at 1', input(it.labels, 0)), field(`Label at ${it.points}`, input(it.labels, 1))));
      }
      secBox.append(h('div', { class: 'qitem' },
        h('div', { class: 'grid2' }, field(`Question ${i + 1}`, input(it, 'text')), field('Variable name (column in the data)', input(it, 'id'))),
        h('div', { class: 'grid3' }, field('Answer type', typeSel), field('Answer required', input(it, 'required', 'checkbox'))),
        ...extra,
        h('div', { class: 'row' },
          h('button', { class: 'btn ghost small', onclick: () => move(-1), title: 'Move up' }, '↑'), h('button', { class: 'btn ghost small', onclick: () => move(1), title: 'Move down' }, '↓'),
          h('button', { class: 'btn ghost small', onclick: () => { sec.items.splice(i + 1, 0, { ...deepCopy(it), id: `${it.id}_copy` }); render(); } }, 'Duplicate'),
          h('button', { class: 'btn ghost small', onclick: () => { sec.items.splice(i, 1); render(); } }, 'Remove'))));
    });
    secBox.append(h('button', { class: 'btn small', onclick: () => {
      const k = q.sections.reduce((m, s) => m + s.items.length, 0) + 1;
      sec.items.push({ id: `q${k}`, text: 'New question', type: 'scale', points: 7, labels: ['Not at all', 'Very much'], required: true });
      render();
    } }, '+ Add question'));
    box.append(secBox);
  });
  box.append(h('button', { class: 'btn small ghost', onclick: () => { q.sections.push({ title: 'New section', description: '', items: [] }); render(); } }, '+ Add section'));
  return box;
}

function summaryText(s) {
  const bits = [];
  if (s.type === 'nback') bits.push(`levels ${(s.levels || []).join(', ')} × ${s.trials_per_level} trials`);
  if (['stroop', 'flanker'].includes(s.type)) bits.push(`${s.trials} trials`);
  if (s.type === 'visual') bits.push(s.max_trials ? `${s.max_trials} images` : 'all images');
  if (s.type === 'baseline') bits.push(`${s.duration_s} s`);
  if (s.type === 'questionnaire') bits.push(typeof s.questionnaire === 'string' ? (BUILT_IN_QUESTIONNAIRES[s.questionnaire] || '') : 'own questions');
  if (s.practice_trials) bits.push(`${s.practice_trials} practice`);
  if (s.time_limit_s) bits.push(`limit ${fmtMin(s.time_limit_s)}`);
  return bits.join(' · ');
}

function stepCard(step, i) {
  const t = STEP_TYPES[step.type];
  const move = (d) => { const j = i + d; if (j < 0 || j >= P.steps.length) return; [P.steps[i], P.steps[j]] = [P.steps[j], P.steps[i]]; P._open = j; render(); };
  const params = Object.entries(t.params);
  const basic = params.filter(([k]) => !ADVANCED.includes(k));
  const adv = params.filter(([k]) => ADVANCED.includes(k));
  const badges = [step.shuffle_group ? `random order: ${step.shuffle_group}` : null, step.audio ? '♪ sound' : null,
    step.feedback && step.feedback !== 'none' ? 'feedback' : null].filter(Boolean);
  const card = h('details', { class: 'step', open: P._open === i, draggable: 'true', 'data-index': i,
    ontoggle: (e) => { if (e.currentTarget.open) P._open = i; } },
  h('summary', {},
    h('span', { class: 'drag', title: 'Drag to reorder' }, '⋮⋮'), h('span', { class: 'step-no' }, i + 1), h('span', { class: 'step-icon' }, t.icon || '•'),
    h('span', { class: 'step-main' }, h('strong', { 'data-step-title': step.id }, step.title || step.id),
      h('span', { class: 'muted small' }, ` ${t.label}${step.variant ? ` · ${step.variant}` : ''}${summaryText(step) ? ` · ${summaryText(step)}` : ''}`),
      ...badges.map((b) => h('span', { class: 'badge-soft' }, b))),
    h('span', { class: 'muted small step-time' }, `≈ ${fmtMin(stepSeconds(step))}`)),
  h('div', { class: 'grid2' }, ...basic.map(([k, spec]) => paramInput(step, k, spec))),
  h('details', { class: 'advanced' }, h('summary', {}, 'More options (timing, instructions, sound, background, random order, id)'),
    h('div', { class: 'grid2' }, field('Step id (in the data)', input(step, 'id')), ...adv.map(([k, spec]) => paramInput(step, k, spec)))),
  h('div', { class: 'row step-actions' },
    h('button', { class: 'btn small primary', onclick: () => preview(i), title: 'Run only this step (nothing is saved)' }, '▶ Preview'),
    h('button', { class: 'btn small', onclick: () => move(-1) }, '↑'), h('button', { class: 'btn small', onclick: () => move(1) }, '↓'),
    h('button', { class: 'btn small', onclick: () => { const c = deepCopy(step); c.id = `${step.id}_copy`; P.steps.splice(i + 1, 0, c); P._open = i + 1; render(); } }, 'Duplicate'),
    h('button', { class: 'btn ghost small', onclick: () => { if (confirm(`Delete the step "${step.title || step.id}"?`)) { P.steps.splice(i, 1); P._open = null; render(); } } }, 'Delete')));
  card.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', String(i)); card.classList.add('dragging'); });
  card.addEventListener('dragend', () => card.classList.remove('dragging'));
  card.addEventListener('dragover', (e) => { e.preventDefault(); card.classList.add('drop-target'); });
  card.addEventListener('dragleave', () => card.classList.remove('drop-target'));
  card.addEventListener('drop', (e) => {
    e.preventDefault();
    const from = Number(e.dataTransfer.getData('text/plain'));
    if (Number.isNaN(from) || from === i) return;
    const [s] = P.steps.splice(from, 1);
    P.steps.splice(i, 0, s);
    P._open = i;
    render();
  });
  return card;
}

function library() {
  return h('div', { class: 'library' }, ...Object.entries(STEP_TYPES).map(([k, t]) => h('button', { class: 'lib-card', title: `Add: ${t.label}`, onclick: () => {
    const at = P._open === null || P._open === undefined ? P.steps.length - (P.steps.at(-1)?.type === 'message' && !P.steps.at(-1).button ? 1 : 0) : P._open + 1;
    P.steps.splice(at, 0, newStep(k, P.steps.map((x) => x.id)));
    P._open = at;
    render();
    root.querySelectorAll('details.step')[at]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } }, h('span', { class: 'lib-icon' }, t.icon), h('strong', {}, t.label), h('span', {}, t.about))));
}

// ---- conditions, sound, display -----------------------------------------------------------------------------
function conditionsEditor() {
  const box = h('div', {});
  (P.session_fields ||= []).forEach((f, i) => {
    const opts = h('input', { type: 'text', value: f.options.join(', ') });
    opts.addEventListener('change', () => { f.options = opts.value.split(',').map((s) => s.trim()).filter(Boolean); render(); });
    box.append(h('div', { class: 'grid4' }, field('Label (shown to you)', input(f, 'label')), field('Column name in the data', input(f, 'id')),
      field('Options (comma-separated)', opts), h('button', { class: 'btn ghost small', onclick: () => { P.session_fields.splice(i, 1); render(); } }, 'Remove')));
  });
  box.append(h('div', { class: 'row' },
    h('button', { class: 'btn small', onclick: () => { P.session_fields.push({ id: 'condition', label: 'Condition', options: ['A', 'B'] }); render(); } }, '+ Add a condition'),
    h('button', { class: 'btn small ghost', onclick: () => { P.session_fields.push({ id: 'order', label: 'Order', options: ['AB', 'BA'] }); render(); } }, '+ Add an order (AB / BA)')));
  return box;
}

function slotsEditor() {
  const box = h('div', {});
  P.audio_slots ||= {};
  const fields = Object.fromEntries((P.session_fields || []).map((f) => [f.id, f.label || f.id]));
  const sounds = { '': 'None', ...Object.fromEntries(Object.entries(AUDIO).map(([k, v]) => [k, v.label])), ...Object.fromEntries(ownAudio.map((n) => [`file:${n}`, `Own file: ${n}`])) };
  for (const [name, slot] of Object.entries(P.audio_slots)) {
    const f = (P.session_fields || []).find((x) => x.id === slot.by);
    slot.map ||= {};
    box.append(h('div', { class: 'slot' },
      h('div', { class: 'grid3' }, field('Slot name', h('input', { value: name, disabled: true })),
        field('Chosen by the condition', select(slot, 'by', { '': 'Choose', ...fields }, true)),
        h('button', { class: 'btn ghost small', onclick: () => { delete P.audio_slots[name]; render(); } }, 'Remove')),
      h('div', { class: 'grid3' }, ...(f?.options || []).map((o) => field(`If ${f.label || f.id} = ${o}`, select(slot.map, o, sounds))))));
  }
  const up = h('input', { type: 'file', accept: 'audio/*', hidden: true });
  up.addEventListener('change', async () => {
    const file = up.files[0];
    if (!file) return;
    await saveAudio(file.name, file);
    ownAudio = await listAudio();
    render();
    flash(`"${file.name}" is stored in this browser.`);
  });
  box.append(h('div', { class: 'row' },
    h('button', { class: 'btn small', onclick: () => up.click() }, 'Upload an audio file'), up,
    h('button', { class: 'btn small ghost', onclick: () => {
      const name = prompt('Slot name (e.g. round1)'); if (name) { P.audio_slots[name] = { by: P.session_fields?.[0]?.id || '', map: {} }; render(); }
    } }, '+ Add a soundscape slot')),
  ownAudio.length ? h('p', { class: 'small muted' }, `Audio files in this browser: ${ownAudio.join(', ')}`) : null);
  return box;
}

function displayEditor() {
  const s = P.settings;
  return h('div', {},
    h('div', { class: 'grid3' },
      field('Show the countdown timer', input(s, 'timer_visible', 'checkbox')),
      field('When a time limit is reached', select(s, 'on_timeout', { show_continue: 'Show a Continue button (SYNAPSE)', end_step: 'End the step' })),
      field('Allow keyboard responses', input(s, 'keyboard', 'checkbox'), 'Buttons always work too.'),
      field('Play soundscapes', input(s, 'play_audio', 'checkbox')),
      field('Volume (0–1)', input(s, 'audio_volume', 'number', { min: 0, max: 1, step: 0.05 })),
      field('Colour theme', select(s, 'theme', { light: 'Light', dark: 'Dark' })),
      field('Theme follows a condition', select(s, 'theme_field', { '': 'No', ...Object.fromEntries((P.session_fields || []).map((f) => [f.id, f.label || f.id])) }, true))),
    s.theme_field ? h('div', { class: 'grid3' }, ...((P.session_fields || []).find((f) => f.id === s.theme_field)?.options || [])
      .map((o) => field(`Theme if ${o}`, select((s.theme_map ||= {}), o, { light: 'Light', dark: 'Dark' })))) : null);
}

// ---- page ---------------------------------------------------------------------------------------------------
const section = (title, help, body, open = true) => h('details', { class: 'card section', open },
  h('summary', {}, h('h2', {}, title), help ? h('p', { class: 'muted small' }, help) : null), body);

function render() {
  const errs = validate(P);
  const total = P.steps.reduce((n, s) => n + stepSeconds(s), 0);
  const tasks = P.steps.filter((s) => ['nback', 'stroop', 'flanker', 'visual'].includes(s.type)).length;
  const qs = P.steps.filter((s) => s.type === 'questionnaire').length;
  const nameIn = input(P, 'name', 'text', { onchange: (v) => { if (!P._id_edited && !P.built_in) { P.id = slug(v); const idEl = root.querySelector('#protocol-id'); if (idEl) idEl.value = P.id; } } });
  const idIn = input(P, 'id', 'text', { onchange: () => { P._id_edited = true; } });
  idIn.id = 'protocol-id';
  const pickSel = h('select', {}, h('option', { value: '' }, 'Open…'));
  allProtocols().then((list) => pickSel.append(...list.map((p) => h('option', { value: p.id }, `${p.name}${p.built_in ? ' (built-in)' : ''}`))));
  pickSel.addEventListener('change', async () => {
    if (!pickSel.value) return;
    if (dirty() && !confirm('Discard the unsaved changes?')) { pickSel.value = ''; return; }
    P = await findProtocol(pickSel.value); saved = JSON.stringify(strip(P)); render();
  });

  clear(root).append(nav(), h('div', { class: 'page designer' },
    header('Experiment designer'),
    h('div', { class: 'row wrap toolbar' },
      h('button', { class: 'btn', onclick: () => { if (!dirty() || confirm('Discard the unsaved changes?')) { setPref('draft', null); P = null; chooseStart(); } } }, '＋ New from template'),
      pickSel, importButton('Import file'),
      h('button', { class: 'btn', onclick: () => download(`${P.id}.json`, JSON.stringify(strip(P), null, 2), 'application/json') }, 'Export file')),
    P.built_in ? h('p', { class: 'note' }, 'This is the built-in SYNAPSE protocol. Your changes are saved as your own copy; the original stays unchanged.') : null,
    h('section', { class: 'card overview' },
      h('div', { class: 'grid2' }, field('Experiment name', nameIn), field('Protocol id (stored with the data)', idIn, 'Filled in from the name; letters, digits and _ only.')),
      field('Description (shown on the start page)', input(P, 'description', 'textarea')),
      h('div', { class: 'stat-row' },
        h('div', {}, h('strong', {}, P.steps.length), h('span', {}, 'steps')),
        h('div', {}, h('strong', {}, tasks), h('span', {}, 'tasks')),
        h('div', {}, h('strong', {}, qs), h('span', {}, 'questionnaires')),
        h('div', {}, h('strong', { class: 'total-time' }, fmtMin(total)), h('span', {}, 'estimated duration')))),
    section(`Steps (${P.steps.length})`, 'The session runs from top to bottom. Click a step to edit it, drag ⋮⋮ to reorder, ▶ Preview to try it.',
      h('div', {}, ...P.steps.map(stepCard),
        h('h3', {}, 'Add a step'), h('p', { class: 'muted small' }, 'It is added after the open step, or before the final thank-you page.'), library())),
    section('Conditions and counterbalancing', 'Asked when a session starts (e.g. lighting, group, task order) and saved in every data row. For random task order, give steps the same "random-order group" (in More options).',
      conditionsEditor(), (P.session_fields || []).length > 0),
    section('Soundscapes', 'Background sound during steps: a fixed sound per step, or a slot that picks the sound from a condition (e.g. order AB / BA).',
      slotsEditor(), Object.keys(P.audio_slots || {}).length > 0),
    section('Display and responses', 'Timer, time-limit behaviour, keyboard, colour theme.', displayEditor(), false),
    errs.length ? h('div', { class: 'errors card' }, h('strong', {}, 'Please fix before saving:'), h('ul', {}, ...errs.map((e) => h('li', {}, e)))) : null,
    h('div', { class: 'save-bar' },
      h('span', { class: `save-state ${dirty() ? 'unsaved' : ''}` }, dirty() ? '● Unsaved changes' : '✓ Saved'),
      h('div', { class: 'row' },
        h('button', { class: 'btn', disabled: errs.length > 0, onclick: testRun, title: 'Run the whole session as a demo with a Skip button; nothing is kept' }, '▶ Test run'),
        h('button', { class: 'btn', disabled: errs.length > 0, onclick: async () => { if (await save()) location.hash = `#/start/${encodeURIComponent(P.id)}`; } }, 'Save and run'),
        !P.built_in && listProtocols().some((x) => x.id === P.id) ? h('button', { class: 'btn ghost', onclick: () => {
          if (confirm(`Delete "${P.name}" from this browser?`)) { deleteProtocol(P.id); setPref('draft', null); P = null; chooseStart(); }
        } }, 'Delete') : null,
        h('button', { class: 'btn primary', disabled: errs.length > 0, onclick: save }, 'Save')))), footer());
  touch();
}

async function save() {
  if (P.built_in) {
    delete P.built_in;
    P.id = `${P.id}_my_version`;
    P.name = `${P.name} (my version)`;
  }
  if (listProtocols().some((x) => x.id === P.id) && saved !== '' && JSON.parse(saved).id !== P.id
    && !confirm(`A saved protocol with the id "${P.id}" exists. Replace it?`)) return false;
  const ok = saveProtocol(strip(P));
  if (ok) { saved = JSON.stringify(strip(P)); setPref('draft', { protocol: P, saved }); render(); flash('Saved in this browser.'); }
  return ok;
}

/** Runs one step (or the whole protocol) in try mode, then comes back here. */
function preview(i) {
  sessionStorage.setItem('synapse.preview', JSON.stringify({ protocol: strip(P), step: i }));
  location.hash = '#/preview';
}
function testRun() {
  sessionStorage.setItem('synapse.preview', JSON.stringify({ protocol: strip(P), step: null }));
  location.hash = '#/preview';
}

function flash(msg) {
  const el = h('div', { class: 'toast' }, msg);
  document.body.append(el);
  setTimeout(() => el.remove(), 2600);
}
