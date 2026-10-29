// Contact icons (ORCID, e-mail, LinkedIn, Telegram) for the author card and the footer.
import { h } from './util.js';

const SVG = {
  email: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1 2.4V17h16V7.4l-7.4 5.2a1 1 0 0 1-1.2 0L4 7.4ZM5.6 7 12 11.5 18.4 7H5.6Z"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"/></svg>',
  telegram: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.94 4.3 18.9 18.63c-.23 1.01-.83 1.26-1.68.79l-4.64-3.42-2.24 2.15c-.25.25-.46.46-.94.46l.33-4.73 8.6-7.77c.37-.33-.08-.52-.58-.19L7.12 12.6 2.54 11.17c-1-.31-1.01-1 .21-1.48L20.6 2.8c.83-.3 1.55.2 1.34 1.5Z"/></svg>',
  orcid: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#A6CE39"/><path fill="#fff" d="M8.2 17.6H6.7V7.4h1.5v10.2Zm-.75-11.6a.98.98 0 1 1 0-1.96.98.98 0 0 1 0 1.96ZM10.3 7.4h4c3.8 0 5.5 2.7 5.5 5.1 0 2.6-2.1 5.1-5.5 5.1h-4V7.4Zm1.5 8.8h2.4c3.4 0 4.1-2.6 4.1-3.7 0-1.9-1.2-3.7-4.2-3.7h-2.3v7.4Z"/></svg>',
};

/** Row of round icon links: ORCID, e-mail, LinkedIn, Telegram. */
export function socialLinks(author, { size = 'md' } = {}) {
  const link = (kind, href, label) => {
    const a = h('a', { class: `social ${kind}`, href, title: label, 'aria-label': label, ...(kind === 'email' ? {} : { target: '_blank', rel: 'noopener' }) });
    a.innerHTML = SVG[kind];
    return a;
  };
  return h('div', { class: `socials ${size}` },
    link('orcid', `https://orcid.org/${author.orcid}`, `ORCID ${author.orcid}`),
    link('email', `mailto:${author.email}?subject=SYNAPSE%20experiment%20platform`, `E-mail ${author.name}`),
    link('linkedin', author.linkedin, `${author.name} on LinkedIn`),
    link('telegram', author.telegram, `${author.name} on Telegram (@tomap)`));
}
