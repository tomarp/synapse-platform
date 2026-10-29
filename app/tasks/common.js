// Screens shared by the tasks: instruction page, fixation, response buttons.
import { clear, h, waitForChoice } from '../util.js';

/** Shows the task title and instructions; resolves when the participant presses Start. */
export async function instructions(ctx, title, paragraphs, startLabel = 'Start Task') {
  if (ctx.step.instructions?.trim()) paragraphs = ctx.step.instructions.trim().replaceAll('{n}', ctx.level ?? '').split(/\n\s*\n/);
  if (ctx.step.practice_trials > 0) paragraphs = [...paragraphs, `You will start with ${ctx.step.practice_trials} practice trials.`];
  const btn = h('button', { class: 'btn primary', 'data-value': 'start' }, startLabel);
  clear(ctx.stage).append(h('div', { class: 'card center' },
    h('h1', {}, title), h('h4', { class: 'muted' }, 'INSTRUCTIONS'),
    ...paragraphs.map((p) => h('p', { class: 'instruction' }, p)),
    ctx.keyboard && ctx.keyHint ? h('p', { class: 'muted small' }, ctx.keyHint) : null,
    btn));
  btn.focus();
  await waitForChoice([btn], {}, ctx.signal);
}

/** Response buttons; keys maps a keyboard key to a button value, labels may show the key. */
export function responseButtons(ctx, options, cls = '') {
  const row = h('div', { class: `responses ${cls}` });
  const buttons = options.map((o) => h('button', { class: `btn response ${o.cls || ''}`, 'data-value': o.value, disabled: true,
    style: o.style }, o.label, ctx.keyboard && o.key ? h('kbd', {}, o.keyLabel || o.key.toUpperCase()) : null));
  row.append(...buttons);
  const keyMap = ctx.keyboard ? Object.fromEntries(options.filter((o) => o.key).map((o) => [o.key, o.value])) : {};
  return { row, buttons, keyMap, enable: (on) => buttons.forEach((b) => { b.disabled = !on; }) };
}

export const fixation = () => h('div', { class: 'fixation' }, '+');

export function stimulusArea() {
  return h('div', { class: 'stimulus' });
}

/** Practice trials (if any) followed by the recorded trials. runOne(trial, index, phase) runs and records one trial. */
export async function practiceThenMain(ctx, makeTrials, runOne, onMainStart) {
  const k = ctx.step.practice_trials || 0;
  if (k > 0) {
    ctx.log('practice_start', `${k} trials`);
    const practice = makeTrials(k, ctx.practiceRng);
    for (let i = 0; i < practice.length; i++) await runOne(practice[i], i, 'practice');
    const go = h('button', { class: 'btn primary', 'data-value': 'go' }, 'Start');
    clear(ctx.stage).append(h('div', { class: 'card center' }, h('h2', {}, 'Practice complete'),
      h('p', { class: 'instruction' }, 'The real trials start now. Respond as quickly and accurately as you can.'), go));
    go.focus();
    await waitForChoice([go], { Enter: 'go' }, ctx.signal);
  }
  await onMainStart?.();
  ctx.log('trials_start', '');
  const main = makeTrials(null, ctx.rng);
  for (let i = 0; i < main.length; i++) await runOne(main[i], i, 'main');
}

/** True if this trial gets correct/incorrect feedback. */
export const wantsFeedback = (ctx, phase) => ctx.step.feedback === 'all' || (ctx.step.feedback === 'practice' && phase === 'practice');

/** Shows ✓ or ✗ over the stimulus area for 600 ms. */
export async function showFeedback(ctx, area, correct) {
  const mark = h('div', { class: `feedback ${correct ? 'ok' : 'err'}` }, correct ? '✓ Correct' : '✗ Incorrect');
  area.append(mark);
  await new Promise((r) => setTimeout(r, 600));
  mark.remove();
}
