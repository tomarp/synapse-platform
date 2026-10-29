// Protocol = the experiment definition (JSON, format "synapse-protocol/1"): settings, session fields,
// soundscape slots and an ordered list of steps. STEP_TYPES describes every step type and its parameters;
// the designer (designer.js) and the validator are generated from it.
import { AUDIO, BACKGROUNDS } from './stimuli.js';
import { deepCopy } from './util.js';

const num = (label, def, min, max, help) => ({ kind: 'number', label, def, min, max, help });
const sel = (label, def, options, help) => ({ kind: 'select', label, def, options, help });
const text = (label, def, help, long = false) => ({ kind: long ? 'textarea' : 'text', label, def, help });

const BG = { kind: 'background', label: 'Background image', def: '' };
const GROUP = text('Random-order group', '', 'Steps with the same group name swap places in a random order for each session (counterbalancing).');
// options shared by the cognitive tasks
const TASK = {
  instructions: text('Instructions (empty = default text)', '', 'Write your own instructions, e.g. in another language.', true),
  practice_trials: num('Practice trials', 0, 0, 50, 'Run before the recorded trials (per level for n-back); stored with phase = practice.'),
  feedback: sel('Feedback', 'none', { none: 'None (SYNAPSE)', practice: 'During practice only', all: 'On every trial' }, 'Shows ✓ / ✗ for 0.6 s after each response.'),
};
const TIMING = {
  time_limit_s: num('Time limit (s, 0 = none)', 300, 0, 7200, 'When it runs out, a Continue button appears (or the step ends, see settings).'),
  audio: { kind: 'audio', label: 'Soundscape', def: '' },
  background: BG,
  shuffle_group: GROUP,
};

export const STEP_TYPES = {
  message: { label: 'Message / instructions', icon: '✉', about: 'A page of text: welcome, consent reminder, break, thank-you.', params: {
    title: text('Title', 'Information'), text: text('Text', '', '', true), button: text('Button label (empty = no button)', 'Continue'),
    show_logos: { kind: 'checkbox', label: 'Show institution and funder logos', def: false }, background: BG,
  } },
  questionnaire: { label: 'Questionnaire', icon: '☰', about: 'Built-in SYNAPSE questionnaires or your own questions (choice, rating scale, text, number).', params: {
    title: text('Title', 'Questionnaire'), questionnaire: { kind: 'questionnaire', label: 'Questionnaire', def: 'questionnaires/synapse_T1_ieq.json' },
    ...TIMING,
  } },
  baseline: { label: 'Baseline (rest)', icon: '◎', about: 'Rest with a fixation cross for a fixed time, e.g. for physiological baselines.', params: {
    title: text('Title', 'Baseline Signal Recording'), duration_s: num('Duration (s)', 300, 5, 3600),
    text: text('Text', 'Please remain still while keeping your eyes open.', '', true), audio: TIMING.audio, background: BG, shuffle_group: GROUP,
  } },
  nback: { label: 'N-back', icon: '⧉', about: 'Working memory: does the item match the one n steps back? Letters or digits, levels 1–5.', params: {
    title: text('Title', 'N-Back'), variant: sel('Stimuli', 'letter', { letter: 'Letters', digit: 'Digits' }),
    levels: { kind: 'levels', label: 'Levels (n)', def: [1, 2, 3] }, trials_per_level: num('Trials per level', 60, 1, 500),
    target_ratio: num('Target proportion', 0.3, 0, 1), fixation_ms: num('Fixation (ms)', 500, 0, 5000), iti_ms: num('Pause after response (ms)', 750, 0, 5000),
    ...TASK, ...TIMING,
  } },
  stroop: { label: 'Stroop', icon: 'Aa', about: 'Inhibition: name the ink colour. Colour words, words with emoji, or emotional words.', params: {
    title: text('Title', 'Color Identification'),
    variant: sel('Variant', 'word', { word: 'Colour words', emoji: 'Colour words with emoji', emotional_image: 'Emotional words (images)' }),
    trials: num('Trials', 60, 1, 500), congruent_ratio: num('Congruent proportion (colour words only)', 0, 0, 1),
    fixation_ms: num('Fixation (ms)', 750, 0, 5000), iti_ms: num('Pause after response (ms)', 1000, 0, 5000), ...TASK, ...TIMING,
  } },
  flanker: { label: 'Flanker', icon: '⇆', about: 'Selective attention: respond to the middle symbol, ignore the flankers. Arrows or digits.', params: {
    title: text('Title', 'Flanker Task'), variant: sel('Variant', 'arrow', { arrow: 'Arrows (left/right)', digit: 'Digits (even/odd)' }),
    trials: num('Trials', 60, 3, 600), fixation_ms: num('Fixation (ms)', 500, 0, 5000), iti_ms: num('Pause after response (ms)', 1000, 0, 5000),
    ...TASK, ...TIMING,
  } },
  visual: { label: 'Visual counting / shapes', icon: '◈', about: 'Visual processing: count objects in an image, or judge if two structures are the same.', params: {
    title: text('Title', 'Visual Counting'), variant: sel('Variant', 'count', { count: 'Counting (type a number)', shape: 'Shape comparison (same/different)' }),
    items: sel('Items', 'all', { all: 'All images', verifiable: 'Only images with a verifiable answer key' }),
    max_trials: num('Maximum trials (0 = all)', 0, 0, 100), iti_ms: num('Pause after response (ms)', 500, 0, 5000), ...TASK, ...TIMING,
  } },
};

