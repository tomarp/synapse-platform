// Start page: what the platform does, the tasks (live previews, one-minute try-outs), the SYNAPSE study,
// how it works, privacy, funders and citation.
import { doiUrl, OUTPUTS, PROJECT_FULL } from './info.js';
import { footer, nav } from './nav.js';
import { socialLinks } from './social.js';
import { COLOURS, logoTiles, STROOP_EMOTIONAL, VISUAL_COUNT, VISUAL_SHAPE } from './stimuli.js';
import { clear, h } from './util.js';

export const TASKS = [
  { key: 'nback_letter', name: 'N-back (letters)', measures: 'Working memory', text: 'Is this letter the same as the one n steps back? Levels 1, 2 and 3.', preview: 'nback' },
  { key: 'nback_digit', name: 'N-back (digits)', measures: 'Working memory', text: 'The same task with digits, used in the second round.', preview: 'nback_digit' },
  { key: 'stroop_word', name: 'Colour-word Stroop', measures: 'Inhibition', text: 'Name the ink colour of a colour word that names another colour.', preview: 'stroop' },
  { key: 'stroop_emoji', name: 'Emoji Stroop', measures: 'Inhibition with distraction', text: 'Name the ink colour; an emoji matches either the ink or the word.', preview: 'emoji' },
  { key: 'stroop_emotional', name: 'Emotional-word Stroop', measures: 'Emotional interference', text: 'Name the colour of positive, negative and neutral words.', preview: 'emotional' },
  { key: 'flanker_arrow', name: 'Arrow flanker', measures: 'Selective attention', text: 'Which way does the middle arrow point? Ignore its neighbours.', preview: 'flanker' },
  { key: 'flanker_digit', name: 'Digit flanker', measures: 'Selective attention', text: 'Is the middle number even or odd? Ignore its neighbours.', preview: 'flanker_digit' },
  { key: 'visual_count', name: 'Visual counting', measures: 'Visual search', text: 'Count the objects in a complex image and type the number.', preview: 'count' },
  { key: 'visual_shape', name: 'Shape comparison', measures: 'Mental rotation', text: 'Are the two structures the same or different?', preview: 'shape' },
];

const SESSION = [
  { id: 'T0', label: 'T0', min: 5, kind: 'q', title: 'Pre-session questionnaire', text: 'Health screening, mental/physical/emotional energy, caffeine, meals, sleep, clothing, and a first rating of the indoor environment (35 items).' },
  { id: 'BL', label: 'Baseline', min: 5, kind: 'rest', title: 'Eyes-open baseline', text: '5 minutes of rest looking at a fixation cross: the reference period for EEG, heart rate and skin temperature.' },
  { id: 'T1', label: 'T1', min: 3, kind: 'q', title: 'Indoor environment now', text: 'Thermal, air-quality, visual and acoustic sensation, satisfaction and preference (12 items).' },
  { id: 'R1', label: 'Round 1', min: 15, kind: 'task', title: 'Task round 1 + first soundscape', text: 'Letter n-back, colour-word Stroop, visual counting and arrow flanker, each with a 5-minute limit, with cafeteria babble or road traffic over headphones.' },
  { id: 'T2', label: 'T2', min: 3, kind: 'q', title: 'Tasks, feelings, environment', text: 'Task difficulty, focus, engagement, cognitive load, valence, arousal and the indoor-environment items (20 items).' },
  { id: 'R2', label: 'Round 2', min: 15, kind: 'task', title: 'Task round 2 + second soundscape', text: 'Digit n-back, emoji Stroop, shape comparison and digit flanker with the other soundscape.' },
  { id: 'T3', label: 'T3', min: 3, kind: 'q', title: 'Tasks, feelings, environment', text: 'The T2 questionnaire again, after the second round.' },
];

// ---- live previews ------------------------------------------------------------------------------------------
const timers = new Set();
function loop(ms, fn) { fn(); const t = setInterval(fn, ms); timers.add(t); }
export function stopPreviews() { timers.forEach(clearInterval); timers.clear(); }

