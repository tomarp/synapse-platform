// Runs a session: steps in order, each with an optional time limit and soundscape; logs events, trials and
// answers into the session object and saves it after every response (a reload can resume at the current step).
import { audioUrl } from './audio_store.js';
import { audioFor, backgroundFor, DEFAULT_SETTINGS, STEP_TYPES, themeFor } from './protocol.js';

const STEP_LABEL = Object.fromEntries(Object.entries(STEP_TYPES).map(([k, v]) => [k, v.label]));
import { saveSession } from './storage.js';
import * as flanker from './tasks/flanker.js';
import * as nback from './tasks/nback.js';
import * as questionnaire from './tasks/questionnaire.js';
import { baseline, message } from './tasks/simple.js';
import * as stroop from './tasks/stroop.js';
import * as visual from './tasks/visual.js';
import { clear, h, isoLocal, makeRng, StepAborted, waitForChoice } from './util.js';

const RUN = { nback: nback.run, stroop: stroop.run, flanker: flanker.run, visual: visual.run, questionnaire: questionnaire.run, baseline, message };
const SHOW_COMPLETE = ['nback', 'stroop', 'flanker', 'visual', 'baseline'];

export async function runSession(root, session, { onExit } = {}) {
  const p = session.protocol;
  const settings = { ...DEFAULT_SETTINGS, ...p.settings };
  const t0 = performance.now() - (session.elapsed_ms || 0);
  document.body.dataset.theme = themeFor(p, session.fields);
  const audio = new Audio();
  audio.loop = true;
  audio.volume = settings.audio_volume ?? 0.8;
  let audioSrc = null;

  // circular countdown (as in the 2025 platform)
  const NS = 'http://www.w3.org/2000/svg';
  const ring = document.createElementNS(NS, 'svg');
  ring.setAttribute('viewBox', '0 0 40 40');
  ring.innerHTML = '<circle class="ring-track" cx="20" cy="20" r="17"/><circle class="ring-progress" cx="20" cy="20" r="17"/>';
  const ringProgress = ring.querySelector('.ring-progress');
  const CIRC = 2 * Math.PI * 17;
  ringProgress.style.strokeDasharray = CIRC;
  const timerText = h('span', { class: 'timer-text' });
  const timer = h('div', { class: 'timer', hidden: true, title: 'Time left for this step' }, ring, timerText);
  const mode = !session.try_out ? (session.demo ? 'demo' : 'live') : session.session_id === 'test_run' ? 'test' : session.session_id === 'preview' ? 'preview' : 'try';
  const MODE_LABEL = { demo: 'DEMO', test: 'TEST RUN', preview: 'PREVIEW', try: 'TRY-OUT', live: '' };
  const free = mode !== 'live';                     // demo/test: navigate without confirmation
  const counter = h('span', { class: 'run-counter' });
  const title = h('span', { class: 'run-title' });
  const segs = h('div', { class: 'run-progress' }, ...p.steps.map((s, k) => {
    const seg = h('button', { class: 'seg', title: `${k + 1}. ${s.title || s.type}`, tabindex: free ? 0 : -1, disabled: !free },
      h('span', { class: 'seg-tip' }, `${k + 1}. ${s.title || s.type}`));
    if (free) seg.addEventListener('click', () => go('jump', k));
    return seg;
  }));
  const continueBtn = h('button', { class: 'btn primary small pulse-btn', hidden: true }, 'Continue ▸');
  const ctl = (label, title, fn, cls = '') => h('button', { class: `ctl ${cls}`, title, onclick: fn }, label);
  const stepMenu = h('div', { class: 'run-menu', hidden: true },
    h('div', { class: 'menu-head' }, free ? 'Go to step' : 'Researcher menu'),
    !free ? h('button', { class: 'menu-item', onclick: () => go('skip') }, '▸ Skip this step') : null,
    !free ? h('button', { class: 'menu-item', onclick: () => go('back') }, '◂ Back one step') : null,
    !free ? h('div', { class: 'menu-head small' }, 'Go to step') : null,
    ...p.steps.map((s, k) => h('button', { class: 'menu-item step-item', 'data-k': k, onclick: () => go('jump', k) }, h('span', {}, k + 1), ` ${s.title || s.type}`)),
    !free ? h('button', { class: 'menu-item danger', onclick: () => go('exit') }, '✕ Leave session (resume later)') : null);
  const menuBtn = ctl(free ? '☰ Steps' : '⋯', free ? 'Jump to any step' : 'Researcher menu (Alt+M)', () => { stepMenu.hidden = !stepMenu.hidden; }, free ? '' : 'ghosty');
  const exitLabel = { demo: '✕ Exit demo', test: '✕ Back to designer', preview: '✕ Back to designer', try: '✕ Exit', live: null }[mode];
  const exitBtn = exitLabel ? ctl(exitLabel, 'Leave (Esc twice)', () => go('exit'), 'exit') : null;
  const controls = free
    ? [ctl('◂ Back', 'Previous step (Alt+←)', () => go('back')), ctl('Skip ▸', 'Next step (Alt+→)', () => go('skip'), 'strong'), menuBtn, exitBtn]
    : [menuBtn];
  const finishBtn = h('button', { class: 'btn primary small', hidden: true }, 'Finish ✓');
  const stage = h('main', { class: 'stage' });
  const bar = h('header', { class: 'run-bar' },
    h('div', { class: 'run-left' }, MODE_LABEL[mode] ? h('span', { class: `badge mode-${mode}` }, MODE_LABEL[mode]) : null, counter, title),
    h('div', { class: 'bar-right' }, timer, continueBtn, finishBtn, h('div', { class: 'ctl-group' }, ...controls.filter(Boolean)), stepMenu));
  const backdrop = h('div', { class: 'backdrop' });
  const runEl = h('div', { class: `run mode-${mode}` }, backdrop, bar, segs, stage);
  clear(root).append(runEl);

  session.attempts = session.attempts || {};
  const stamp = (step) => ({ participant_id: session.participant_id, session_id: session.session_id, step_id: step?.id ?? '',
    attempt: session.attempts[step?.id] || 1 });
  const elapsed = () => Math.round(performance.now() - t0);
  const save = () => { session.elapsed_ms = elapsed(); saveSession(session); };
  const log = (step, event, detail = '') => {
    session.events.push({ ...stamp(step), event, detail, time: isoLocal(), elapsed_ms: elapsed() });
    save();
  };

  let exitRequested = false;
  let current = null;
  let idx = 0;
  let jumpTo = null;
  /** Researcher navigation: skip, back, jump to step k, exit (live sessions ask for confirmation). */
  function go(action, k) {
    stepMenu.hidden = true;
    if (session.status === 'completed') return;
    const ask = (msg) => free || confirm(msg);
    if (action === 'exit') {
      if (!ask('Leave this session? The data so far are kept and the session can be resumed from this step.')) return;
      exitRequested = true; current?.abort('exit');
    } else if (action === 'skip') {
      if (!ask('Skip the rest of this step?')) return;
      current?.abort('skip');
    } else if (action === 'back') {
      if (idx === 0 || !ask('Go back to the previous step? It will be run again.')) return;
      jumpTo = idx - 1; current?.abort('back');
    } else if (action === 'jump') {
      if (k === idx || !ask(`Go to step ${k + 1}?`)) return;
      jumpTo = k; current?.abort(`jump to step ${k + 1}`);
    }
  }
  continueBtn.addEventListener('click', () => current?.abort('continue'));
  let lastEsc = 0;
  const keys = (e) => {
    if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); go('skip'); }
    else if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); go('back'); }
    else if (e.altKey && (e.key === 'm' || e.key === 'µ')) { e.preventDefault(); stepMenu.hidden = !stepMenu.hidden; }
    else if (e.key === 'Escape' && free) { if (performance.now() - lastEsc < 800) go('exit'); lastEsc = performance.now(); }
  };
  window.addEventListener('keydown', keys);
  const unload = (e) => { e.preventDefault(); e.returnValue = ''; };
  window.addEventListener('beforeunload', unload);

  for (let i = session.current_step || 0; i < p.steps.length && !exitRequested; i++) {
    const step = p.steps[i];
    session.current_step = i;
    idx = i;
    const ctrl = new AbortController();
    current = { abort: (why) => { ctrl.abort(why); } };
    counter.textContent = `Step ${i + 1} / ${p.steps.length}`;
    title.textContent = step.title || STEP_LABEL[step.type] || step.type;
    [...segs.children].forEach((sg, k) => { sg.className = `seg ${k < i ? 'done' : k === i ? 'now' : ''}`; });
    stepMenu.querySelectorAll('.step-item').forEach((b) => b.classList.toggle('now', Number(b.dataset.k) === i));
    const bg = backgroundFor(step);
    backdrop.style.backgroundImage = bg ? `url("${bg}")` : '';
    runEl.classList.toggle('with-bg', !!bg);
    const src = settings.play_audio ? audioFor(p, step, session.fields) : null;
    if (src !== audioSrc) {
      audio.pause();
      audioSrc = src;
      if (src) {
        const url = await audioUrl(src);
        if (url) { audio.src = url; audio.currentTime = 0; audio.play().catch(() => log(step, 'audio_blocked', src)); } else log(step, 'audio_missing', src);
      }
    }
    if (src) log(step, 'soundscape', src.split(/[/:]/).pop());

    const limit = step.type === 'baseline' ? step.duration_s : step.time_limit_s;
    continueBtn.hidden = true;
    let tick = null;
    if (limit > 0) {
      const end = performance.now() + limit * 1000;
      timer.hidden = !settings.timer_visible;
      const show = () => {
        const left = Math.max(0, Math.ceil((end - performance.now()) / 1000));
        timerText.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
        ringProgress.style.strokeDashoffset = CIRC * (1 - left / limit);
        timer.classList.toggle('urgent', left <= 10);
        if (left === 0) {
          clearInterval(tick);
          timer.hidden = true;
          if (step.type === 'baseline') return;
          log(step, 'time_limit_reached', `${limit} s`);
          if (settings.on_timeout === 'end_step') ctrl.abort('timeout');
          else continueBtn.hidden = false;
        }
      };
      show();
      tick = setInterval(show, 250);
    } else timer.hidden = true;

    const ctx = {
      stage, step, signal: ctrl.signal, keyboard: settings.keyboard, rng: makeRng((session.seed + 7919 * (i + 1)) >>> 0),
      practiceRng: makeRng((session.seed + 7919 * (i + 1) + 104729) >>> 0),
      log: (event, detail) => log(step, event, detail),
      record: (fields) => {
        session.trials.push({ ...stamp(step), task: step.type, variant: step.variant || '', ...fields,
          soundscape: audioSrc ? audioSrc.split(/[/:]/).pop() : '', time: isoLocal(), elapsed_ms: elapsed() });
        save();
      },
      answer: (fields) => { session.answers.push({ ...stamp(step), ...fields, time: isoLocal() }); save(); },
    };
    session.attempts[step.id] = (session.attempts[step.id] || 0) + 1;
    log(step, session.attempts[step.id] > 1 ? 'step_restart' : 'step_start', step.type);
    let outcome = 'completed';
    try {
      // the step ends when the task finishes or when it is aborted (skip, back, jump, time limit, exit), whichever comes first,
      // even if the abort arrives before the task has registered its own listeners
      const task = RUN[step.type](ctx);
      task.catch(() => {});
      await Promise.race([task, new Promise((_, reject) => {
        if (ctrl.signal.aborted) reject(new StepAborted());
        ctrl.signal.addEventListener('abort', () => reject(new StepAborted()), { once: true });
      })]);
      if (SHOW_COMPLETE.includes(step.type) && !session.try_out) {
        const btn = h('button', { class: 'btn primary', 'data-value': 'next' }, 'Continue');
        clear(stage).append(h('div', { class: 'card center' }, h('h2', {}, step.type === 'baseline' ? 'Baseline complete' : 'Task Complete'),
          h('p', {}, 'Thank you. Please press continue.'), btn));
        continueBtn.hidden = true;
        btn.focus();
        await waitForChoice([btn], { Enter: 'next' }, ctrl.signal).catch(() => {});
      }
    } catch (e) {
      if (!(e instanceof StepAborted)) { console.error(e); outcome = `error: ${e.message}`; } else outcome = String(ctrl.signal.reason || 'aborted');
    }
    clearInterval(tick);
    log(step, 'step_end', outcome);
    if (jumpTo !== null && !exitRequested) { i = jumpTo - 1; jumpTo = null; continue; }
    const last = i === p.steps.length - 1;
    if (last && step.type === 'message' && !step.button && !exitRequested) {
      // final thank-you page stays on screen; the researcher leaves with the ✕ button
      session.status = 'completed';
      session.finished_at = isoLocal();
      session.current_step = p.steps.length;
      save();
      timer.hidden = true;
      continueBtn.hidden = true;
      controls.filter(Boolean).forEach((c) => c.remove());
      finishBtn.hidden = false;
      [...segs.children].forEach((sg) => { sg.className = 'seg done'; });
      await new Promise((r) => finishBtn.addEventListener('click', r, { once: true }));
      exitRequested = true;
      break;
    }
  }
  audio.pause();
  window.removeEventListener('beforeunload', unload);
  window.removeEventListener('keydown', keys);
  if (session.status !== 'completed') {
    if (!exitRequested) { session.status = 'completed'; session.finished_at = isoLocal(); session.current_step = p.steps.length; } else session.status = 'paused';
  }
  save();
  document.body.dataset.theme = '';
  if (session.try_out && session.status === 'completed' && session.protocol.steps.length === 1 && session.trials.length) await trySummary(root, session);
  onExit?.(session);
}

