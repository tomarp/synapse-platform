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

export const SOFTWARE_DOI = '10.5281/zenodo.23768059';          // concept DOI: always resolves to the latest version
export const SOFTWARE_VERSION_DOI = '10.5281/zenodo.23768060';  // DOI of exactly this version (update with each release)
export const CITATION = `Tomar, P. (2026). SYNAPSE experiment platform (Version ${APP_VERSION}) [Computer software]. Zenodo. https://doi.org/${SOFTWARE_DOI}`;

export const BIBTEX = `@software{tomar_2026_synapse_platform,
  author  = {Tomar, Puneet},
  title   = {{SYNAPSE} experiment platform},
  version = {${APP_VERSION}},
  year    = {2026},
  license = {MIT},
  publisher = {Zenodo},
  doi     = {${SOFTWARE_DOI}}
}`;

export const RIS = `TY  - COMP
AU  - Tomar, Puneet
TI  - SYNAPSE experiment platform
ET  - ${APP_VERSION}
PY  - 2026
PB  - Zenodo
DO  - ${SOFTWARE_DOI}
UR  - https://doi.org/${SOFTWARE_DOI}
ER  - `;

const SYNAPSE_AUTHORS = 'Tomar, P., Dave, T., Wargocki, P., & Pisello, A. L.';

// doi: null = not yet assigned (shown as "DOI assigned on publication"). Fill in when published.
export const REFERENCES = [
  {
    kind: 'Dataset', where: 'Zenodo', doi: '10.5281/zenodo.23458777',
    text: `${SYNAPSE_AUTHORS} (2026). SYNAPSE: EEG, wrist physiology, facial thermal imaging, indoor environment and cognitive performance `
      + 'of adults working under warm and cool LED lighting and urban soundscapes (Version 1.0.0) [Data set]. Zenodo.',
    note: 'BIDS 1.10 dataset recorded with this platform (10 adults, 20 sessions).',
  },
  {
    kind: 'Protocol', where: 'protocols.io', doi: '10.17504/protocols.io.m7vznm25rvx1/v1',
    text: `${SYNAPSE_AUTHORS} (2026). Multimodal assessment of cognitive performance, physiology and perceived indoor environment `
      + 'under warm and cool LED lighting and urban soundscapes (SYNAPSE). protocols.io.',
    note: 'Step-by-step procedure of the SYNAPSE sessions, including this platform.',
  },
  {
    kind: 'Software', where: 'Zenodo', doi: SOFTWARE_DOI,
    text: CITATION,
    note: 'Code under the MIT licence.',
  },
];

export const doiUrl = (doi) => `https://doi.org/${doi}`;
