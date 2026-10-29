// Flanker (SYNAPSE): respond to the middle symbol. Per trial: fixation, stimulus + response; the stimulus is
// cleared during the pause after the response.
import { flankerTrials } from '../generators.js';
import { afterPaint, clear, h, wait, waitForChoice } from '../util.js';
import { fixation, instructions, practiceThenMain, responseButtons, showFeedback, wantsFeedback } from './common.js';

const SETUP = {
  arrow: { text: 'Your task is to identify the direction of the middle arrow. Ignore the other arrows. Choose the correct option.',
    hint: 'Keys: ← = Left, → = Right.',
    options: [{ label: '← Left', value: 'Left', key: 'ArrowLeft', keyLabel: '←' }, { label: 'Right →', value: 'Right', key: 'ArrowRight', keyLabel: '→' }] },
  digit: { text: 'Your task is to identify if the middle number is EVEN or ODD, while ignoring the other numbers. The middle number ' +
    'is the central one, with the same number of digits on its left and right side.',
  hint: 'Keys: E = Even, O = Odd.',
  options: [{ label: 'Even', value: 'Even', key: 'e' }, { label: 'Odd', value: 'Odd', key: 'o' }] },
};

export async function run(ctx) {
  const s = ctx.step;
  const setup = SETUP[s.variant] || SETUP.arrow;
  ctx.keyHint = setup.hint;
  await instructions(ctx, s.title, [setup.text], 'Start');
  const display = h('div', { class: 'stimulus big mono' });
  const r = responseButtons(ctx, setup.options);
  const screen = () => clear(ctx.stage).append(h('div', { class: 'task' }, display, r.row));
  screen();
  await practiceThenMain(ctx, (k, rng) => flankerTrials(k ?? s.trials, s.variant, rng), async (t, i, phase) => {
    clear(display).append(fixation());
    await wait(s.fixation_ms, ctx.signal);
    clear(display).append(t.stimulus);
    const onset = await afterPaint();
    r.enable(true);
    const ans = await waitForChoice(r.buttons, r.keyMap, ctx.signal);
    const rt = performance.now() - onset;
    r.enable(false);
    const correct = ans.value === t.correct_response;
    ctx.record({ phase, trial: i + 1, condition: t.condition, stimulus: t.stimulus, target: t.target, flanker: t.flanker,
      correct_response: t.correct_response, response: ans.value, response_key: ans.key || 'click', correct: correct ? 1 : 0, rt_ms: Math.round(rt) });
    if (wantsFeedback(ctx, phase)) await showFeedback(ctx, display, correct);
    clear(display);
    await wait(s.iti_ms, ctx.signal);
  }, screen);
}
