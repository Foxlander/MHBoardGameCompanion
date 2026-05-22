import { State } from './state.js';
import { renderHome } from './views/home.js';
import { renderChest } from './views/chest.js';
import { renderForge } from './views/forge.js';
import { renderEquipment } from './views/equipment.js';
import { renderQuests } from './views/quests.js';

const app = document.getElementById('app');

let currentSessionId = null;
let currentHunterIndex = 0;
let currentSubTab = 'chest';
let showingQuests = false;

function goHome() {
  currentSessionId = null;
  currentHunterIndex = 0;
  currentSubTab = 'chest';
  renderHome(app, (sessionId) => {
    currentSessionId = sessionId;
    renderSession();
  });
}

function renderSession() {
  const session = State.getSession(currentSessionId);
  if (!session) { goHome(); return; }

  const hunter = session.hunters[currentHunterIndex];
  if (!hunter) { currentHunterIndex = 0; }

  const hunterTabsHtml = session.hunters.map((h, i) => `
    <button class="hunter-tab ${!showingQuests && i === currentHunterIndex ? 'active' : ''}" data-hi="${i}">
      <span class="hunter-tab-name">${esc(h.name)}</span>
      <span class="hunter-tab-reset" data-hi="${i}" title="Remettre à zéro">↺</span>
    </button>
  `).join('');

  const subTabsHtml = showingQuests ? '' : `
    <nav class="sub-tabs">
      <button class="sub-tab ${currentSubTab === 'chest'     ? 'active' : ''}" data-sub="chest">
        <span class="sub-tab-icon">📦</span> Coffre
      </button>
      <button class="sub-tab ${currentSubTab === 'forge'     ? 'active' : ''}" data-sub="forge">
        <span class="sub-tab-icon">🔨</span> Forge
      </button>
      <button class="sub-tab ${currentSubTab === 'equipment' ? 'active' : ''}" data-sub="equipment">
        <span class="sub-tab-icon">⚔️</span> Équipement
      </button>
    </nav>`;

  app.innerHTML = `
    <header class="app-header">
      <button class="btn-icon" id="btn-back" title="Retour">←</button>
      <span class="app-title">${esc(session.name)}</span>
    </header>
    <nav class="hunter-tabs">
      ${hunterTabsHtml}
      <button class="hunter-tab quest-tab ${showingQuests ? 'active' : ''}" id="btn-quests">
        <span class="hunter-tab-name">Quêtes</span>
      </button>
    </nav>
    ${subTabsHtml}
    <div class="main-content" id="tab-content"></div>
  `;

  app.querySelector('#btn-back').addEventListener('click', goHome);

  app.querySelector('#btn-quests').addEventListener('click', () => {
    showingQuests = true;
    renderSession();
  });

  app.querySelectorAll('.hunter-tab:not(.quest-tab)').forEach(tab => {
    tab.addEventListener('click', (e) => {
      if (e.target.closest('.hunter-tab-reset')) return;
      showingQuests = false;
      currentHunterIndex = parseInt(tab.dataset.hi);
      renderSession();
    });
  });

  app.querySelectorAll('.hunter-tab-reset').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const hi = parseInt(btn.dataset.hi);
      const h = session.hunters[hi];
      if (!confirm(`Remettre ${h.name} à zéro ?\nCoffre et équipement seront effacés.`)) return;
      State.resetHunter(currentSessionId, h.id);
      if (currentHunterIndex === hi) renderSubTab();
    });
  });

  app.querySelectorAll('.sub-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      currentSubTab = tab.dataset.sub;
      renderSubTab();
      app.querySelectorAll('.sub-tab').forEach(t => t.classList.toggle('active', t.dataset.sub === currentSubTab));
    });
  });

  renderSubTab();
}

function renderSubTab() {
  const content = app.querySelector('#tab-content');
  if (!content) return;

  if (showingQuests) {
    renderQuests(content, currentSessionId);
    return;
  }

  const session = State.getSession(currentSessionId);
  const hunterId = session?.hunters[currentHunterIndex]?.id;
  if (!hunterId) return;

  if (currentSubTab === 'chest') {
    renderChest(content, currentSessionId, hunterId);
  } else if (currentSubTab === 'forge') {
    renderForge(content, currentSessionId, hunterId);
  } else if (currentSubTab === 'equipment') {
    renderEquipment(content, currentSessionId, hunterId);
  }
}

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Password gate ──────────────────────────────────────
const PASSWORD = 'mhw2024';

function renderPasswordGate() {
  app.innerHTML = `
    <div class="password-gate">
      <div class="password-card">
        <div class="password-title">MHW Companion</div>
        <div class="password-subtitle">Entrez le mot de passe</div>
        <input id="pwd-input" class="password-input" type="password" placeholder="Mot de passe" autocomplete="off">
        <button id="pwd-btn" class="password-btn">Entrer</button>
        <div id="pwd-error" class="password-error"></div>
      </div>
    </div>`;

  const input = app.querySelector('#pwd-input');
  const btn   = app.querySelector('#pwd-btn');
  const error = app.querySelector('#pwd-error');

  input.focus();

  function attempt() {
    if (input.value === PASSWORD) {
      sessionStorage.setItem('mhw-auth', '1');
      goHome();
    } else {
      error.textContent = 'Mot de passe incorrect';
      input.value = '';
      input.focus();
    }
  }

  btn.addEventListener('click', attempt);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') attempt(); });
}

if (sessionStorage.getItem('mhw-auth') === '1') {
  goHome();
} else {
  renderPasswordGate();
}
