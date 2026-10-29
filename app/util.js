// Shared helpers: seeded randomness, DOM building, timing, time stamps, file download.

/** Seeded pseudo-random generator (mulberry32). Same seed -> same trial lists. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const newSeed = () => Math.floor(Math.random() * 2 ** 31);

/** Unbiased Fisher-Yates shuffle (returns a new array). */
export function shuffle(list, rng) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const pick = (list, rng) => list[Math.floor(rng() * list.length)];

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Resolves just after the next frame is painted (used to time stimulus onsets). */
export const afterPaint = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(performance.now()))));

/** Local time as ISO 8601 with UTC offset, e.g. 2025-06-24T15:42:32.123+02:00 */
export function isoLocal(date = new Date()) {
  const p = (n, w = 2) => String(Math.abs(n)).padStart(w, '0');
  const off = -date.getTimezoneOffset();
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}:` +
    `${p(date.getSeconds())}.${p(date.getMilliseconds(), 3)}${off >= 0 ? '+' : '-'}${p(Math.floor(Math.abs(off) / 60))}:${p(Math.abs(off) % 60)}`;
}

export function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Tiny DOM builder: h('button', {class: 'btn', onclick: f}, 'Text') */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

export function download(name, content, type = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const a = h('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

export const deepCopy = (x) => JSON.parse(JSON.stringify(x));

/** Thrown inside a task when the step is ended from outside (time limit, skip). */
export class StepAborted extends Error {}

/** sleep() that stops early with StepAborted when the signal fires. */
export function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new StepAborted());
    const t = setTimeout(() => { signal?.removeEventListener('abort', onAbort); resolve(); }, ms);
    const onAbort = () => { clearTimeout(t); reject(new StepAborted()); };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/** Waits for one click on any of the given elements, or one of the given keys. Returns {value, key}. */
export function waitForChoice(buttons, keyMap = {}, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new StepAborted());
    const cleanup = () => {
      buttons.forEach((b) => b.removeEventListener('click', onClick));
      window.removeEventListener('keydown', onKey);
      signal?.removeEventListener('abort', onAbort);
    };
    const done = (value, key) => { cleanup(); resolve({ value, key }); };
    const onClick = (e) => { if (!e.currentTarget.disabled) done(e.currentTarget.dataset.value, null); };
    const onKey = (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k in keyMap && !e.repeat) { e.preventDefault(); done(keyMap[k], k); }
    };
    const onAbort = () => { cleanup(); reject(new StepAborted()); };
    buttons.forEach((b) => b.addEventListener('click', onClick));
    window.addEventListener('keydown', onKey);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
