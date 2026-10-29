// Routing and the researcher pages: start a session, demo, try-outs and previews, data, guide, about.
// Hash routes: #/ · #/start[/id] · #/demo · #/try/<task> · #/designer[/id|draft] · #/preview · #/data[/id] · #/guide · #/about
import { allProtocols, showDesigner } from './designer.js';
import { baseName, sessionFiles, toCsv, zip } from './export.js';
import { authorCard, citeCard, referenceList, renderHome, stopPreviews } from './home.js';
import { footer, nav } from './nav.js';
import { applyUiTheme } from './theme.js';
import { APP_VERSION, AUTHOR, PROJECT_FULL } from './info.js';
import { applyShuffleGroups, audioFor, estimateSeconds, loadJson, STEP_TYPES, validate } from './protocol.js';
import { runSession } from './runner.js';
import { AUDIO } from './stimuli.js';
import { deleteSession, getPref, getSession, listSessions, saveSession, setPref } from './storage.js';
import { audioUrl } from './audio_store.js';
import { clear, deepCopy, download, h, isoLocal, makeRng, newSeed, uuid } from './util.js';

export { APP_VERSION };
const root = document.getElementById('app');

const page = (title, ...content) => h('div', { class: 'site' }, nav(), h('main', { class: 'page' }, h('h1', {}, title), ...content), footer());
const fmtMin = (sec) => (sec < 90 ? `${Math.round(sec)} s` : `${Math.round(sec / 60)} min`);

function home() {
  const paused = listSessions().filter((s) => !s.try_out && (s.status === 'paused' || s.status === 'running'));
  renderHome(root, { author: AUTHOR, paused });
}

// ---- try-outs, previews, test runs (never kept) -------------------------------------------------------------
function runThrowaway(protocol, back, label) {
  const session = {
    format: 'synapse-session/1', app_version: APP_VERSION, id: uuid(), demo: true, try_out: true, participant_id: 'TRY', session_id: label,
    fields: Object.fromEntries((protocol.session_fields || []).map((f) => [f.id, f.options[0]])),
    protocol, seed: newSeed(), status: 'running', current_step: 0, started_at: isoLocal(), events: [], trials: [], answers: [], environment: {},
    back_label: back === '#/' ? 'Back to the start page' : 'Back to the designer',
  };
  session.protocol.steps = applyShuffleGroups(protocol.steps, makeRng(session.seed));
  location.hash = '#/run';
  runSession(root, session, {
    onExit: (s) => {
      deleteSession(s.id);
      if (s.retry) runThrowaway(deepCopy(protocol), back, label); else location.hash = back;
    },
  });
}

/** One task of the SYNAPSE session, few trials, no time limit. */
async function tryTask(key) {
  const p = await loadJson('protocols/synapse_full_session.json');
  let step = p.steps.find((s) => s.id === key);
  if (key === 'stroop_emotional') step = { ...p.steps.find((s) => s.id === 'stroop_word'), id: 'stroop_emotional', variant: 'emotional_image', title: 'Emotional-word Stroop' };
  if (!step) return home();
  step = { ...step, time_limit_s: 0, audio: '', background: '', trials: 12, trials_per_level: 10, levels: [1, 2], max_trials: 3 };
  runThrowaway({ ...p, id: `try_${key}`, name: `Try: ${step.title}`, steps: [step], settings: { ...p.settings, play_audio: false, theme_field: '' } }, '#/', key);
}

function preview() {
  const req = JSON.parse(sessionStorage.getItem('synapse.preview') || 'null');
  if (!req) return home();
  const p = req.protocol;
  if (req.step !== null) p.steps = [p.steps[req.step]];
  runThrowaway(p, '#/designer/draft', req.step === null ? 'test_run' : 'preview');
}

