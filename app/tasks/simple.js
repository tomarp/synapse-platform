// Baseline (rest with fixation cross for a fixed time) and message (text with an optional button).
import { logoTiles } from '../stimuli.js';
import { clear, h, wait, waitForChoice } from '../util.js';

export async function baseline(ctx) {
  const s = ctx.step;
  clear(ctx.stage).append(h('div', { class: 'card center' }, h('h2', {}, s.title), h('h4', { class: 'pre' }, s.text || ''),
    h('div', { class: 'fixation big' }, '+')));
  await wait(s.duration_s * 1000, ctx.signal);
}

export async function message(ctx) {
  const s = ctx.step;
  const btn = s.button ? h('button', { class: 'btn primary', 'data-value': 'ok' }, s.button) : null;
  const logos = s.show_logos ? logoTiles(h, { scale: 0.64, links: false }) : null;
  clear(ctx.stage).append(h('div', { class: 'card center glass' }, h('h1', {}, s.title || ''), h('p', { class: 'instruction pre' }, s.text || ''), btn, logos));
  if (btn) { btn.focus(); await waitForChoice([btn], { Enter: 'ok' }, ctx.signal); }
}
