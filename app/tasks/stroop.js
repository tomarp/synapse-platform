// Stroop (SYNAPSE): respond with the INK colour. Per trial: fixation, then stimulus and response buttons;
// pause after the response with the buttons disabled.
import { stroopEmojiTrials, stroopEmotionalTrials, stroopWordTrials } from '../generators.js';
import { COLOURS } from '../stimuli.js';
import { afterPaint, clear, h, wait, waitForChoice } from '../util.js';
import { fixation, instructions, practiceThenMain, responseButtons, showFeedback, wantsFeedback } from './common.js';

const TEXT = {
  word: 'You will see a series of words displayed one by one in different colors. Your task is to identify the COLOR of the ink the word ' +
    'is written in, ignoring the word itself. Click the button that corresponds to the ink color as quickly and accurately as you can.',
  emoji: "You will see a word and an emoji displayed. Your task is to identify the COLOR of the word, ignoring both the word's meaning " +
    "and the emoji. Select the option that corresponds to the word's color.",
  emotional_image: 'You will see a series of words-images displayed in different colors. Your task is to identify the COLOR of the word ' +
    'in the image, ignoring the word itself. Select the option that corresponds to the word color.',
};

export async function run(ctx) {
  const s = ctx.step;
  const make = (k, rng) => {
    const n = k ?? s.trials;
    return s.variant === 'emoji' ? stroopEmojiTrials(n, rng) : s.variant === 'emotional_image' ? stroopEmotionalTrials(n, rng)
      : stroopWordTrials(n, s.congruent_ratio || 0, rng);
  };
  ctx.keyHint = 'Keys: R = red, G = green, B = blue, Y = yellow.';
  await instructions(ctx, s.title, [TEXT[s.variant] || TEXT.word]);
  const display = h('div', { class: 'stimulus big' });
  const r = responseButtons(ctx, Object.keys(COLOURS).map((c) => ({ label: c.toUpperCase(), value: c, key: c[0].toLowerCase() })));
  const screen = () => clear(ctx.stage).append(h('div', { class: 'task' }, display, r.row));
  screen();
  await practiceThenMain(ctx, make, async (t, i, phase) => {
    r.row.style.visibility = 'hidden';
    clear(display).append(fixation());
    await wait(s.fixation_ms, ctx.signal);
    if (s.variant === 'emotional_image') clear(display).append(h('img', { src: t.image, alt: '', class: 'stroop-image' }));
    else if (s.variant === 'emoji') clear(display).append(h('span', { style: { color: COLOURS[t.ink] } }, t.word), ' ', h('span', {}, t.emoji));
    else clear(display).append(h('span', { style: { color: COLOURS[t.ink] } }, t.word));
    r.row.style.visibility = 'visible';
    const onset = await afterPaint();
    r.enable(true);
    const ans = await waitForChoice(r.buttons, r.keyMap, ctx.signal);
    const rt = performance.now() - onset;
    r.enable(false);
    const correct = ans.value === t.correct_response;
    ctx.record({ phase, trial: i + 1, word: t.word, ink: t.ink, congruent: t.congruent ?? '', emoji: t.emoji ?? '',
      emoji_congruent_with_ink: t.emoji_congruent_with_ink ?? '', valence: t.valence ?? '', image: t.image ? t.image.split('/').pop() : '',
      correct_response: t.correct_response, response: ans.value, response_key: ans.key || 'click', correct: correct ? 1 : 0, rt_ms: Math.round(rt) });
    if (wantsFeedback(ctx, phase)) await showFeedback(ctx, display, correct);
    await wait(s.iti_ms, ctx.signal);
  }, screen);
}
