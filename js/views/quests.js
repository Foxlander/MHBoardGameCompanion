import { MONSTERS } from '../data.js';
import { State } from '../state.js';

export function renderQuests(container, sessionId) {
  const quests = State.getQuests(sessionId);

  container.innerHTML = MONSTERS.map(m => {
    const q = quests[m.id] || { assigned: false, investigation: 0, tempered: 0 };
    return `
      <div class="quest-row" data-mid="${m.id}">
        <div class="quest-monster">
          <img class="quest-monster-icon" src="assets/monsters/${m.icon}" alt="">
          <span class="quest-monster-name">${esc(m.name)}</span>
        </div>
        <div class="quest-cells">
          <div class="quest-cell">
            <div class="quest-cell-label">Assigned</div>
            <button class="quest-assigned ${q.assigned ? 'done' : ''}" data-mid="${m.id}" data-action="assigned">
              ${q.assigned ? '✓' : '○'}
            </button>
          </div>
          <div class="quest-cell">
            <div class="quest-cell-label">Investigation</div>
            <div class="quest-pips">
              <button class="quest-pip ${q.investigation >= 1 ? 'done' : ''}" data-mid="${m.id}" data-action="inv" data-pip="1"></button>
              <button class="quest-pip ${q.investigation >= 2 ? 'done' : ''}" data-mid="${m.id}" data-action="inv" data-pip="2"></button>
            </div>
          </div>
          <div class="quest-cell">
            <div class="quest-cell-label">Tempered</div>
            <div class="quest-counter">
              <button class="quest-counter-btn" data-mid="${m.id}" data-action="tempered-dec">−</button>
              <span class="quest-counter-val ${q.tempered > 0 ? 'nonzero' : ''}">${q.tempered}</span>
              <button class="quest-counter-btn" data-mid="${m.id}" data-action="tempered-inc">+</button>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');

  container.querySelectorAll('[data-action="assigned"]').forEach(btn => {
    btn.addEventListener('click', () => {
      State.toggleAssigned(sessionId, btn.dataset.mid);
      refreshRow(container, sessionId, btn.dataset.mid);
    });
  });

  container.querySelectorAll('[data-action="inv"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const mid = btn.dataset.mid;
      const pip = parseInt(btn.dataset.pip);
      const q = State.getQuests(sessionId)[mid] || {};
      const cur = q.investigation || 0;
      // Click filled pip → remove it; click empty pip → fill up to it
      State.setInvestigation(sessionId, mid, cur >= pip ? pip - 1 : pip);
      refreshRow(container, sessionId, mid);
    });
  });

  container.querySelectorAll('[data-action="tempered-inc"]').forEach(btn => {
    btn.addEventListener('click', () => {
      State.adjustTempered(sessionId, btn.dataset.mid, 1);
      refreshRow(container, sessionId, btn.dataset.mid);
    });
  });

  container.querySelectorAll('[data-action="tempered-dec"]').forEach(btn => {
    btn.addEventListener('click', () => {
      State.adjustTempered(sessionId, btn.dataset.mid, -1);
      refreshRow(container, sessionId, btn.dataset.mid);
    });
  });
}

function refreshRow(container, sessionId, monsterId) {
  const m = MONSTERS.find(x => x.id === monsterId);
  if (!m) return;
  const q = State.getQuests(sessionId)[m.id] || { assigned: false, investigation: 0, tempered: 0 };
  const row = container.querySelector(`.quest-row[data-mid="${monsterId}"]`);
  if (!row) return;

  row.querySelector('.quest-assigned').className = `quest-assigned ${q.assigned ? 'done' : ''}`;
  row.querySelector('.quest-assigned').textContent = q.assigned ? '✓' : '○';

  row.querySelectorAll('.quest-pip').forEach(pip => {
    const n = parseInt(pip.dataset.pip);
    pip.classList.toggle('done', q.investigation >= n);
  });

  const val = row.querySelector('.quest-counter-val');
  val.textContent = q.tempered;
  val.className = `quest-counter-val ${q.tempered > 0 ? 'nonzero' : ''}`;
}

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