export const DEFAULT_SETTINGS = { timer_visible: true, on_timeout: 'show_continue', keyboard: true, play_audio: true,
  audio_volume: 0.8, theme: 'light', theme_field: '', theme_map: {} };

/** Approximate duration of a step in seconds (for planning; real times depend on the participant). */
export function estimateSeconds(step, items = 15) {
  const cap = (s) => (step.time_limit_s > 0 ? Math.min(s, step.time_limit_s) : s);
  const per = (rt) => ((step.fixation_ms || 0) + (step.iti_ms || 0)) / 1000 + rt;
  const practice = (step.practice_trials || 0) * (step.type === 'nback' ? (step.levels || []).length : 1);
  switch (step.type) {
    case 'message': return 20;
    case 'baseline': return step.duration_s || 0;
    case 'questionnaire': return cap(20 + items * 7);
    case 'nback': return cap(((step.levels || []).length * (step.trials_per_level || 0) + practice) * per(0.9) + 15 * (step.levels || []).length);
    case 'stroop': return cap(((step.trials || 0) + practice) * per(0.9) + 20);
    case 'flanker': return cap(((step.trials || 0) + practice) * per(0.7) + 20);
    case 'visual': return cap(((step.max_trials || (step.variant === 'shape' ? 14 : 13)) + practice) * per(step.variant === 'shape' ? 4 : 15) + 20);
    default: return 0;
  }
}

export const slug = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'experiment';