function preview(kind) {
  const box = h('div', { class: 'preview' });
  const names = Object.keys(COLOURS);
  let i = 0;
  const pickc = (k) => names[(i + k) % names.length];
  if (kind === 'nback' || kind === 'nback_digit') {
    const seq = kind === 'nback' ? 'KMKRTRWQW' : '373858292';
    loop(900, () => { clear(box).append(h('span', { class: 'pv-big pop' }, seq[i++ % seq.length])); });
  } else if (kind === 'stroop') {
    loop(1100, () => { i++; clear(box).append(h('span', { class: 'pv-big pop', style: { color: COLOURS[pickc(1)] } }, pickc(0).toUpperCase())); });
  } else if (kind === 'emoji') {
    const em = ['🍓', '🌳', '💧', '🍋'];
    loop(1100, () => { i++; clear(box).append(h('span', { class: 'pv-mid pop' }, h('span', { style: { color: COLOURS[pickc(2)] } }, pickc(0)), ` ${em[i % 4]}`)); });
  } else if (kind === 'emotional') {
    loop(1400, () => { const it = STROOP_EMOTIONAL[i++ % STROOP_EMOTIONAL.length]; clear(box).append(h('img', { src: it.image, alt: '', class: 'pv-img pop' })); });
  } else if (kind === 'flanker' || kind === 'flanker_digit') {
    const arr = kind === 'flanker' ? ['< < > < <', '> > > > >', '+ + < + +', '> > < > >'] : ['3 3 8 3 3', '4 4 6 4 4', '# # 7 # #', '2 2 5 2 2'];
    loop(1000, () => { clear(box).append(h('span', { class: 'pv-mid mono pop' }, arr[i++ % arr.length])); });
  } else if (kind === 'count') {
    box.append(h('img', { src: VISUAL_COUNT[3].image, alt: '', class: 'pv-photo' }));
  } else if (kind === 'shape') {
    box.append(h('img', { src: VISUAL_SHAPE[5].image, alt: '', class: 'pv-photo' }));
  }
  return box;
}

