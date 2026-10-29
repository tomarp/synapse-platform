// Navigation bar (all researcher pages) and site footer.
import { APP_VERSION, AUTHOR, CITATION, doiUrl, PROJECT_FULL, REFERENCES } from './info.js';
import { socialLinks } from './social.js';
import { FUNDING } from './stimuli.js';
import { toggleTheme, uiTheme } from './theme.js';
import { h } from './util.js';

const LINKS = [
  ['#/', 'Home', '⌂'], ['#/demo', 'Demo', '▶'], ['#/designer', 'Designer', '✎'], ['#/data', 'Data', '⬇'], ['#/guide', 'Guide', '?'],
];

function active(href) {
  const cur = location.hash.replace(/^#\/?/, '#/').split('/').slice(0, 2).join('/') || '#/';
  return href === '#/' ? cur === '#/' || cur === '#' || cur === '' : cur === href;
}

window.addEventListener('scroll', () => {
  document.querySelector('.topnav.overlay')?.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

/** Logo: the word SYNAPSE as a wordmark, with the tagline underneath, spanning the same width. */
export function brand() {
  return h('a', { class: 'brand', href: '#/', 'aria-label': 'SYNAPSE experiment platform, home' },
    h('span', { class: 'brand-text' }, h('span', { class: 'brand-word' }, 'SYNAPSE'), h('span', { class: 'brand-tag' }, 'experiment platform')));
}

export function nav({ overlay = false } = {}) {
  const menu = h('div', { class: 'nav-links' },
    ...LINKS.map(([href, label, icon]) => h('a', { href, class: `nav-link ${active(href) ? 'active' : ''}` }, h('span', { class: 'nav-ic' }, icon), label)));
  const burger = h('button', { class: 'icon-btn burger', title: 'Menu', 'aria-label': 'Menu', onclick: () => menu.classList.toggle('open') }, '☰');
  return h('nav', { class: `topnav ${overlay ? 'overlay' : ''}` },
    brand(),
    menu,
    h('div', { class: 'nav-actions' },
      h('button', { class: 'icon-btn', title: 'Light / dark theme', 'aria-label': 'Switch theme', onclick: toggleTheme }, uiTheme() === 'dark' ? '☀' : '☾'),
      h('a', { class: 'btn primary nav-cta', href: '#/start' }, '● Start session'),
      burger));
}

export function footer() {
  const col = (title, ...links) => h('div', { class: 'f-col' }, h('h4', {}, title), h('ul', {}, ...links.map((l) => h('li', {}, l))));
  const a = (href, text, ext = false) => h('a', ext ? { href, target: '_blank', rel: 'noopener' } : { href }, text);
  return h('footer', { class: 'site-footer' },
    h('div', { class: 'f-grid' },
      h('div', { class: 'f-brand' },
        brand(),
        h('p', { class: 'f-full' }, PROJECT_FULL),
        h('p', {}, 'Open research software for cognitive experiments in the browser: validated tasks, questionnaires and soundscapes, shareable protocols, data that stay on your computer.'),
        h('div', { class: 'f-badges' }, h('span', {}, `v${APP_VERSION}`), h('span', {}, 'MIT licence'), h('span', {}, 'No data upload · no tracking'))),
      col('Platform', a('#/start', 'Start a session'), a('#/demo', 'Try the demo'), a('#/designer', 'Experiment designer'), a('#/data', 'Data and export'), a('#/guide', 'Guide')),
      col('Resources', a('https://github.com/tomarp/synapse-platform/blob/main/docs/documentation.md', 'Documentation', true), a('https://github.com/tomarp/synapse-platform', 'Source code (GitHub)', true), a('protocols/synapse_full_session.json', 'Example protocol file', true), a('CHANGELOG.md', 'Changelog', true),
        a('CITATION.cff', 'Citation file', true), a('#/about', 'Privacy and media credits')),
      col('Research', a('#/cite', 'Cite the platform'),
        ...REFERENCES.map((r) => (r.doi ? a(doiUrl(r.doi), `SYNAPSE ${r.kind.toLowerCase()} (${r.where})`, true)
          : h('span', { class: 'muted' }, `SYNAPSE ${r.kind.toLowerCase()} (${r.where}, forthcoming)`))),
        a('https://cordis.europa.eu/project/id/101073357', 'MuSIC doctoral network', true)),
      h('div', { class: 'f-col f-author' }, h('h4', {}, 'Author'),
        h('div', { class: 'f-author-card' },
          h('div', { class: 'avatar sm' }, AUTHOR.name.split(' ').map((w) => w[0]).join('')),
          h('div', {}, h('strong', {}, AUTHOR.name),
            h('span', { class: 'muted' }, 'CIRIAF, University of Perugia'), h('span', { class: 'muted' }, 'Technical University of Denmark'))),
        socialLinks(AUTHOR, { size: 'sm' }))),
    h('div', { class: 'f-funding' }, h('img', { src: 'media/logos/eu_funded_dark.png', alt: 'Funded by the European Union' }), h('p', {}, FUNDING)),
    h('div', { class: 'f-bottom' },
      h('span', {}, `© 2026 ${AUTHOR.name}. Code under the MIT licence; logos belong to their owners.`),
      h('span', { class: 'f-cite' }, `Cite: ${CITATION}`)));
}
