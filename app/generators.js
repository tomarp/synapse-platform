// Trial lists. Pure functions of (parameters, rng): the same seed gives the same lists, so every
// session can be reproduced from the seed stored with its data.
import { COLOURS, COLOUR_EMOJIS, NBACK_DIGITS, NBACK_LETTERS, STROOP_EMOTIONAL, VISUAL_COUNT, VISUAL_SHAPE } from './stimuli.js';
import { pick, shuffle } from './util.js';

/** n-back as in SYNAPSE: floor(trials x target_ratio) target positions are drawn at random; a position earlier
 *  than n cannot be a target, so the realised number of targets can be slightly lower. Non-targets never
 *  repeat the stimulus n back. */
export function nbackTrials(n, numTrials, targetRatio, variant, rng) {
  const set = variant === 'digit' ? NBACK_DIGITS : NBACK_LETTERS;
  const positions = shuffle(Array.from({ length: numTrials }, (_, i) => i < Math.floor(numTrials * targetRatio)), rng);
  const trials = [];
  for (let i = 0; i < numTrials; i++) {
    const target = i >= n && positions[i];
    let s;
    if (target) s = trials[i - n].stimulus;
    else do { s = pick(set, rng); } while (i >= n && s === trials[i - n].stimulus);
    trials.push({ level: n, stimulus: s, is_target: target, correct_response: target ? 'TARGET' : 'NON-TARGET' });
  }
  return trials;
}

/** Colour-word Stroop. congruentRatio 0 (SYNAPSE: all trials incongruent). */
export function stroopWordTrials(numTrials, congruentRatio, rng) {
  const names = Object.keys(COLOURS);
  return Array.from({ length: numTrials }, () => {
    const word = pick(names, rng);
    const congruent = rng() < congruentRatio;
    let ink = word;
    if (!congruent) do { ink = pick(names, rng); } while (ink === word);
    return { word, ink, congruent, correct_response: ink };
  });
}

/** Emoji Stroop as in SYNAPSE: incongruent colour word; the emoji matches the ink colour (congruent) or the
 *  word meaning (incongruent) with probability 0.5. */
export function stroopEmojiTrials(numTrials, rng) {
  const names = Object.keys(COLOURS);
  return Array.from({ length: numTrials }, () => {
    const word = pick(names, rng);
    let ink;
    do { ink = pick(names, rng); } while (ink === word);
    const congruent = rng() < 0.5;
    const emoji = pick(COLOUR_EMOJIS[congruent ? ink : word], rng);
    return { word, ink, emoji, emoji_congruent_with_ink: congruent, correct_response: ink };
  });
}

/** Emotional-word Stroop with images (word printed in one colour); each image once, random order. */
export function stroopEmotionalTrials(numTrials, rng) {
  const items = shuffle(STROOP_EMOTIONAL, rng);
  const out = [];
  while (out.length < numTrials) out.push(...items.slice(0, numTrials - out.length));
  return out.map((it) => ({ image: it.image, word: it.word, ink: it.ink, valence: it.valence, correct_response: it.ink }));
}

/** Flanker as in SYNAPSE: conditions cycle congruent/incongruent/neutral (balanced), random target, shuffled. */
export function flankerTrials(numTrials, variant, rng) {
  const conds = ['congruent', 'incongruent', 'neutral'];
  const digits = [2, 3, 4, 5, 6, 7, 8, 9];
  const list = Array.from({ length: numTrials }, (_, i) => {
    const condition = conds[i % 3];
    if (variant === 'arrow') {
      const t = pick(['<', '>'], rng);
      const f = condition === 'congruent' ? t : condition === 'incongruent' ? (t === '<' ? '>' : '<') : '+';
      return { condition, target: t, flanker: f, stimulus: `${f} ${f} ${t} ${f} ${f}`, correct_response: t === '<' ? 'Left' : 'Right' };
    }
    const t = pick(digits, rng);
    const even = t % 2 === 0;
    const pool = condition === 'congruent' ? digits.filter((d) => (d % 2 === 0) === even && d !== t)
      : condition === 'incongruent' ? digits.filter((d) => (d % 2 === 0) !== even) : ['#'];
    const f = pick(pool, rng);
    return { condition, target: String(t), flanker: String(f), stimulus: `${f} ${f} ${t} ${f} ${f}`, correct_response: even ? 'Even' : 'Odd' };
  });
  return shuffle(list, rng);
}

/** Visual items: all (or only verifiable) items in random order, optionally limited. */
export function visualTrials(variant, items, maxTrials, rng) {
  let pool = variant === 'shape' ? VISUAL_SHAPE : VISUAL_COUNT;
  if (items === 'verifiable') pool = pool.filter((p) => ['nominal', 'duplicate_consistent'].includes(p.key_validity));
  const list = shuffle(pool, rng);
  return (maxTrials ? list.slice(0, maxTrials) : list).map((p) => ({ ...p, correct_response: String(p.key) }));
}
