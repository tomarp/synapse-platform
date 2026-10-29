// Starting points for new experiments (shown in the designer). Each returns a complete, valid protocol.
import { DEFAULT_SETTINGS, newStep } from './protocol.js';
import { deepCopy } from './util.js';

const msg = (id, title, text, button = 'Continue') => ({ ...newStep('message'), id, title, text, button });
const end = () => msg('end', 'Thank you!', 'You have completed the session. Please tell the researcher that you have finished.', '');
const task = (type, id, extra) => ({ ...newStep(type), id, ...extra });
const base = (id, name, description, steps, extra = {}) => ({
  format: 'synapse-protocol/1', id, name, description, settings: deepCopy(DEFAULT_SETTINGS), session_fields: [], audio_slots: {}, steps, ...extra,
});

const WORKLOAD = {
  id: 'workload_mood', title: 'Workload and mood', description: 'Please rate how you feel right now.',
  sections: [{ title: '', description: '', items: [
    { id: 'mental_effort', text: 'How much mental effort did the tasks require?', type: 'scale', points: 7, labels: ['Very little', 'Very much'], required: true },
    { id: 'tiredness', text: 'How tired do you feel?', type: 'scale', points: 7, labels: ['Not at all', 'Extremely'], required: true },
    { id: 'mood', text: 'How pleasant is your mood?', type: 'scale', points: 7, labels: ['Very unpleasant', 'Very pleasant'], required: true },
    { id: 'comments', text: 'Comments (optional)', type: 'text', required: false },
  ] }],
};

export const TEMPLATES = [
  {
    key: 'blank', icon: '＋', name: 'Blank', about: 'A welcome page and a thank-you page. Add your own steps.',
    make: () => base('my_experiment', 'My experiment', '', [msg('welcome', 'Welcome', 'Thank you for taking part in this study.'), end()]),
  },
  {
    key: 'battery', icon: '⚡', name: 'Quick cognitive battery', about: 'N-back, Stroop and flanker with practice and feedback, then a short rating. About 15 minutes.',
    make: () => base('quick_battery', 'Quick cognitive battery', 'Three short tasks with practice trials, followed by ratings of effort, tiredness and mood.', [
      msg('welcome', 'Welcome', 'You will do three short tasks. Each starts with a few practice trials with feedback.\n\nRespond as quickly and accurately as you can.'),
      task('nback', 'nback', { title: 'Memory task', variant: 'letter', levels: [1, 2], trials_per_level: 30, practice_trials: 6, feedback: 'practice', time_limit_s: 0 }),
      task('stroop', 'stroop', { title: 'Colour task', variant: 'word', trials: 40, congruent_ratio: 0.5, practice_trials: 6, feedback: 'practice', time_limit_s: 0 }),
      task('flanker', 'flanker', { title: 'Arrow task', variant: 'arrow', trials: 48, practice_trials: 6, feedback: 'practice', time_limit_s: 0 }),
      { ...newStep('questionnaire'), id: 'ratings', title: 'Workload and mood', questionnaire: deepCopy(WORKLOAD), time_limit_s: 0 },
      end(),
    ]),
  },
  {
    key: 'single', icon: '◉', name: 'Single task', about: 'One task with practice, e.g. for piloting or a teaching demonstration.',
    make: () => base('single_task', 'Single task', 'One Stroop block with practice trials.', [
      task('stroop', 'stroop', { title: 'Colour task', variant: 'word', trials: 60, congruent_ratio: 0.5, practice_trials: 8, feedback: 'practice', time_limit_s: 0 }),
      end(),
    ]),
  },
  {
    key: 'prepost', icon: '⇄', name: 'Before / after', about: 'Ratings and tasks before and after an intervention, task order randomised, with a condition field.',
    make: () => base('before_after', 'Before / after', 'Tasks and ratings before and after an intervention (e.g. a change of lighting, sound or air). The order of the three tasks is randomised in each block.', [
      msg('welcome', 'Welcome', 'This session has two blocks of tasks with a break in between.'),
      task('nback', 'nback_pre', { title: 'Memory task', variant: 'letter', levels: [2], trials_per_level: 40, practice_trials: 6, feedback: 'practice', shuffle_group: 'pre', time_limit_s: 0 }),
      task('stroop', 'stroop_pre', { title: 'Colour task', variant: 'word', trials: 40, congruent_ratio: 0.5, practice_trials: 6, feedback: 'practice', shuffle_group: 'pre', time_limit_s: 0 }),
      task('flanker', 'flanker_pre', { title: 'Arrow task', variant: 'arrow', trials: 48, practice_trials: 6, feedback: 'practice', shuffle_group: 'pre', time_limit_s: 0 }),
      { ...newStep('questionnaire'), id: 'ratings_pre', title: 'How do you feel?', questionnaire: deepCopy(WORKLOAD), time_limit_s: 0 },
      msg('break', 'Break', 'Please wait. The researcher will now change the conditions.\n\nPress Continue only when you are told to.'),
      task('nback', 'nback_post', { title: 'Memory task', variant: 'letter', levels: [2], trials_per_level: 40, shuffle_group: 'post', time_limit_s: 0 }),
      task('stroop', 'stroop_post', { title: 'Colour task', variant: 'word', trials: 40, congruent_ratio: 0.5, shuffle_group: 'post', time_limit_s: 0 }),
      task('flanker', 'flanker_post', { title: 'Arrow task', variant: 'arrow', trials: 48, shuffle_group: 'post', time_limit_s: 0 }),
      { ...newStep('questionnaire'), id: 'ratings_post', title: 'How do you feel?', questionnaire: deepCopy(WORKLOAD), time_limit_s: 0 },
      end(),
    ], { session_fields: [{ id: 'condition', label: 'Condition', options: ['control', 'intervention'] }] }),
  },
];