// ---- page ---------------------------------------------------------------------------------------------------
export function renderHome(root, { author, paused }) {
  stopPreviews();
  const detail = h('div', { class: 'tl-detail' });
  const showSeg = (s, btn) => {
    clear(detail).append(h('h3', {}, `${s.title} · ${s.min} min`), h('p', {}, s.text));
    btn.parentElement.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === btn));
  };
  const total = SESSION.reduce((n, s) => n + s.min, 0);
  const timeline = h('div', { class: 'timeline' }, ...SESSION.map((s) => {
    const b = h('button', { class: `tl-seg ${s.kind}`, style: { flexGrow: s.min }, title: s.title }, h('span', {}, s.label), h('small', {}, `${s.min}′`));
    b.addEventListener('click', () => showSeg(s, b));
    b.addEventListener('mouseenter', () => showSeg(s, b));
    return b;
  }));
  const page = h('div', { class: 'home' },
    nav({ overlay: true }),
    h('header', { class: 'hero', style: { backgroundImage: 'url("media/backgrounds/mind_galaxy.jpg")' } },
      h('div', { class: 'hero-inner' },
        h('div', { class: 'hero-text reveal' },
          h('p', { class: 'eyebrow' }, h('span', { class: 'pulse' }), 'Open research software · SYNAPSE project'),
          h('p', { class: 'acronym' }, ...acronym(PROJECT_FULL)),
          h('h1', {}, 'Cognitive experiments in the browser, ', h('span', { class: 'grad-text' }, 'from design to data.')),
          h('p', { class: 'lead' }, 'Assemble a session from established task paradigms and questionnaires, run it on any laptop, and export ',
            'analysis-ready data. No installation, no server, and no participant data leaving your computer.'),
          h('div', { class: 'row hero-cta' },
            h('a', { class: 'btn primary big', href: '#/demo' }, '▶ Explore the demo'),
            h('a', { class: 'btn big glass-btn', href: '#/designer' }, '✎ Design an experiment'),
            h('a', { class: 'hero-link', href: '#/start' }, 'or start a session →')),
          h('ul', { class: 'trust' }, ...[['◆', '9 task paradigms'], ['⇄', 'Shareable protocol files'], ['⟲', 'Reproducible, seeded trial lists'], ['⌘', 'Open source · MIT']]
            .map(([i, x]) => h('li', {}, h('span', {}, i), x)))),
        h('div', { class: 'mock reveal', 'aria-hidden': 'true' },
          h('div', { class: 'mock-bar' }, h('i'), h('i'), h('i'), h('span', {}, 'SYNAPSE · Step 6 of 15 · Colour task')),
          h('div', { class: 'mock-progress' }, ...Array.from({ length: 15 }, (_, k) => h('i', { class: k < 5 ? 'done' : k === 5 ? 'now' : '' }))),
          h('div', { class: 'mock-body' }, preview('stroop'),
            h('div', { class: 'mock-buttons' }, ...['RED', 'GREEN', 'BLUE', 'YELLOW'].map((c) => h('span', {}, c)))),
          h('div', { class: 'mock-foot' }, h('span', {}, '⏱ 4:12'), h('span', {}, 'Trial 23 / 60'), h('span', {}, '● recording locally'))))),
    h('section', { class: 'partner-strip' },
      h('p', {}, 'Developed at the University of Perugia and the Technical University of Denmark within the MuSIC doctoral network'),
      logoTiles(h)),
    paused.length ? h('section', { class: 'band' }, h('div', { class: 'card warnbox' }, h('h3', {}, 'Unfinished sessions'),
      ...paused.map((s) => h('div', { class: 'row space' },
        h('span', {}, `${s.participant_id} · ${s.session_id} · ${s.protocol.name} · step ${s.current_step + 1} of ${s.protocol.steps.length}`),
        h('a', { class: 'btn small', href: `#/resume/${s.id}` }, 'Resume'))))) : null,
    h('section', { class: 'band', id: 'tasks' },
      h('h2', { class: 'reveal' }, 'The tasks'),
      h('p', { class: 'muted reveal' }, 'Each task can be tried on its own in about a minute. You get your accuracy and response times at the end; nothing is saved.'),
      h('div', { class: 'task-grid' }, ...TASKS.map((t) => h('article', { class: 'task-card reveal' },
        preview(t.preview),
        h('div', { class: 'task-body' }, h('span', { class: 'tag' }, t.measures), h('h3', {}, t.name), h('p', {}, t.text),
          h('a', { class: 'btn small primary', href: `#/try/${t.key}` }, 'Try it · 1 min')))))),
    h('section', { class: 'band alt', id: 'study' },
      h('div', { class: 'two-col' },
        h('div', { class: 'reveal' },
          h('h2', {}, 'The SYNAPSE study'),
          h('p', { class: 'muted small' }, PROJECT_FULL),
          h('p', {}, 'How do the colour of light and the sound of a room affect how we think and feel? In June 2025, ten adults each completed ',
            'two sessions in a simulated office at the Technical University of Denmark: one under warm (2014 K) and one under cool (6250 K) LED ',
            'light, each with two urban soundscapes, cafeteria babble and road traffic.'),
          h('p', {}, 'While they worked on this platform, EEG (Muse S), heart activity, movement and skin temperature at the wrist (ActiGraph LEAP), ',
            'facial temperature (FLIR thermal camera) and the indoor climate (ATMOCUBE) were recorded. The data are published as an open dataset.'),
          h('div', { class: 'facts' },
            ...[['10', 'participants'], ['20', 'sessions'], ['8,172', 'task responses'], ['15.6 h', 'EEG']].map(([n, l]) => h('div', {}, h('strong', {}, n), h('span', {}, l))))),
        h('div', { class: 'reveal' },
          h('h3', {}, `One session · up to ${total} minutes (median 40 in the study)`),
          h('p', { class: 'small muted' }, 'Point at or tap a block.'),
          timeline, detail,
          h('a', { class: 'btn primary', href: '#/demo' }, '▶ Run this session as a demo')))),
    h('section', { class: 'band', id: 'how' },
      h('h2', { class: 'reveal' }, 'How it works'),
      h('div', { class: 'steps3' },
        ...[['1', 'Design', 'Start from a template, then choose tasks, order, trial numbers, practice and feedback, questionnaires (or your own questions), conditions and soundscapes. Preview any step. Share the protocol as a file.', '#/designer', 'Open the designer'],
          ['2', 'Run', 'Enter the participant and session, go full screen, and hand over. Responses by keyboard or mouse; interrupted sessions can be resumed.', '#/start', 'Start a session'],
          ['3', 'Download', 'A quick summary per task, one ZIP per session, or all sessions combined in analysis-ready CSV tables (trials, answers, events).', '#/data', 'Go to data']]
          .map(([n, t, x, href, cta]) => h('div', { class: 'card step-card reveal' }, h('span', { class: 'step-n' }, n), h('h3', {}, t), h('p', {}, x),
            h('a', { href, class: 'link' }, `${cta} →`)))),
      h('div', { class: 'two-col small-gap' },
        h('div', { class: 'card reveal' }, h('h3', {}, '🔒 Privacy'), h('p', {}, 'Everything runs in the browser. No data leave the computer until you download them. ',
          'Use participant codes, not names.')),
        h('div', { class: 'card reveal' }, h('h3', {}, '⏱ Timing'), h('p', {}, 'Response times run from the first painted frame of the stimulus (performance.now()). ',
          'Use a wired keyboard and a fixed screen for the best precision.')))),
    citeSection(author),
    footer());
  clear(root).append(page);
  showSeg(SESSION[3], timeline.children[3]);
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('shown'); io.unobserve(e.target); } }), { threshold: 0.12 });
  page.querySelectorAll('.reveal').forEach((el) => io.observe(el));
  page.querySelectorAll('a[href^="#"]:not([href^="#/"])').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelector(a.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth' });
  }));
}