/** Applies random-order groups: steps that share a group name swap places (seeded). Returns the new order. */
export function applyShuffleGroups(steps, rng) {
  const out = steps.slice();
  const groups = {};
  steps.forEach((s, i) => { if (s.shuffle_group) (groups[s.shuffle_group] ||= []).push(i); });
  for (const idx of Object.values(groups)) {
    const perm = idx.slice();
    for (let i = perm.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
    idx.forEach((pos, k) => { out[pos] = steps[perm[k]]; });
  }
  return out;
}

export function newStep(type, existingIds = []) {
  const step = { id: '', type };
  for (const [k, p] of Object.entries(STEP_TYPES[type].params)) step[k] = deepCopy(p.def);
  let i = 1;
  while (existingIds.includes(`${type}_${i}`)) i++;
  step.id = `${type}_${i}`;
  return step;
}

export function blankProtocol() {
  return { format: 'synapse-protocol/1', id: `protocol_${Date.now()}`, name: 'New experiment', description: '',
    settings: deepCopy(DEFAULT_SETTINGS), session_fields: [], audio_slots: {},
    steps: [{ ...newStep('message'), id: 'welcome', title: 'Welcome', text: 'Thank you for taking part.' }] };
}

/** Returns a list of problems (empty = valid). */
export function validate(p) {
  const errs = [];
  if (!p || p.format !== 'synapse-protocol/1') errs.push('Not a protocol file (format must be "synapse-protocol/1").');
  if (!p?.name) errs.push('The protocol needs a name.');
  if (!Array.isArray(p?.steps) || !p.steps.length) errs.push('The protocol needs at least one step.');
  const ids = new Set();
  (p?.steps || []).forEach((s, i) => {
    const where = `Step ${i + 1} (${s.id || 'no id'})`;
    if (!STEP_TYPES[s.type]) errs.push(`${where}: unknown type "${s.type}".`);
    if (!s.id || !/^[A-Za-z0-9_-]+$/.test(s.id)) errs.push(`${where}: id must use letters, digits, - or _.`);
    if (ids.has(s.id)) errs.push(`${where}: id "${s.id}" is used twice.`);
    ids.add(s.id);
    if (s.type === 'nback' && (!Array.isArray(s.levels) || !s.levels.length)) errs.push(`${where}: choose at least one level.`);
    if (s.type === 'questionnaire' && !s.questionnaire) errs.push(`${where}: choose a questionnaire.`);
    if (s.audio && !resolvableAudio(p, s.audio)) errs.push(`${where}: unknown soundscape "${s.audio}".`);
  });
  (p?.session_fields || []).forEach((f) => {
    if (!f.id || !Array.isArray(f.options) || !f.options.length) errs.push(`Session field "${f.label || f.id}": needs an id and options.`);
  });
  return errs;
}

const resolvableAudio = (p, a) => a in AUDIO || a in (p.audio_slots || {}) || /^(https?:|media\/|data:|file:)/.test(a);

/** Soundscape file for a step, given the values of the session fields. */
export function audioFor(p, step, fields) {
  const a = step.audio;
  if (!a) return null;
  if (a in (p.audio_slots || {})) {
    const slot = p.audio_slots[a];
    const key = slot.map?.[fields[slot.by]];
    return key ? (AUDIO[key]?.src || key) : null;
  }
  return AUDIO[a]?.src || a;
}

export const backgroundFor = (step) => BACKGROUNDS[step.background]?.src || null;

export function themeFor(p, fields) {
  const s = { ...DEFAULT_SETTINGS, ...p.settings };
  if (s.theme_field && s.theme_map && fields[s.theme_field] in s.theme_map) return s.theme_map[fields[s.theme_field]];
  return s.theme || 'light';
}

const cache = new Map();
export async function loadJson(path) {
  if (!cache.has(path)) {
    const r = await fetch(path);
    if (!r.ok) throw new Error(`Cannot load ${path}`);
    cache.set(path, await r.json());
  }
  return deepCopy(cache.get(path));
}

export const BUILT_IN_PROTOCOLS = ['protocols/synapse_full_session.json'];
export const BUILT_IN_QUESTIONNAIRES = {
  'questionnaires/synapse_T0_pre_session.json': 'SYNAPSE T0 pre-session',
  'questionnaires/synapse_T1_ieq.json': 'SYNAPSE T1 indoor environment',
  'questionnaires/synapse_T2_T3_task_affect_ieq.json': 'SYNAPSE T2/T3 tasks, feelings, indoor environment',
};

/** Questionnaire object for a step (a built-in file path or an inline object). */
export async function questionnaireFor(step) {
  return typeof step.questionnaire === 'object' ? deepCopy(step.questionnaire) : loadJson(step.questionnaire);
}
