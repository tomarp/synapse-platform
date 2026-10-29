// Light/dark theme of the researcher pages (sessions set their own theme from the protocol).
import { getPref, setPref } from './storage.js';

export const uiTheme = () => getPref('ui_theme', matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
export const applyUiTheme = () => { document.body.dataset.theme = uiTheme(); };
export function toggleTheme() {
  setPref('ui_theme', uiTheme() === 'dark' ? 'light' : 'dark');
  applyUiTheme();
  window.dispatchEvent(new HashChangeEvent('hashchange'));       // redraw the current page
}