// ---- start a session ----------------------------------------------------------------------------------------
function nextId(ids, fallback) {
  const nums = ids.map((x) => /^(.*?)(\d+)$/.exec(x)).filter(Boolean);
  if (!nums.length) return fallback;
  const [, prefix, n] = nums.sort((a, b) => Number(a[2]) - Number(b[2])).at(-1);
  return prefix + String(Number(n) + 1).padStart(n.length, '0');
}

async function start(protocolId, demo = false) {
  const protocols = (await allProtocols()).filter((p) => !validate(p).length);
  const chosen = protocols.find((p) => p.id === protocolId) || protocols.find((p) => p.id === getPref('last_protocol')) || protocols[0];
  const sel = h('select', { id: 'protocol' }, ...protocols.map((p) => h('option', { value: p.id }, p.name)));
  sel.value = chosen.id;
  const pid = h('input', { id: 'participant', autocomplete: 'off', value: demo ? 'DEMO' : '', placeholder: 'e.g. P01' });
  const sid = h('input', { id: 'session', autocomplete: 'off', value: demo ? 'A' : '', placeholder: 'e.g. A or 1' });
  const hint = h('div', { class: 'row small' });
  const fieldsBox = h('div', { class: 'grid2' });
  const fs = h('input', { type: 'checkbox', checked: true });
  const summary = h('div', { class: 'protocol-summary' });
  const soundBox = h('div', {});
  const fieldInputs = {};
  const current = () => protocols.find((x) => x.id === sel.value);
  const draw = () => {
    const p = current();
    const total = p.steps.reduce((n, s) => n + estimateSeconds(s), 0);
    clear(summary).append(
      p.description ? h('p', { class: 'muted' }, p.description) : null,
      h('div', { class: 'chip-row' }, h('span', { class: 'chip strong' }, `${p.steps.length} steps · ≈ ${fmtMin(total)}`),
        ...p.steps.map((s) => h('span', { class: 'chip', title: STEP_TYPES[s.type]?.label }, `${STEP_TYPES[s.type]?.icon || '•'} ${s.title || s.id}`))));
    clear(fieldsBox);
    Object.keys(fieldInputs).forEach((k) => delete fieldInputs[k]);
    for (const f of p.session_fields || []) {
      const s = h('select', { 'data-field': f.id }, ...f.options.map((o) => h('option', { value: o }, o)));
      fieldInputs[f.id] = s;
      fieldsBox.append(h('label', { class: 'field' }, h('span', {}, f.label || f.id), s));
    }
    drawExtras();
  };
  const drawExtras = () => {
    const p = current();
    // suggestions from earlier sessions of this protocol
    const earlier = listSessions().filter((s) => !s.demo && s.protocol.id === p.id);
    clear(hint);
    if (!demo && earlier.length) {
      const next = nextId(earlier.map((s) => s.participant_id), '');
      hint.append(h('span', { class: 'muted' }, `${earlier.length} earlier session(s) with this protocol. `),
        next ? h('button', { class: 'btn ghost small', onclick: () => { pid.value = next; pid.dispatchEvent(new Event('input')); } }, `Next participant: ${next}`) : null);
    }
    // sound check
    const used = [...new Set(p.steps.map((s) => audioFor(p, s, Object.fromEntries(Object.entries(fieldInputs).map(([k, x]) => [k, x.value])))).filter(Boolean))];
    clear(soundBox);
    if (used.length && p.settings?.play_audio !== false) {
      const audio = new Audio();
      soundBox.append(h('div', { class: 'row' }, h('span', { class: 'muted small' }, 'Sound check (headphones on):'),
        ...used.map((src) => h('button', { class: 'btn small', onclick: async () => {
          audio.pause(); audio.src = await audioUrl(src) || ''; audio.volume = p.settings?.audio_volume ?? 0.8; audio.currentTime = 0; audio.play().catch(() => {});
          setTimeout(() => audio.pause(), 4000);
        } }, `▶ ${Object.values(AUDIO).find((a) => a.src === src)?.label || src.split(/[/:]/).pop()}`))));
    }
  };
  pid.addEventListener('input', () => {
    const done = listSessions().filter((s) => s.participant_id === pid.value.trim() && s.protocol.id === sel.value).map((s) => s.session_id);
    if (done.length && !sid.value) sid.value = nextId(done, '');
  });
  sel.addEventListener('change', draw);
  fieldsBox.addEventListener('change', drawExtras);
  draw();
  const go = h('button', { class: 'btn primary big' }, demo ? '▶ Start the demo' : '▶ Start session');
  const msg = h('p', { class: 'warn' });
  go.addEventListener('click', async () => {
    if (!pid.value.trim() || !sid.value.trim()) { msg.textContent = 'Please enter a participant ID and a session ID.'; return; }
    const dup = listSessions().find((s) => !s.demo && s.participant_id === pid.value.trim() && s.session_id === sid.value.trim() && s.protocol.id === sel.value);
    if (dup && !confirm(`Participant ${pid.value} already has a session "${sid.value}" with this protocol. Start another one anyway?`)) return;
    const p = deepCopy(current());
    delete p.built_in;
    setPref('last_protocol', p.id);
    const seed = newSeed();
    const ordered = applyShuffleGroups(p.steps, makeRng(seed));
    const session = {
      format: 'synapse-session/1', app_version: APP_VERSION, id: uuid(), demo,
      participant_id: pid.value.trim(), session_id: sid.value.trim(),
      fields: Object.fromEntries(Object.entries(fieldInputs).map(([k, s]) => [k, s.value])),
      protocol: { ...p, steps: ordered }, step_order: ordered.map((s) => s.id),
      seed, status: 'running', current_step: 0, started_at: isoLocal(), finished_at: null,
      environment: { user_agent: navigator.userAgent, language: navigator.language, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screen: `${screen.width}x${screen.height}@${devicePixelRatio}`, viewport: `${innerWidth}x${innerHeight}` },
      events: [], trials: [], answers: [],
    };
    saveSession(session);
    if (fs.checked) await document.documentElement.requestFullscreen?.().catch(() => {});
    run(session);
  });
  clear(root).append(page(demo ? 'Demo: the SYNAPSE session' : 'Start a session',
    demo ? h('p', { class: 'note' }, 'The demo runs the full SYNAPSE session (about 40 minutes) exactly as participants saw it. ',
      'Use "Skip step" (top right) to move on and ✕ to leave. The data are kept and marked as demo, so you can download them on the Data page to see the file format.') : null,
    h('section', { class: 'card' },
      h('label', { class: 'field' }, h('span', {}, 'Experiment (protocol)'), sel), summary),
    h('section', { class: 'card' },
      h('div', { class: 'grid2' }, h('label', { class: 'field' }, h('span', {}, 'Participant ID'), pid), h('label', { class: 'field' }, h('span', {}, 'Session ID'), sid)),
      hint,
      fieldsBox.childElementCount ? h('h3', {}, 'Conditions') : null, fieldsBox,
      soundBox,
      h('details', { class: 'checklist' }, h('summary', {}, 'Before you start: checklist'),
        h('ul', {}, h('li', {}, 'Use a participant code, never a name.'), h('li', {}, 'Close other programs and silence notifications.'),
          h('li', {}, 'Check the headphones and the volume with the sound check.'), h('li', {}, 'After the session, download the data on the Data page.'))),
      h('label', { class: 'check' }, fs, ' Full screen (recommended)'),
      msg, go)));
  if (!demo) pid.focus();
}

