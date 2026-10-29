# SYNAPSE experiment platform

*SYNAPSE: SYnergistic Neurophysiological Assessment of Perception in Sensory Environments.*

A browser application for running cognitive-task sessions: n-back, Stroop, flanker, visual counting and shape comparison,
questionnaires, rest baselines and background soundscapes, in an order and with settings you choose.
It needs no installation and no server, and it sends no data anywhere. Responses stay in the browser until you
download them as CSV/JSON.

The built-in protocol **SYNAPSE full session** reproduces one session of the SYNAPSE study (Technical University of
Denmark, June 2025) with its tasks, trial numbers, timings and questionnaires. The SYNAPSE dataset was recorded with
it (see *Relation to the SYNAPSE study*).

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.23768059.svg)](https://doi.org/10.5281/zenodo.23768059)

**Live:** https://synapse.ptomar.com · **DOI:** [10.5281/zenodo.23768059](https://doi.org/10.5281/zenodo.23768059) (all versions; v2.2.0: [10.5281/zenodo.23768060](https://doi.org/10.5281/zenodo.23768060)) · publishing steps: `PUBLISHING.md`

## Quick start

1. Serve this folder with any static web server and open it in a browser (Chrome, Edge, Firefox or Safari):
   ```bash
   python3 -m http.server 8000        # then open http://localhost:8000
   ```
   It also works from GitHub Pages or any web host: upload the folder as it is.
   Opening `index.html` directly from disk does not work, because browsers block the module scripts.
2. **Try the demo**: runs the full SYNAPSE session. *Skip step* (top right) moves on; ✕ leaves the session.
3. **Start a session**: enter a participant ID and session ID, choose the protocol and the session fields (e.g. lighting
   condition, soundscape order), and start.
4. **Data**: download each session as a ZIP after it ends.

## Pages

| Page | What it does |
|---|---|
| Home | What the platform does; the nine tasks with live previews and a one-minute *Try it* (score shown, nothing saved); the SYNAPSE study with an interactive session timeline; partners and funding |
| Try the demo | The full SYNAPSE session with a *Skip step* button; its data are marked `demo` |
| Start a session | Participant ID, session ID, protocol, session fields, optional full screen |
| Designer | Build or edit a protocol from a template; preview steps; test-run; save in the browser; export/import as a file |
| Guide | Your own experiment in six steps |
| Data | List of sessions; download one or all as ZIP; delete |
| About | Version, privacy, timing, citation |

During a session the top bar shows the step number and title, a progress bar of all steps and the countdown of the
step's time limit.

| Mode | Controls |
|---|---|
| Demo, test run, preview | ◂ Back · Skip ▸ · ☰ Steps (jump to any step, or click the progress bar) · Exit |
| Real session | a discreet ⋯ researcher menu: skip, back, jump to a step, leave (each asks for confirmation) |
| Keyboard (all modes) | Alt+→ next step · Alt+← previous step · Alt+M menu · Esc twice leaves a demo |

Skipped, repeated and jumped steps are logged in `events.csv` (`step_end` with the reason, `step_restart`).
A session that is left, or interrupted by closing the browser, can be resumed from its current step on the home page.

## Building your own experiment (Designer)

A **protocol** is an ordered list of steps plus a few settings. Start from a template (Blank, Quick cognitive battery,
Single task, Before/after, SYNAPSE full session), a saved protocol or an imported file. The overview shows the estimated
duration; ▶ Preview runs one step and ▶ Test run the whole session without keeping data. Unsaved work is kept as a
draft in the browser.

Every task can have **practice trials** (stored with `phase = practice`), **✓/✗ feedback** (practice only or all trials),
its own **instruction text** (e.g. in another language; `{n}` stands for the n-back level) and a **random-order group**:
steps with the same group name swap places at random in each session (the order is stored as `step_order`).

| Step type | Settings |
|---|---|
| Message | Title, text, button label (no button = final page) |
| Questionnaire | One of the SYNAPSE questionnaires, or your own questions: rating scale (1–k with end labels), single/multiple choice, dropdown, text, number; sections; export/import |
| Baseline | Duration, text; shows a fixation cross |
| N-back | Letters or digits; levels (1–5); trials per level; target proportion; fixation and pause durations |
| Stroop | Colour words (with a congruent proportion), colour words with emoji, or emotional words (images); trials; timings |
| Flanker | Arrows (left/right) or digits (even/odd); trials (conditions balanced); timings |
| Visual | Counting (type a number) or shape comparison (same/different); all images or only those with a verifiable answer key |

Every step except Message can have a **time limit**. When it runs out, a *Continue* button appears and the task keeps
running until it is pressed, as in SYNAPSE. Alternatively the step can end immediately. Steps can play a
**soundscape** in a loop: either a fixed one, or a *slot* that depends on a session field. For example, `round1`
plays cafeteria babble when `soundscape_order = babble_first` and road traffic otherwise.

**Session fields** are asked at the start of each session and saved with every data row; use them for conditions
and counterbalancing. The colour theme can follow a session field (in SYNAPSE: cool lighting → dark theme).

Responses can be given with the mouse or with the keyboard: n-back J/F, Stroop R/G/B/Y, arrow flanker ←/→,
digit flanker E/O, shapes S/D, counting Enter.

**Sharing a protocol:** *Export file* saves it as JSON. Another lab opens the app, chooses *Import file*, and runs
exactly the same experiment. Every session also stores a copy of its protocol.

### Protocol file (`synapse-protocol/1`)

```json
{
  "format": "synapse-protocol/1", "id": "my_study", "name": "My study", "description": "…",
  "settings": { "timer_visible": true, "on_timeout": "show_continue", "keyboard": true, "play_audio": true,
                "audio_volume": 0.8, "theme": "light", "theme_field": "", "theme_map": {} },
  "session_fields": [ { "id": "order", "label": "Soundscape order", "options": ["babble_first", "traffic_first"] } ],
  "audio_slots": { "round1": { "by": "order", "map": { "babble_first": "cafeteria_babble", "traffic_first": "road_traffic" } } },
  "steps": [
    { "id": "nb", "type": "nback", "title": "N-Back", "variant": "letter", "levels": [1, 2], "trials_per_level": 30,
      "target_ratio": 0.3, "fixation_ms": 500, "iti_ms": 750, "time_limit_s": 300, "audio": "round1" }
  ]
}
```

`protocols/synapse_full_session.json` is a complete example. Parameter names and defaults are defined in
`app/protocol.js` (`STEP_TYPES`).

### Questionnaire file

```json
{ "id": "T1_ieq", "title": "…", "description": "…",
  "sections": [ { "title": "THERMAL", "description": "",
    "items": [ { "id": "thermal_sensation", "text": "What is your thermal sensation?", "type": "dropdown",
                 "options": ["1: Cold", "2: Cool", "3: Neutral", "4: Warm", "5: Hot"], "required": true } ] } ] }
```

Item types: `single_choice`, `dropdown`, `checkboxes`, `scale` (`points`, `labels: [left, right]`), `text`, `number`. To reuse an existing Google Form, convert it
with `tools/google_form_to_questionnaire.py` (instructions inside the script).

## Data

Each session downloads as one ZIP named `<participant>_<session>_<date>.zip` with four files:

| File | One row per | Main columns |
|---|---|---|
| `…_trials.csv` | response | `participant_id, session_id, step_id, attempt, task, variant, block, trial`, stimulus columns (e.g. `stimulus, level, is_target, word, ink, emoji, condition, target, flanker, image, key_validity`), `correct_response, response, response_key, correct, rt_ms, soundscape, time, elapsed_ms`, `field_<session field>` |
| `…_questionnaires.csv` | answer | `step_id, questionnaire_id, item_id, question, answer, code` (option number 1…k), `completion_ms, time` |
| `…_events.csv` | event | step start/end (with reason: completed, continue, timeout, skip, exit), time limit reached, soundscape, n-back levels |
| `…_session.json` | session | everything above, plus the protocol, the random seed, browser, screen and time zone |

- `rt_ms` runs from the first painted frame of the stimulus, measured with `performance.now()`.
- `time` is local time with UTC offset.
- `attempt` counts restarts of a step after a resumed session.
- The random seed reproduces every trial list of the session.

## Relation to the SYNAPSE study

Version 1 (2025) was a set of HTML pages that sent each response to Google Forms; the SYNAPSE dataset was recorded
with it. Version 2 (this app) re-implements the same tasks with the same stimuli, instructions, trial generation rules
and timings (fixation 500/750 ms; pause after response 750, 1000, 1000 and 500 ms for n-back, Stroop, flanker and
visual tasks). The differences are listed in `CHANGELOG.md`. In the study:

- The soundscapes were played from a separate device over headphones, not by the platform. The app can play them itself.
- Trial numbers were later shortened per workstation (dataset decision D18). The built-in protocol uses the main
  configuration: n-back 60 trials per level, Stroop 60, flanker 60, all visual images, 5-min time limits.

## Media

| Folder | Content | Origin |
|---|---|---|
| `media/images/visual_count/` | 13 counting images; the answer key is in the file name | AI-generated with OpenAI GPT-4o (ChatGPT); C2PA content credentials in each file |
| `media/images/visual_shape/` | 14 shape-comparison images | AI-generated with Microsoft Designer Image Creator, 18 June 2025 (C2PA content credentials) |
| `media/images/stroop_emotional/` | 30 emotional-word images + `generation_prompts.txt` | AI-generated with OpenAI GPT-4o (C2PA content credentials) |
| `media/audio/cafeteria_babble_spectrum_noise.wav`, `road_traffic_spectrum_noise.wav` | substitutes for the two SYNAPSE soundscapes | made with `tools/make_spectrum_matched_noise.py`: stationary noise with the long-term spectrum, A-weighted level and interaural level difference of each original (all 1/3-octave bands 50 Hz–16 kHz within 4 dB) |
| `media/backgrounds/` | page backgrounds (6) | AI-generated with OpenAI GPT-4o (C2PA content credentials in the originals); resized for the web |
| `media/logos/` | University of Perugia, DTU, MuSIC, Marie Skłodowska-Curie Actions, *Funded by the European Union* | trademarks of their owners, shown as acknowledgement; not covered by the MIT licence |

**Soundscapes.** The recordings used in the study (cafeteria babble, road traffic) were taken from YouTube and their
source was not recorded, so they cannot be redistributed. The app ships the noise substitutes above; they reproduce
the spectrum and level but not the content (speech, events) of the originals. To use real recordings, upload your
own files in the Designer (*Soundscapes → Upload an audio file*). The originals are described in the SYNAPSE
dataset (`stimuli/soundscapes.json`: checksum, duration, level distribution, 1/3-octave spectra).

Two background images of the 2025 version were replaced: `img1.png` carried a third-party watermark and
`baseline.jpeg` had no origin record.

Answer-key quality: the SYNAPSE item review found that the counting images have no unambiguous count, and two shape
images are identical files with opposite keys (`image3_same` = `image12_dif`). The app stores `key_validity` with each
response and can restrict a visual step to the images with a verifiable key.

## Tests

```bash
deno test --allow-read tests/unit_test.js                              # trial generators, protocol checks, export
pip install playwright && python -m playwright install chromium
python tests/e2e_test.py                                               # full sessions in a real browser
```

## Project layout

```
index.html                 entry page
app/                       application code (ES modules, no build step, no dependencies)
  main.js                  routing; pages: start, demo, try-out/preview, data, guide, about
  info.js                  version, author, citation
  templates.js             designer templates
  nav.js                   navigation bar
  home.js                  home page (task previews, study timeline, partners)
  audio_store.js           researchers' own soundscape files (browser storage)
  designer.js              experiment designer
  runner.js                runs a session: steps, time limits, soundscapes, logging, autosave
  protocol.js              step types and their parameters, protocol checks
  generators.js            trial lists (seeded, reproducible)
  stimuli.js               stimulus lists and answer keys
  export.js                CSV/JSON/ZIP export
  storage.js               browser storage
  tasks/                   one module per step type
styles/app.css             layout, light and dark theme
protocols/                 built-in protocols
questionnaires/            built-in questionnaires (SYNAPSE T0, T1, T2/T3)
media/                     images and soundscapes
tools/                     Google Form → questionnaire converter; spectrum-matched noise generator
tests/                     unit and browser tests
```

## Related outputs

- **Dataset** — Tomar, P., Dave, T., Wargocki, P., & Pisello, A. L. (2026). *SYNAPSE: EEG, wrist physiology, facial thermal
  imaging, indoor environment and cognitive performance of adults working under warm and cool LED lighting and urban
  soundscapes* (Version 1.0.0) [Data set]. Zenodo. https://doi.org/10.5281/zenodo.23458777
- **Software** (this platform) — Tomar, P. (2026). *SYNAPSE experiment platform* (Version 2.2.0) [Computer software].
  Zenodo. https://doi.org/10.5281/zenodo.23768059
- **Protocol** — Tomar, P., Dave, T., Wargocki, P., & Pisello, A. L. (2026). *Multimodal assessment of cognitive performance,
  physiology and perceived indoor environment under warm and cool LED lighting and urban soundscapes (SYNAPSE)*.
  protocols.io. https://doi.org/10.17504/protocols.io.m7vznm25rvx1/v1

The DOIs are kept in `app/info.js` (`REFERENCES`).

## Author

Puneet Tomar — Environmental Applied Physics Lab at CIRIAF, Department of Engineering, University of Perugia, and
Department of Environmental and Resource Engineering, Technical University of Denmark.
[ORCID 0000-0002-5168-5471](https://orcid.org/0000-0002-5168-5471) · [E-mail](mailto:puneet.tomar@unipg.it) · [LinkedIn](https://www.linkedin.com/in/tomarp/)

## Licence and citation

Code: MIT (`LICENSE`). The images are AI-generated; the providers named above claim no ownership of the outputs.
Logos: see *Media*. Please cite the software (`CITATION.cff`) and the SYNAPSE dataset.
