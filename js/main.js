// Entry point: navigazione a tab e avvio dell'app

import { App } from './router.js';
import * as workout from './views/workout.js';
import * as templates from './views/templates.js';
import * as historyView from './views/history.js';
import * as stats from './views/stats.js';
import * as settings from './views/settings.js';

const VIEWS = { workout, templates, history: historyView, stats, settings };

const ICONS = {
  workout: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M1 10h2v4H1zM4 8h2v8H4zM18 8h2v8h-2zM21 10h2v4h-2zM7 11h10v2H7z"/></svg>',
  templates: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h2v2H4zM8 5h12v2H8zM4 11h2v2H4zM8 11h12v2H8zM4 17h2v2H4zM8 17h12v2H8z"/></svg>',
  history: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm-2 8h14v10H5V10z"/></svg>',
  stats: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 20V10h3v10H4zm6.5 0V4h3v16h-3zM17 20v-7h3v7h-3z"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>'
};

const TABS = [
  { id: 'workout', label: 'Allenamento' },
  { id: 'templates', label: 'Schede' },
  { id: 'history', label: 'Storico' },
  { id: 'stats', label: 'Statistiche' },
  { id: 'settings', label: 'Altro' }
];

let current = 'workout';

App.renderView = () => {
  VIEWS[current].render(document.getElementById('view'));
};

App.navigate = (id) => {
  current = id;
  renderTabs();
  App.renderView();
  window.scrollTo(0, 0);
};

function renderTabs() {
  document.getElementById('tabbar').innerHTML = TABS.map(t => `
    <button class="tab${t.id === current ? ' on' : ''}" data-tab="${t.id}">${ICONS[t.id]}<span>${t.label}</span></button>`).join('');
  document.querySelectorAll('[data-tab]').forEach(b =>
    b.addEventListener('click', () => App.navigate(b.dataset.tab)));
}

renderTabs();
App.renderView();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