function run(session) {
  location.hash = '#/run';
  runSession(root, session, {
    onExit: (s) => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      location.hash = s.status === 'completed' ? `#/data/${s.id}` : '#/';
    },
  });
}

// ---- data ---------------------------------------------------------------------------------------------------
function stepSummary(s) {
  const by = {};
  for (const t of s.trials.filter((x) => x.phase !== 'practice')) (by[t.step_id] ||= []).push(t);
  return Object.entries(by).map(([id, ts]) => {
    const ok = ts.filter((t) => t.correct === 1);
    const rts = ok.map((t) => t.rt_ms).sort((a, b) => a - b);
    return { id, n: ts.length, acc: Math.round((100 * ok.length) / ts.length), rt: rts.length ? rts[Math.floor(rts.length / 2)] : null };
  });
}

function combinedFiles(sessions) {
  const withFields = (s, rows) => rows.map((r) => ({ ...r, protocol_id: s.protocol.id, demo: !!s.demo,
    ...Object.fromEntries(Object.entries(s.fields || {}).map(([k, v]) => [`field_${k}`, v])) }));
  return [
    ['all_sessions_trials.csv', toCsv(sessions.flatMap((s) => withFields(s, s.trials)))],
    ['all_sessions_questionnaires.csv', toCsv(sessions.flatMap((s) => withFields(s, s.answers)), ['participant_id', 'session_id', 'step_id', 'attempt', 'questionnaire_id', 'item_id'])],
    ['all_sessions_events.csv', toCsv(sessions.flatMap((s) => s.events), ['participant_id', 'session_id', 'step_id', 'event', 'detail', 'time', 'elapsed_ms'])],
    ...sessions.map((s) => [`sessions/${baseName(s)}_session.json`, JSON.stringify(s, null, 2)]),
  ];
}