// ---- author, citation, related outputs ---------------------------------------------------------------------
export function authorCard(author) {
  return h('div', { class: 'card author-card' },
    h('div', { class: 'card-label' }, 'Author'),
    h('div', { class: 'author' },
      h('div', { class: 'avatar' }, author.name.split(' ').map((w) => w[0]).join('')),
      h('div', {},
        h('h3', {}, author.name),
        h('ul', { class: 'plain small' }, ...author.affiliations.map((a) => h('li', {}, a))),
        socialLinks(author))));
}

const COPY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 3h9a2 2 0 0 1 2 2v11h-2V5H8V3Zm-3 4h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Zm0 2v11h9V9H5Z"/></svg>';
const CHECK_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6L20.1 8.4 18.7 7z"/></svg>';

/** Citation box (same for software, dataset, protocol): DOI badge, APA / BibTeX / RIS, copy button inside the frame. */
export function citationCard(o, label = `Cite the ${o.kind.toLowerCase()}`) {
  const text = h('pre', { class: 'cite-text' }, o.cite.apa);
  const copy = h('button', { class: 'copy-btn', title: 'Copy citation', 'aria-label': `Copy ${o.kind.toLowerCase()} citation` });
  copy.innerHTML = COPY_ICON;
  const tip = h('span', { class: 'copy-tip' }, 'Copied');
  copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(text.textContent); } catch {
      const r = document.createRange(); r.selectNodeContents(text); getSelection().removeAllRanges(); getSelection().addRange(r); document.execCommand('copy');
    }
    copy.innerHTML = CHECK_ICON; copy.classList.add('done'); tip.classList.add('show');
    setTimeout(() => { copy.innerHTML = COPY_ICON; copy.classList.remove('done'); tip.classList.remove('show'); }, 1600);
  });
  const tabs = h('div', { class: 'tabs', role: 'tablist' }, ...[['apa', 'APA'], ['bibtex', 'BibTeX'], ['ris', 'RIS']].map(([k, name]) =>
    h('button', { class: `tab ${k === 'apa' ? 'on' : ''}`, role: 'tab', onclick: (e) => {
      text.textContent = o.cite[k];
      tabs.querySelectorAll('.tab').forEach((x) => x.classList.toggle('on', x === e.currentTarget));
    } }, name)));
  const badge = h('a', { class: 'doi-badge', href: doiUrl(o.doi), target: '_blank', rel: 'noopener', title: `Open on ${o.where}` },
    h('span', {}, 'DOI'), h('span', {}, o.doi));
  return h('div', { class: `card cite-card kind-${o.kind.toLowerCase()}` },
    h('div', { class: 'row space' }, h('div', { class: 'card-label' }, label), badge),
    h('div', { class: 'row space cite-tools' }, tabs, h('span', { class: 'muted small' }, o.where)),
    h('div', { class: 'cite-frame' }, text, copy, tip),
    h('p', { class: 'muted small cite-foot' }, o.note));
}

export const citeCard = () => citationCard(OUTPUTS[0], 'Cite this software');
export const referenceList = () => h('div', { class: 'cite-grid' }, ...OUTPUTS.slice(1).map((o) => citationCard(o)));

function citeSection(author) {
  return h('section', { class: 'band alt', id: 'cite' },
    h('div', { class: 'section-head reveal' }, h('p', { class: 'kicker' }, 'Credits'), h('h2', {}, 'Author, citation and related outputs'),
      h('p', { class: 'muted' }, 'The platform, the SYNAPSE dataset and the experimental protocol are published openly and can be cited separately.')),
    h('div', { class: 'cite-grid reveal' }, authorCard(author), citeCard()),
    h('h3', { class: 'reveal' }, 'Related research outputs'),
    h('div', { class: 'reveal' }, referenceList()));
}

/** "SYnergistic Neurophysiological …" with the letters of the acronym highlighted. */
function acronym(full) {
  const caps = ['SY', 'N', 'A', 'P', 'S', 'E'];
  const words = full.split(' ');
  let k = 0;
  return words.flatMap((w, i) => {
    const sp = i ? ' ' : '';
    if (['of', 'in', 'and'].includes(w) || k >= caps.length) return [sp + w];
    const n = caps[k++].length;
    return [sp, h('b', {}, w.slice(0, n).toUpperCase()), w.slice(n)];
  });
}
