// Stimulus lists of the SYNAPSE tasks. Image answer keys are the targets used when the images were generated
// (they are in the file names). key_validity is the item review made for the SYNAPSE dataset
// (stimuli/visual_items.tsv): only 'nominal' and 'duplicate_consistent' keys are verifiable.

const C = 'media/images/visual_count/';
const S = 'media/images/visual_shape/';
const E = 'media/images/stroop_emotional/';

export const COLOURS = { Red: '#E74C3C', Green: '#2ECC71', Blue: '#3498DB', Yellow: '#F1C40F' };

export const COLOUR_EMOJIS = {
  Red: ['🍓', '❤️', '🍎', '🌶️', '🚗', '🛑'],
  Green: ['🌳', '🍀', '✅', '🥦', '♻️', '🥝'],
  Blue: ['💧', '🟦', '🌊', '🐟', '👖', '🌀'],
  Yellow: ['🌟', '🍋', '💡', '🚕', '🧀', '🍌'],
};

export const NBACK_LETTERS = 'CFGHJKLMNPQRSTVWXYZ'.split('');
export const NBACK_DIGITS = '0123456789'.split('');

export const VISUAL_COUNT = [
  { image: C + 'bicycles_29.png', question: 'Count the number of bicycles in the trees.', key: 29, key_validity: 'ambiguous' },
  { image: C + 'cubes_5.png', question: 'Count the number of cubes in the image.', key: 5, key_validity: 'ill_defined' },
  { image: C + 'bicycles_22.png', question: 'Count the number of bicycles in the image.', key: 22, key_validity: 'ill_defined' },
  { image: C + 'books_22.png', question: 'Count the number of books in the image.', key: 22, key_validity: 'ambiguous' },
  { image: C + 'gates_20.png', question: 'Count the number of gates in the structure.', key: 20, key_validity: 'ambiguous' },
  { image: C + 'pencils_15.png', question: 'Count the number of pencils in the image.', key: 15, key_validity: 'ambiguous' },
  { image: C + 'rectangles_14.png', question: 'Count the number of rectangles in the structure.', key: 14, key_validity: 'ill_defined' },
  { image: C + 'squares_15.png', question: 'Count the number of squares in the image.', key: 15, key_validity: 'ambiguous' },
  { image: C + 'stairs_36.png', question: 'Count the number of stairs in the building.', key: 36, key_validity: 'ambiguous' },
  { image: C + 'stairs_65.png', question: 'Count the number of stairs in the image.', key: 65, key_validity: 'ambiguous' },
  { image: C + 'triangles_30.png', question: 'Count the number of triangles in the image.', key: 30, key_validity: 'ambiguous' },
  { image: C + 'stairs_90.png', question: 'Count the number of stairs in the image.', key: 90, key_validity: 'ill_defined' },
  { image: C + 'triangles_10.png', question: 'Count the number of triangles in the image.', key: 10, key_validity: 'ambiguous' },
];

const SHAPE_VALIDITY = { 'image2_dif.jpeg': 'duplicate_consistent', 'image14_dif.jpeg': 'duplicate_consistent',
  'image3_same.jpeg': 'indeterminate', 'image12_dif.jpeg': 'indeterminate' };

export const VISUAL_SHAPE = Array.from({ length: 14 }, (_, i) => {
  const same = [3, 4, 5, 6, 10, 11, 13].includes(i + 1);
  const file = `image${i + 1}_${same ? 'same' : 'dif'}.jpeg`;
  return { image: S + file, question: 'Are the two shapes the SAME or DIFFERENT?', key: same ? 'SAME' : 'DIFFERENT',
    key_validity: SHAPE_VALIDITY[file] || 'nominal' };
});

const VALENCE = {
  Positive: ['HAPPY', 'FLOWER', 'SMILE', 'BLESSING', 'SUNNY', 'GOODLUCK', 'LAUGH', 'HUGGS', 'JOYFUL', 'RAINBOW'],
  Negative: ['ANGER', 'STORM', 'ALONE', 'PANIC', 'GRIEF', 'SADLY', 'FIGHT', 'HURTS', 'DEATH', 'FEARS'],
  Neutral: ['PAPER', 'HOUSE', 'WINDOW', 'CLOCK', 'KEY', 'CHAIR', 'BOOK', 'STONE', 'CAR', 'GLASS'],
};
const valenceOf = (w) => Object.keys(VALENCE).find((v) => VALENCE[v].includes(w));