function dataPage(highlight) {
  const showDemo = getPref('show_demo', false);
  const all = listSessions().filter((s) => !s.try_out);
  const sessions = all.filter((s) => showDemo || !s.demo || s.id === highlight);
  const zipOne = (s) => download(`${baseName(s)}.zip`, zip(sessionFiles(s)));
  const rows = sessions.flatMap((s) => {
    const sum = stepSummary(s);
    const detail = h('tr', { class: 'detail', hidden: s.id !== highlight }, h('td', { colspan: 8 },
      sum.length ? h('div', { class: 'chip-row' }, ...sum.map((x) => h('span', { class: 'chip' }, `${x.id}: ${x.n} trials · ${x.acc}% correct${x.rt ? ` · ${x.rt} ms` : ''}`)))
        : h('span', { class: 'muted small' }, 'No task trials.')));
    return [h('tr', { class: s.id === highlight ? 'hl' : '' },
      h('td', {}, h('button', { class: 'linkish', onclick: () => { detail.hidden = !detail.hidden; }, title: 'Show results per task' }, '▸ ', s.participant_id)),
      h('td', {}, s.session_id), h('td', {}, s.protocol.name), h('td', {}, (s.started_at || '').replace('T', ' ').slice(0, 16)),
      h('td', {}, h('span', { class: `status ${s.status}` }, s.status), s.demo ? h('span', { class: 'badge-soft' }, 'demo') : null),
      h('td', { class: 'num' }, s.trials.length), h('td', { class: 'num' }, s.answers.length),
      h('td', { class: 'actions' },
        h('button', { class: 'btn small', onclick: () => zipOne(s) }, 'Download'),
        h('button', { class: 'btn ghost small', onclick: () => {
          if (confirm(`Delete the data of ${s.participant_id} / ${s.session_id}? Download them first if you need them.`)) { deleteSession(s.id); dataPage(); }
        } }, 'Delete'))), detail];
  });
  const demoToggle = h('input', { type: 'checkbox', checked: showDemo });
  demoToggle.addEventListener('change', () => { setPref('show_demo', demoToggle.checked); dataPage(highlight); });
  clear(root).append(page('Data',
    h('p', { class: 'muted' }, 'Sessions are stored only in this browser. Download them after each session and keep a backup.'),
    all.length ? h('div', { class: 'row space' },
      h('label', { class: 'check' }, demoToggle, ' Show demo sessions'),
      h('div', { class: 'row' },
        h('button', { class: 'btn primary', disabled: !sessions.length, onclick: () => download(`synapse_data_${isoLocal().slice(0, 10)}.zip`, zip(combinedFiles(sessions))) },
          `⬇ Download all (${sessions.length})`))) : null,
    sessions.length ? h('table', { class: 'table' },
      h('thead', {}, h('tr', {}, ...['Participant', 'Session', 'Protocol', 'Started', 'Status', 'Trials', 'Answers', ''].map((t) => h('th', {}, t)))),
      h('tbody', {}, ...rows))
      : h('div', { class: 'card center empty' }, h('h2', {}, 'No sessions yet'), h('p', { class: 'muted' }, 'Run a session or the demo; its data appear here.'),
        h('div', { class: 'row center-row' }, h('a', { class: 'btn primary', href: '#/start' }, 'Start a session'), h('a', { class: 'btn', href: '#/demo' }, 'Try the demo'))),
    h('details', { class: 'card' }, h('summary', {}, h('strong', {}, 'What is in the files?')),
      h('ul', {},
        h('li', {}, h('strong', {}, 'Download (one session): '), 'a ZIP with trials.csv (one row per response), questionnaires.csv (one row per answer), events.csv (steps, time limits, soundscapes) and session.json (everything, including the protocol and the random seed).'),
        h('li', {}, h('strong', {}, 'Download all: '), 'the same tables for all listed sessions combined in one file each (ready for R, Python or SPSS), plus every session.json.'),
        h('li', {}, 'Practice trials are marked phase = practice. Conditions are in the columns field_<name>.'))),
    all.length ? h('div', { class: 'row danger-zone' }, h('button', { class: 'btn ghost small', onclick: () => {
      if (confirm('Delete ALL sessions from this browser? This cannot be undone.')) { all.forEach((s) => deleteSession(s.id)); dataPage(); }
    } }, 'Delete all sessions')) : null));
}

