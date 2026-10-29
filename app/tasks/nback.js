// N-back (SYNAPSE): levels run in order, each with its own instruction page (and optional practice). Per trial:
// fixation cross, then the stimulus until the response; the stimulus stays visible during the pause after the response.
import { nbackTrials } from '../generators.js';
import { afterPaint, clear, h, wait, waitForChoice } from '../util.js';
import { fixation, instructions, practiceThenMain, responseButtons, showFeedback, wantsFeedback } from './common.js';

const WORD = { letter: ['letters', 'letter'], digit: ['numbers', 'number'] };

export async function run(ctx) {
  const s = ctx.step;
  const [plural, single] = WORD[s.variant] || WORD.letter;
  ctx.keyHint = 'Keys: J = TARGET, F = NON-TARGET.';
  for (const n of s.levels) {
    ctx.level = n;
    ctx.log('level_instructions', `level ${n}`);
    await instructions(ctx, s.title, [`${n}-BACK: You will be shown ${plural} on your screen. Press 'TARGET' if the current ${single} ` +
      `is the same as the ${single} that appeared ${n} step${n > 1 ? 's' : ''} back. Otherwise, press 'NON-TARGET'.`],
    `Start Level ${n}: ${n}-Back`);
    ctx.log('level_start', `level ${n}`);
    const display = h('div', { class: 'stimulus big' });
    const r = responseButtons(ctx, [
      { label: 'TARGET', value: 'TARGET', key: 'j' }, { label: 'NON-TARGET', value: 'NON-TARGET', key: 'f' }]);
    const screen = () => clear(ctx.stage).append(h('div', { class: 'task' }, display, r.row));
    screen();
    await practiceThenMain(ctx, (k, rng) => nbackTrials(n, k ?? s.trials_per_level, s.target_ratio, s.variant, rng), async (t, i, phase) => {
      clear(display).append(fixation());
      await wait(s.fixation_ms, ctx.signal);
      clear(display).append(h('span', { class: 'pop' }, t.stimulus));
      const onset = await afterPaint();
      r.enable(true);
      const ans = await waitForChoice(r.buttons, r.keyMap, ctx.signal);
      const rt = performance.now() - onset;
      r.enable(false);
      const correct = ans.value === t.correct_response;
      ctx.record({ phase, block: n, trial: i + 1, level: n, stimulus: t.stimulus, is_target: t.is_target, correct_response: t.correct_response,
        response: ans.value, response_key: ans.key || 'click', correct: correct ? 1 : 0, rt_ms: Math.round(rt) });
      if (wantsFeedback(ctx, phase)) await showFeedback(ctx, display, correct);
      await wait(s.iti_ms, ctx.signal);
    }, screen);
    ctx.log('level_end', `level ${n}`);
  }
}
