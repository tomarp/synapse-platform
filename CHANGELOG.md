# Changelog

## 2.2.0 — 2026-10-29

- **Navigation during sessions**: step counter and title, segmented progress bar, and controls by mode —
  demo / test run / preview: ◂ Back, Skip ▸, ☰ Steps (jump to any step; also by clicking the progress bar), Exit;
  real sessions: a discreet ⋯ researcher menu (skip, back, jump, leave), each with a confirmation.
  Shortcuts: Alt+→ next step, Alt+← previous step, Alt+M menu, Esc twice to leave a demo.
- **Site navigation**: one navigation bar on every page (Home, Demo, Designer, Data, Guide) with the current page
  highlighted, light/dark switch and a *Start session* button; menu button on small screens.
- **Home page**: new introduction with a live preview of a running session, clearer wording, partner strip.
- **Partner and funder logos**: trimmed, each centred in an identical frame with optically balanced height, and shown in a
  light or dark version that follows the theme (official white UniPG version; white DTU; white text for the MSCA and EU emblems).
- **Credits section** on the home and About pages: author card (affiliations, ORCID, e-mail), citation in text and BibTeX
  with copy button, and references to the SYNAPSE dataset (Zenodo DOI) and protocol (protocols.io, doi:10.17504/protocols.io.m7vznm25rvx1/v1); also in the footer,
  README and CITATION.cff.
- **Footer**: platform, resources, research and contact columns, EU funding statement, licence and citation.
- **Project name**: SYNAPSE = *SYnergistic Neurophysiological Assessment of Perception in Sensory Environments* (defined in 2026; the 2025 welcome page showed
  "Steady-state Neurological Reaction and Perception"). Shown on the home, About and welcome pages and in the footer.
- **Logo**: the word SYNAPSE as a gradient wordmark, with the tagline “experiment platform” underneath spanning its width
  (browser-tab icon: `media/logos/synapse_icon.svg`).
- **Public README** with wordmark, badges and screenshots; technical documentation moved to `docs/documentation.md`.
- **Headline** "Design, run and share cognitive experiments, privately and locally"; author card in the footer (with Telegram); citation frames of equal height that scroll inside.
- **Fixes**: a Skip/Back pressed while a step was still loading (e.g. a questionnaire file) could be lost; the abort
  signal is now created first and every step ends reliably.

## 2.1.0 — 2026-10-29

Focus: setting up new experiments.

- **Designer** (was "Experiment settings"): templates (Blank, Quick cognitive battery, Single task, Before/after, SYNAPSE);
  overview with estimated duration; step library with descriptions; drag-and-drop ordering; ▶ Preview of a single step
  and ▶ Test run of the whole session (nothing is kept); common options first, the rest under "More options";
  floating save bar with unsaved-changes status; automatic draft, so a closed tab loses nothing.
- **New task options**: practice trials (stored with `phase = practice`), ✓/✗ feedback (practice only or all trials),
  own instruction text (any language; `{n}` = n-back level), random-order groups for counterbalancing the step order
  (order stored in `session.json` → `step_order`).
- **Questionnaires**: rating-scale items (1–k with end labels), sections, reordering, duplicate, export/import.
- **Start page**: protocol summary with steps and duration, next participant ID, automatic next session ID, duplicate
  warning, sound check, checklist.
- **Data page**: per-task summary (trials, % correct, median RT), *Download all* as combined analysis-ready CSV tables,
  demo sessions hidden by default.
- **Guide** page (own experiment in six steps), **About** page with author details (affiliations, ORCID, contact),
  author and citation on the home page.

## 2.0.0 — 2026-10-29

Re-implementation as a reusable single-page web application.

- **New**: experiment settings page (steps, order, trial numbers, timings, questionnaires, soundscapes, session fields),
  protocol files for sharing, demo mode, data page with CSV/JSON/ZIP export, resume after interruption, keyboard
  responses, built-in questionnaires instead of embedded Google Forms, Google Form converter, unit and browser tests.
- **Home page** with live task previews, one-minute try-outs with a score summary, an interactive timeline of the
  SYNAPSE session, partners and funding; light/dark switch.
- **Looks as in 1.0**: welcome page with the institution and funder logos, page backgrounds per step (two replaced,
  see README), circular countdown timer.
- **Soundscapes**: spectrum-matched noise substitutes (the original recordings cannot be redistributed); researchers can
  upload their own audio files.
- **Data** are kept in the browser and exported locally; nothing is sent to Google Forms or any other server.
- **Same as 1.0**: stimuli, instructions, trial-generation rules (n-back target placement, all-incongruent colour-word
  Stroop, emoji congruency rule, balanced flanker conditions), fixation and inter-trial durations, time limits with a
  Continue button.
- **Differences from 1.0** (relevant when comparing with the SYNAPSE data):
  - shuffling uses an unbiased Fisher–Yates shuffle with a recorded seed (1.0 sorted with a random comparator);
  - response times are measured from the painted stimulus frame (1.0: from the DOM update);
  - the counting task rejects non-numeric input instead of recording "NA";
  - the soundscapes can be played by the app (in SYNAPSE they came from a separate device);
  - two page backgrounds were replaced (unclear origin) and the welcome text asks participants to wait for the researcher.

## 1.0 — June 2025

HTML pages used for data collection in the SYNAPSE study; responses sent to Google Forms. Last archived commit
`db1b0ba` (2025-06-24).