// ---- guide and about ----------------------------------------------------------------------------------------
function guide() {
  const step = (n, title, ...body) => h('section', { class: 'card guide-step' }, h('span', { class: 'step-n' }, n), h('div', {}, h('h2', {}, title), ...body));
  clear(root).append(page('Guide: your own experiment in six steps',
    h('p', { class: 'lead-sm' }, 'No programming is needed. Everything happens in the browser; the data stay on your computer.'),
    step('1', 'Start from a template', h('p', {}, 'Open the ', h('a', { href: '#/designer' }, 'Designer'), ' and choose a template: Blank, Quick cognitive battery, Single task, Before/after, or the full SYNAPSE session. You can change everything afterwards.')),
    step('2', 'Choose and order the steps', h('p', {}, 'Add steps from the step library: messages, questionnaires, a rest baseline and the tasks (n-back, Stroop, flanker, visual). Drag ⋮⋮ to reorder. For each task set the number of trials and, if you like, practice trials with ✓/✗ feedback.'),
      h('p', { class: 'muted' }, 'Under "More options": time limit, your own instruction text (e.g. in another language), soundscape, background image, and a random-order group to counterbalance the task order.')),
    step('3', 'Add your questions', h('p', {}, 'A questionnaire step can use the SYNAPSE questionnaires or your own questions: rating scales (1–k with end labels), single or multiple choice, dropdowns, text and numbers. Each question gets a variable name, which becomes the column name in the data.')),
    step('4', 'Define conditions', h('p', {}, 'Conditions (e.g. lighting = warm / cool, order = AB / BA) are chosen when a session starts and saved in every data row. Soundscapes and the colour theme can follow a condition.')),
    step('5', 'Test, save and share', h('p', {}, 'Use ▶ Preview on a step, or ▶ Test run for the whole session (nothing is saved). Then Save. Export file creates a JSON protocol you can send to colleagues; they load it with Import file and run exactly the same experiment.')),
    step('6', 'Run and download', h('p', {}, 'On ', h('a', { href: '#/start' }, 'Start'), ', enter the participant and session IDs and the conditions, check the sound, and start in full screen. Afterwards, the ', h('a', { href: '#/data' }, 'Data'), ' page shows a quick summary and downloads one ZIP per session or all sessions as combined CSV tables.')),
    h('section', { class: 'card' }, h('h2', {}, 'Good practice'),
      h('ul', {},
        h('li', {}, 'Pilot the full session yourself with Test run, then with one colleague.'),
        h('li', {}, 'Run all participants on the same computer, screen and browser; keep the volume fixed.'),
        h('li', {}, 'Download the data after every session; clearing the browser deletes them.'),
        h('li', {}, 'Report the protocol file and the app version with your results; the protocol is also saved inside every session file.')))));
}

