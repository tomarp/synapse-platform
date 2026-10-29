// Unit tests of the trial generators, protocol checks and export.  Run:  deno test tests/unit_test.js
import { assert, assertEquals } from 'jsr:@std/assert@1.0.13';
import { toCsv, zip } from '../app/export.js';
import { flankerTrials, nbackTrials, stroopEmojiTrials, stroopEmotionalTrials, stroopWordTrials, visualTrials } from '../app/generators.js';
import { audioFor, themeFor, validate } from '../app/protocol.js';
import { makeRng } from '../app/util.js';

const synapse = JSON.parse(await Deno.readTextFile(new URL('../protocols/synapse_full_session.json', import.meta.url)));

Deno.test('same seed gives the same trial lists', () => {
  assertEquals(nbackTrials(2, 60, 0.3, 'letter', makeRng(1)), nbackTrials(2, 60, 0.3, 'letter', makeRng(1)));
  assertEquals(flankerTrials(60, 'digit', makeRng(9)), flankerTrials(60, 'digit', makeRng(9)));
});

Deno.test('n-back: targets match n back, non-targets never do, target count as in SYNAPSE', () => {
  for (const n of [1, 2, 3]) {
    for (let seed = 0; seed < 50; seed++) {
      const t = nbackTrials(n, 60, 0.3, 'digit', makeRng(seed));
      assertEquals(t.length, 60);
      t.forEach((x, i) => {
        if (i < n) assertEquals(x.is_target, false);
        else assertEquals(x.stimulus === t[i - n].stimulus, x.is_target);
      });
      const k = t.filter((x) => x.is_target).length;
      assert(k <= 18 && k >= 18 - n, `targets ${k}`);
    }
  }
});

Deno.test('Stroop: word trials incongruent when congruent_ratio = 0; emoji rule', () => {
  stroopWordTrials(200, 0, makeRng(3)).forEach((t) => assert(t.word !== t.ink));
  stroopEmojiTrials(200, makeRng(4)).forEach((t) => assert(t.word !== t.ink && t.correct_response === t.ink));
  const e = stroopEmotionalTrials(30, makeRng(5));
  assertEquals(new Set(e.map((x) => x.image)).size, 30);
  e.forEach((x) => assert(['Positive', 'Negative', 'Neutral'].includes(x.valence)));
});

Deno.test('flanker: balanced conditions and correct responses', () => {
  const t = flankerTrials(60, 'arrow', makeRng(2));
  for (const c of ['congruent', 'incongruent', 'neutral']) assertEquals(t.filter((x) => x.condition === c).length, 20);
  t.forEach((x) => assertEquals(x.correct_response, x.target === '<' ? 'Left' : 'Right'));
  flankerTrials(60, 'digit', makeRng(2)).forEach((x) => {
    assertEquals(x.correct_response, Number(x.target) % 2 === 0 ? 'Even' : 'Odd');
    if (x.condition === 'incongruent') assert(Number(x.flanker) % 2 !== Number(x.target) % 2);
  });
});

Deno.test('visual: all items once; verifiable filter', () => {
  assertEquals(visualTrials('count', 'all', 0, makeRng(1)).length, 13);
  assertEquals(visualTrials('shape', 'all', 0, makeRng(1)).length, 14);
  assertEquals(visualTrials('shape', 'verifiable', 0, makeRng(1)).length, 12);
  assertEquals(visualTrials('count', 'verifiable', 0, makeRng(1)).length, 0);
});

Deno.test('SYNAPSE protocol is valid; soundscape order and theme follow the session fields', () => {
  assertEquals(validate(synapse), []);
  const step = synapse.steps.find((s) => s.id === 'nback_letter');
  assertEquals(audioFor(synapse, step, { soundscape_order: 'babble_first' }), 'media/audio/cafeteria_babble_spectrum_noise.wav');
  assertEquals(audioFor(synapse, step, { soundscape_order: 'traffic_first' }), 'media/audio/road_traffic_spectrum_noise.wav');
  assertEquals(themeFor(synapse, { lighting: 'cool' }), 'dark');
  assertEquals(themeFor(synapse, { lighting: 'warm' }), 'light');
});

Deno.test('every media file referenced by the app exists', async () => {
  const { VISUAL_COUNT, VISUAL_SHAPE, STROOP_EMOTIONAL, AUDIO, BACKGROUNDS, LOGOS } = await import('../app/stimuli.js');
  const files = [...VISUAL_COUNT, ...VISUAL_SHAPE, ...STROOP_EMOTIONAL].map((x) => x.image)
    .concat(Object.values(AUDIO).map((a) => a.src), Object.values(BACKGROUNDS).map((b) => b.src), LOGOS.flatMap((l) => [l.src, l.dark].filter(Boolean)));
  for (const f of files) await Deno.stat(new URL(`../${f}`, import.meta.url));
  for (const s of synapse.steps.filter((x) => x.type === 'questionnaire')) await Deno.stat(new URL(`../${s.questionnaire}`, import.meta.url));
});

Deno.test('CSV quoting and ZIP structure', async () => {
  const csv = toCsv([{ a: 'x,y', b: 'say "hi"' }, { a: 1, c: true }], []);
  assertEquals(csv, 'a,b,c\r\n"x,y","say ""hi""",\r\n1,,true\r\n');
  const bytes = new Uint8Array(await zip([['a.txt', 'hello'], ['b.csv', csv]]).arrayBuffer());
  assertEquals([...bytes.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
  assertEquals([...bytes.slice(-22, -18)], [0x50, 0x4b, 0x05, 0x06]);
});

Deno.test('templates are valid protocols', async () => {
  const { TEMPLATES } = await import('../app/templates.js');
  for (const t of TEMPLATES) assertEquals(validate(t.make()), [], t.key);
});

Deno.test('random-order groups permute only their own steps, reproducibly', async () => {
  const { applyShuffleGroups } = await import('../app/protocol.js');
  const steps = ['a', 'x1', 'x2', 'x3', 'b', 'y1', 'y2'].map((id) => ({ id, shuffle_group: id.startsWith('x') ? 'x' : id.startsWith('y') ? 'y' : '' }));
  const orders = new Set();
  for (let seed = 0; seed < 40; seed++) {
    const out = applyShuffleGroups(steps, makeRng(seed)).map((s) => s.id);
    assertEquals([out[0], out[4]], ['a', 'b']);
    assertEquals(out.slice(1, 4).sort(), ['x1', 'x2', 'x3']);
    assertEquals(out.slice(5).sort(), ['y1', 'y2']);
    assertEquals(out, applyShuffleGroups(steps, makeRng(seed)).map((s) => s.id));
    orders.add(out.slice(1, 4).join());
  }
  assertEquals(orders.size, 6);                     // all 3! orders occur
});

Deno.test('duration estimate of the SYNAPSE session is plausible (30-60 min)', async () => {
  const { estimateSeconds } = await import('../app/protocol.js');
  const total = synapse.steps.reduce((n, s) => n + estimateSeconds(s, 20), 0) / 60;
  assert(total > 30 && total < 60, `${total} min`);
});
