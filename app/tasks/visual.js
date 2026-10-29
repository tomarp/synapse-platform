// Visual tasks (SYNAPSE): counting (type a number, Enter or Submit) and shape comparison (SAME / DIFFERENT).
// Response time runs from the moment the image has loaded and is painted.
import { visualTrials } from '../generators.js';
import { afterPaint, clear, h, StepAborted, wait, waitForChoice } from '../util.js';
import { instructions, practiceThenMain, responseButtons, showFeedback, wantsFeedback } from './common.js';

const TEXT = {
  count: 'In this task, you will be shown a series of images. For each image, read the question carefully and count the specified items. ' +
    'Type your answer (as a number) into the box and click "Submit".',
  shape: 'You will see a series of images. Each image contains two structures. You have to determine if the two structures are the SAME ' +
    'or DIFFERENT by choosing the right option.',
};

const loaded = (img) => (img.complete ? Promise.resolve() : new Promise((r) => { img.onload = r; img.onerror = r; }));

export async function run(ctx) {
  const s = ctx.step;
  const trials = visualTrials(s.variant, s.items, s.max_trials, ctx.rng);
  const make = (k, rng) => (k === null ? trials : visualTrials(s.variant, s.items, k, rng));
  if (!trials.length) {
    ctx.log('no_items', 'no image matches the item selection');
    return;
  }
  ctx.keyHint = s.variant === 'shape' ? 'Keys: S = SAME, D = DIFFERENT.' : 'Type the number and press Enter.';
  await instructions(ctx, s.title, [TEXT[s.variant] || TEXT.count]);
  await practiceThenMain(ctx, make, async (t, i, phase) => {
    const img = h('img', { src: t.image, alt: '', class: 'task-image' });
    const question = h('p', { class: 'question' }, t.question);
    let answer;
    if (s.variant === 'shape') {
      const r = responseButtons(ctx, [{ label: 'SAME', value: 'SAME', key: 's' }, { label: 'DIFFERENT', value: 'DIFFERENT', key: 'd' }]);
      clear(ctx.stage).append(h('div', { class: 'task' }, question, img, r.row));
      await loaded(img);
      const onset = await afterPaint();
      r.enable(true);
      const ans = await waitForChoice(r.buttons, r.keyMap, ctx.signal);
      answer = { value: ans.value, key: ans.key || 'click', rt: performance.now() - onset };
    } else {
      const input = h('input', { type: 'number', inputmode: 'numeric', min: 0, class: 'count-input', 'aria-label': 'Your count' });
      const submit = h('button', { class: 'btn primary', 'data-value': 'submit' }, 'Submit Answer');
      const msg = h('p', { class: 'warn small' });
      clear(ctx.stage).append(h('div', { class: 'task' }, img, question, h('div', { class: 'row' }, input, submit), msg));
      await loaded(img);
      const onset = await afterPaint();
      input.focus();
      for (;;) {
        const ans = await new Promise((resolve, reject) => {
          const go = () => { cleanup(); resolve(input.value.trim()); };
          const onKey = (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } };
          const onAbort = () => { cleanup(); reject(new StepAborted()); };
          const cleanup = () => { submit.removeEventListener('click', go); input.removeEventListener('keydown', onKey); ctx.signal.removeEventListener('abort', onAbort); };
          submit.addEventListener('click', go);
          input.addEventListener('keydown', onKey);
          ctx.signal.addEventListener('abort', onAbort, { once: true });
        });
        if (ans !== '' && Number.isFinite(Number(ans))) { answer = { value: String(parseInt(ans, 10)), key: 'typed', rt: performance.now() - onset }; break; }
        msg.textContent = 'Please enter a count before submitting.';
      }
    }
    const correct = answer.value === t.correct_response;
    ctx.record({ phase, trial: i + 1, image: t.image.split('/').pop(), question: t.question, key_validity: t.key_validity,
      correct_response: t.correct_response, response: answer.value, response_key: answer.key,
      correct: correct ? 1 : 0, rt_ms: Math.round(answer.rt) });
    if (wantsFeedback(ctx, phase)) await showFeedback(ctx, ctx.stage.querySelector('.task'), correct);
    await wait(s.iti_ms, ctx.signal);
  });
}