export const STROOP_EMOTIONAL = [
  'alone_yellow', 'anger_yellow', 'blessing_red', 'book_yellow', 'car_red', 'chair_green', 'clock_yellow', 'death_yellow',
  'fears_green', 'fight_blue', 'flower_blue', 'glass_green', 'goodluck_red', 'grief_yellow', 'happy_red', 'house_green',
  'huggs_blue', 'hurts_yellow', 'joyful_green', 'key_blue', 'laugh_blue', 'panic_green', 'paper_blue', 'rainbow_yellow',
  'sadly_green', 'smile_blue', 'stone_blue', 'storm_blue', 'sunny_blue', 'window_green',
].map((n) => {
  const [w, c] = n.split('_');
  const word = w.toUpperCase();
  return { image: `${E}${n}.png`, word, ink: c[0].toUpperCase() + c.slice(1), valence: valenceOf(word) };
});

// The original SYNAPSE soundscapes came from YouTube (source not recorded) and cannot be redistributed. These are
// noise signals with the same long-term spectrum, level and interaural level difference (tools/make_spectrum_matched_noise.py).
export const AUDIO = {
  cafeteria_babble: { src: 'media/audio/cafeteria_babble_spectrum_noise.wav', label: 'Cafeteria babble (spectrum-matched noise)' },
  road_traffic: { src: 'media/audio/road_traffic_spectrum_noise.wav', label: 'Road traffic (spectrum-matched noise)' },
};

export const BACKGROUNDS = {
  mind_galaxy: { src: 'media/backgrounds/mind_galaxy.jpg', label: 'Mind galaxy' },
  digital_brain: { src: 'media/backgrounds/digital_brain.jpg', label: 'Digital brain' },
  moon_eye: { src: 'media/backgrounds/moon_eye.jpg', label: 'Moon eye' },
  wired_brain: { src: 'media/backgrounds/wired_brain.jpg', label: 'Wired brain' },
  wired_brain_dim: { src: 'media/backgrounds/wired_brain_dim.jpg', label: 'Wired brain (dim)' },
  lunar_galaxy: { src: 'media/backgrounds/lunar_galaxy.jpg', label: 'Lunar galaxy' },
};

// h = displayed height (px at scale 1) chosen for equal visual weight; every logo sits in the same 200 × 76 frame.
export const LOGOS = [
  { src: 'media/logos/unipg.png', dark: 'media/logos/unipg_dark.png', h: 58, alt: 'University of Perugia', href: 'https://www.unipg.it' },
  { src: 'media/logos/dtu.png', dark: 'media/logos/dtu_dark.png', h: 70, alt: 'Technical University of Denmark', href: 'https://www.dtu.dk' },
  { src: 'media/logos/music.png', dark: 'media/logos/music_dark.png', h: 44, alt: 'MuSIC doctoral network', href: 'https://cordis.europa.eu/project/id/101073357' },
  { src: 'media/logos/eu_msca.png', dark: 'media/logos/eu_msca_dark.png', h: 56, alt: 'Marie Skłodowska-Curie Actions', href: 'https://marie-sklodowska-curie-actions.ec.europa.eu' },
  { src: 'media/logos/eu_funded.png', dark: 'media/logos/eu_funded_dark.png', h: 46, alt: 'Funded by the European Union', href: 'https://commission.europa.eu' },
];

/** Logo row: each logo centred in an identical frame, in its light or dark version (follows the page theme). */
export function logoTiles(h, { scale = 1, links = true } = {}) {
  const dark = document.body.dataset.theme === 'dark';
  return h('div', { class: 'logo-tiles', style: { '--logo-scale': scale } }, ...LOGOS.map((l) => {
    const img = h('img', { src: dark ? l.dark : l.src, alt: l.alt, loading: 'lazy', style: { height: `${Math.round(l.h * scale)}px` } });
    return links ? h('a', { class: 'logo-tile', href: l.href, target: '_blank', rel: 'noopener', title: l.alt }, img) : h('span', { class: 'logo-tile', title: l.alt }, img);
  }));
}

export const FUNDING = 'This project has received funding from the European Union\'s Horizon Europe research and innovation programme ' +
  'under the Marie Skłodowska-Curie grant agreement No 101073357 (MuSIC).';