/** Score card after a quick try of one task (try-out runs are not kept). */
async function trySummary(root, s) {
  const t = s.trials.filter((x) => x.phase !== 'practice');
  const n = t.length;
  const acc = n ? Math.round((100 * t.filter((x) => x.correct === 1).length) / n) : 0;
  const rts = t.filter((x) => x.correct === 1).map((x) => x.rt_ms).sort((a, b) => a - b);
  const med = rts.length ? rts[Math.floor(rts.length / 2)] : null;
  const again = h('button', { class: 'btn primary', 'data-value': 'again' }, 'Try again');
  const home = h('button', { class: 'btn', 'data-value': 'home' }, s.back_label || 'Back to the start page');
  const bars = h('div', { class: 'rt-strip', title: 'Response time of each trial (green = correct, red = error)' },
    ...t.map((x) => h('i', { class: x.correct ? 'ok' : 'err', style: { height: `${Math.min(100, x.rt_ms / 30)}%` } })));
  clear(root).append(h('div', { class: 'page' }, h('div', { class: 'card center summary' },
    h('h1', {}, s.protocol.steps[0].title), h('p', { class: 'muted' }, 'Your result (not saved)'),
    h('div', { class: 'stats' },
      h('div', {}, h('strong', {}, n), h('span', {}, 'trials')),
      h('div', {}, h('strong', {}, `${acc}%`), h('span', {}, 'correct')),
      h('div', {}, h('strong', {}, med === null ? '–' : `${med} ms`), h('span', {}, 'median response time (correct)'))),
    n ? bars : null,
    h('div', { class: 'row center-row' }, again, home))));
  const { value } = await waitForChoice([again, home]);
  s.retry = value === 'again';
}