function about() {
  clear(root).append(page('About',
    h('div', { class: 'cite-grid' }, authorCard(AUTHOR), citeCard()),
    h('h2', {}, 'Related research outputs'), referenceList(),
    h('section', { class: 'card' },
      h('h2', {}, 'The software'),
      h('p', {}, `SYNAPSE (${PROJECT_FULL}) experiment platform. It grew out of the task platform used in the SYNAPSE study `,
        '(Technical University of Denmark, June 2025) and is now an open tool for cognitive experiments in multi-domain indoor-environment research, building informatics and beyond. ',
        'The built-in "SYNAPSE full session" reproduces the tasks, trial numbers, timings and questionnaires of the study.'),
      h('h3', {}, 'Privacy'),
      h('p', {}, 'The app runs entirely in the browser and sends no data anywhere. Responses stay in this browser\'s storage until you download or delete them.'),
      h('h3', {}, 'Timing'),
      h('p', {}, 'Response times are measured from the first painted frame of the stimulus with performance.now(). Their precision depends on the browser, ',
        'the screen refresh rate and the input device (typically a few milliseconds plus the device latency).'),
      h('h3', {}, 'Media credits'),
      h('ul', {},
        h('li', {}, 'Task images and backgrounds: AI-generated with OpenAI GPT-4o (ChatGPT) and Microsoft Designer Image Creator, as declared by the C2PA content credentials of the original files.'),
        h('li', {}, 'Soundscapes: noise with the spectrum and level of the recordings used in SYNAPSE (the recordings themselves cannot be redistributed). You can upload your own files in the Designer.'),
        h('li', {}, 'Logos of the University of Perugia, the Technical University of Denmark, the MuSIC doctoral network, the Marie Skłodowska-Curie Actions and the European Union belong to their owners and are shown as acknowledgement; they are not covered by the software licence.')),
      h('h3', {}, 'Licence'),
      h('p', {}, 'Code: MIT licence. Logos belong to their owners.'))));
}

// ---- router -------------------------------------------------------------------------------------------------
async function route() {
  const [, view, arg] = location.hash.replace(/^#\/?/, '#/').split('/');
  stopPreviews();
  if (view === 'run') return;                              // the runner owns the screen (and its theme)
  applyUiTheme();
  window.scrollTo(0, 0);
  if (view === 'try') return tryTask(arg);
  if (view === 'preview') return preview();
  if (view === 'start') return start(arg ? decodeURIComponent(arg) : null);
  if (view === 'demo') return start('synapse_full_session', true);
  if (view === 'designer' || view === 'settings') return showDesigner(root, arg ? decodeURIComponent(arg) : null);
  if (view === 'data') return dataPage(arg);
  if (view === 'guide') return guide();
  if (view === 'about') return about();
  if (view === 'cite') { home(); requestAnimationFrame(() => document.getElementById('cite')?.scrollIntoView()); return; }
  if (view === 'resume') {
    const s = getSession(arg);
    if (s) { s.status = 'running'; s.events.push({ participant_id: s.participant_id, session_id: s.session_id, step_id: '', event: 'resumed', detail: `step ${s.current_step + 1}`, time: isoLocal(), elapsed_ms: s.elapsed_ms || 0 }); return run(s); }
  }
  return home();
}

window.addEventListener('hashchange', route);
if (location.hash === '#/run') location.hash = '#/';
route();
