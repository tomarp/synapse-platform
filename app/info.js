// Version, author and references (shown on the home, About and footer; keep in line with CITATION.cff).

export const APP_VERSION = '2.2.0';

// Project name and its expansion (defined 2026-10-29; the original expansion was not recorded).
export const PROJECT = 'SYNAPSE';
export const PROJECT_FULL = 'Synergistic Neurophysiological Assessment of Perception in Sensory Environments';

export const AUTHOR = {
  name: 'Puneet Tomar',
  affiliations: [
    'Environmental Applied Physics Lab at CIRIAF, Department of Engineering, University of Perugia, Italy',
    'Department of Environmental and Resource Engineering, Technical University of Denmark',
  ],
  orcid: '0000-0002-5168-5471',
  email: 'puneet.tomar@unipg.it',
  linkedin: 'https://www.linkedin.com/in/tomarp/',
};

export const SOFTWARE_DOI = '10.5281/zenodo.23768059';          // Zenodo DOI; always resolves to the latest version
export const doiUrl = (doi) => `https://doi.org/${doi}`;

const TEAM = { apa: 'Tomar, P., Dave, T., Wargocki, P., & Pisello, A. L.',
  bib: 'Tomar, Puneet and Dave, Tanmay and Wargocki, Pawel and Pisello, Anna Laura',
  ris: ['Tomar, Puneet', 'Dave, Tanmay', 'Wargocki, Pawel', 'Pisello, Anna Laura'] };
const DATASET_TITLE = 'SYNAPSE: EEG, wrist physiology, facial thermal imaging, indoor environment and cognitive performance of adults '
  + 'working under warm and cool LED lighting and urban soundscapes';
const PROTOCOL_TITLE = 'Multimodal assessment of cognitive performance, physiology and perceived indoor environment under warm and cool '
  + 'LED lighting and urban soundscapes (SYNAPSE)';

function formats({ key, type, risType, authors, title, publisher, doi, apaType }) {
  const au = authors === 'team' ? TEAM : { apa: 'Tomar, P.', bib: 'Tomar, Puneet', ris: ['Tomar, Puneet'] };
  return {
    apa: `${au.apa} (2026). ${title}${apaType ? ` [${apaType}]` : ''}. ${publisher}. ${doiUrl(doi)}`,
    bibtex: `@${type}{${key},\n  author    = {${au.bib}},\n  title     = {${title.replace('SYNAPSE', '{SYNAPSE}')}},\n  year      = {2026},\n`
      + `  publisher = {${publisher}},\n  doi       = {${doi}}\n}`,
    ris: [`TY  - ${risType}`, ...au.ris.map((a) => `AU  - ${a}`), `TI  - ${title}`, 'PY  - 2026', `PB  - ${publisher}`, `DO  - ${doi}`,
      `UR  - ${doiUrl(doi)}`, 'ER  - '].join('\n'),
  };
}

// The three citable outputs of the project, shown with the same citation box on the site.
export const OUTPUTS = [
  { kind: 'Software', where: 'Zenodo', doi: SOFTWARE_DOI, note: 'This platform. Code under the MIT licence.',
    cite: formats({ key: 'tomar_2026_synapse_platform', type: 'software', risType: 'COMP', authors: 'one', title: 'SYNAPSE experiment platform',
      publisher: 'Zenodo', doi: SOFTWARE_DOI, apaType: 'Computer software' }) },
  { kind: 'Dataset', where: 'Zenodo', doi: '10.5281/zenodo.23458777', note: 'BIDS dataset recorded with this platform (10 adults, 20 sessions).',
    cite: formats({ key: 'tomar_2026_synapse_dataset', type: 'dataset', risType: 'DATA', authors: 'team', title: DATASET_TITLE,
      publisher: 'Zenodo', doi: '10.5281/zenodo.23458777', apaType: 'Data set' }) },
  { kind: 'Protocol', where: 'protocols.io', doi: '10.17504/protocols.io.m7vznm25rvx1/v1', note: 'Step-by-step procedure of the SYNAPSE sessions, including this platform.',
    cite: formats({ key: 'tomar_2026_synapse_protocol', type: 'misc', risType: 'ELEC', authors: 'team', title: PROTOCOL_TITLE,
      publisher: 'protocols.io', doi: '10.17504/protocols.io.m7vznm25rvx1/v1', apaType: '' }) },
];
export const REFERENCES = OUTPUTS;
export const CITATION = OUTPUTS[0].cite.apa;
